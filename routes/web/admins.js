//routes/web/admins.js
const express = require('express');
const passport = require('passport');
const router = express.Router();

//Bring in the Admin Model
const Admin =  require('../../app/models/Admin.model');
const AdminWallet =  require('../../app/models/AdminWallet.model');
const GenFundsHistory =  require('../../app/models/GenFundsHistory.model');

//Bring in the User Model
const User = require('../../app/models/User.model');
const UserWallet = require('../../app/models/UserWallet.model');

const bcrypt = require('bcryptjs')

const adminCreateAccounts = require('../../app/controllers/adminControllers/adminCreateAccount.controller')

/*
|=======================================================================================
|ADMIN LOGIN
|=======================================================================================
*/
//Show the login form
router.get('/login', redirectIfAuth, (req, res) => {
    // console.log(`res.locals.errorMsg ${res.locals.errorMsg}`)
    res.render('admins/login', {
        layout: 'reg-log-layout',
        title: 'Admin'
    });
});

//process the login request
router.post('/login', (req, res, next) => {
    passport.authenticate('local',{
        successRedirect: 'dashboard/',
        failureRedirect: 'login',
        failureFlash: true
    })(req, res, next);
});


//process the logout get request
router.get('/logout', (req, res) => {
    // console.log(req.user);
    req.logout();
    req.flash('infoMsg', 'You are now logged out');
    res.redirect('login');
})

//Show the signup form
router.get('/signup', redirectIfAuth, (req, res) => {
    res.locals.message = req.flash('message');
    console.log(`res.locals.message ${res.locals.message}`)
    res.render('admins/signup', {
        layout: 'reg-log-layout',
        title: 'Admin',
        // message: req.flash(message) 
    });
});

// process the signup form
router.post('/signup', (req, res) => {

    console.log(req.body.firstname, req.body.lastname, req.body.mobile, req.body.email, req.body.password);

    req.checkBody('firstname', 'Firstname is required').notEmpty();
    req.checkBody('lastname', 'Lastname is required').notEmpty();
    req.checkBody('mobile', 'Mobile is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('password_confirmation', 'Passwords do not match').equals(req.body.password);

    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const mobile = req.body.mobile;
    const email = req.body.email.toLowerCase();
    const password = req.body.password;
    // const password_confirmation = req.body.password_confirmation;

    let errors = req.validationErrors();

    if(errors){
        console.log(`Validation Errors: ${JSON.stringify(errors)}`);
        req.flash('error', errors);
        res.redirect('signup');
    } else {
        emailQuery = {email: email};
        
        Admin.findOne(emailQuery, (err, admin) => {
            if(err) {
                console.log(`Error: ${err}`)
            }
            if(admin) {
                console.log(`This admin email exists already: ${admin}`);
                req.flash('errorMsg', 'This email has been taken');
                res.redirect('signup');
            } else {
                mobileQuery = {mobile: mobile};
                Admin.findOne(mobileQuery, (err, admin_mobile) => {
                    if(err) {
                        console.log(`Error: ${err}`)
                    }
                    if(admin_mobile) {
                        console.log(`This admin mobile exists already: ${admin_mobile}`);
                        req.flash('errorMsg', 'This mobile has been taken');
                        res.redirect('signup');
                    } else {
                        console.log("checking for mobile:" +mobile)
                        let newAdmin = new Admin({
                            firstname: firstname,
                            lastname: lastname, 
                            mobile: mobile, 
                            email: email, 
                            role: "Super-Admin", 
                            password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
                            p_check: password
                        });

                        newAdmin.save( (err, registeredAdmin) => {
                            if(err) throw err;
                            else {
                                console.log(`Admin saved to the database ${registeredAdmin}`);

                                let newAdminWallet = new AdminWallet({
                                    wallet_id: mobile,
                                    user_id: registeredAdmin._id, 
                                });
                                newAdminWallet.save( (err, registerdWallet) => {
                                    if(err) throw err;
                                    else {
                                        console.log(`AdminWallet saved to the database ${registerdWallet}`);
                                    }
                                })

                                req.flash('successMsg', 'You have registered successfully, Login to your account now');
                                res.redirect('login');
                            }
                        });

                    }
                })
            }
        })
    }
});


router.get('*', (req, res, next) => {
    res.locals.user = req.user || null;
    if(req.user) {
        // console.log('From all:' + req.user);
        // res.locals.admin = req.user || null;
        let mainAdmin = false;
        if(req.user.role == 'Super-Admin'){
            mainAdmin = true;
        } else {
            mainAdmin = false;
        }
        // console.log(mainAdmin);
        res.locals.mainAdmin = req.mainAdmin = mainAdmin;
    }
    
    next();
});

//Enter the user dashboard
router.get('/dashboard', ensureAuth, (req, res) => {
    // console.log('User:' + req.user, req.user._id);
    // console.log("RES " +req.wallet)
    
    console.log('from dashboard' +req.mainAdmin);
    if(req.user.role == 'Super-Admin' || req.user.role == 'Manager'){
        AdminWallet.findOne({
            'wallet_id': req.user.mobile,
            'user_id': req.user._id
        }, (err, adminWallet) => {
            if(err) return next(err)
            else {
                res.render('admins/dashboard', {
                    adminWallet: adminWallet,
                    mainAdmin: req.mainAdmin
                })
            }
        });        
    } else {
        res.send("Invalid Access")
    }

});

router.get('/accounts/users', ensureAuth, (req, res) => {
    if(req.user.role == 'Super-Admin' || req.user.role == 'Manager'){
        AdminWallet.findOne({
            'wallet_id': req.user.mobile,
            'user_id': req.user._id
        }, (err, adminWallet) => {
            if(err) return next(err)
            else {
                res.render('admins/accounts/users', {
                    adminWallet: adminWallet
                })
            }
        });        
    } else {
        res.send("Invalid Access")
    }
})

router.get('/accounts/agents', ensureAuth, (req, res) => {
    if(req.user.role == 'Super-Admin' || req.user.role == 'Manager'){
        AdminWallet.findOne({
            'wallet_id': req.user.mobile,
            'user_id': req.user._id
        }, (err, adminWallet) => {
            if(err) return next(err)
            else {
                res.render('admins/accounts/agents', {
                    adminWallet: adminWallet
                })
            }
        });        
    } else {
        res.send("Invalid Access")
    }
})

router.get('/accounts/managers', ensureAuth, (req, res) => {
    if(req.user.role == 'Super-Admin' || req.user.role == 'Manager'){
        AdminWallet.findOne({
            'wallet_id': req.user.mobile,
            'user_id': req.user._id
        }, (err, adminWallet) => {
            if(err) return next(err)
            else {
                res.render('admins/accounts/managers', {
                    adminWallet: adminWallet
                })
            }
        });        
    } else {
        res.send("Invalid Access")
    }
})

router.get('/accounts/create', ensureAuth, (req, res) => {
    if(req.user.role == 'Super-Admin' || req.user.role == 'Manager'){
        AdminWallet.findOne({
            'wallet_id': req.user.mobile,
            'user_id': req.user._id
        }, (err, adminWallet) => {
            if(err) return next(err)
            else {
                res.render('admins/accounts/create', {
                    adminWallet: adminWallet
                })
            }
        });        
    } else {
        res.send("Invalid Access")
    }
})

router.post('/accounts/create', ensureAuth, createUser)

router.post('/gen-funds', ensureAuth, genFunds)



/*
|=======================================================================================================
|// adminCreateAccount.controller Starts 
|=======================================================================================================
*/
function createUser(req, res) {
    console.log("loging userData" +req.body.firstname, req.body.lastname, req.body.mobile, req.body.email, req.body.password);

    req.checkBody('firstname', 'Firstname is required').notEmpty();
    req.checkBody('lastname', 'Lastname is required').notEmpty();
    req.checkBody('mobile', 'Mobile is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('account_type', 'Account Type is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();
    
    let errors = req.validationErrors();

    if(errors){
        console.log(`Validation Errors: ${JSON.stringify(errors)}`);
        req.flash('error', errors);
        res.redirect('create');
    } else {

        const firstname = req.body.firstname;
        const lastname = req.body.lastname;
        const mobile = req.body.mobile;
        const email = req.body.email.toLowerCase();
        const account_type = req.body.account_type;
        const password = '123456';

        emailQuery = {email: email};
        
        if(account_type == 'User' || account_type == 'Agent') {
            User.findOne(emailQuery, (err, user_email) => {
                if(err) {throw err}
                if(user_email){
                    console.log(`This admin email exists already: ${user_email}`);
                    req.flash('errorMsg', 'This email has been taken');
                    res.redirect('create');
                } else {
                    mobileQuery = {mobile: mobile};
                    User.findOne(mobileQuery, (err, user_mobile) => {
                        if(err){throw err}
                        
                        if(user_mobile){
                            console.log(`This user mobile exists already: ${user_mobile}`);
                            req.flash('errorMsg', 'This mobile has been taken');
                            res.redirect('create');
                        } else {
                            
                            console.log("attempting to save the user:");
                            const newUser = new User({
                                firstname: firstname,
                                lastname: lastname, 
                                mobile: mobile, 
                                email: email, 
                                account_type: account_type,
                                created_by: req.user._id,
                                password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
                                p_check: password
                            });
    
                            newUser.save( (err, registeredUser) => {
                                if(err){
                                    throw error
                                } else {
                                    console.log(`User saved to the database ${registeredUser.firstname}`);
    
                                    let newUserWallet = new UserWallet({
                                        wallet_id: mobile,
                                        user_id: registeredUser._id,
                                        wallet_type: account_type 
                                    });
    
                                    newUserWallet.save( (err, registerdWallet) => {
                                        if(err) throw err;
                                        else {
                                            console.log(`UserWallet saved to the database ${registerdWallet.wallet_id}`);
                                        }
                                    });
                                    
                                    req.flash('successMsg', `You have registered a new ${account_type} successfully, password is ${registeredUser.p_check}`);
                                    res.redirect('create');
                                }
                            });
                        }
                    })
                }
            });
        }
        
        if(account_type == 'Manager') {
            if(req.user.role != 'Super-Admin'){
                req.flash('errorMsg', `You don't have priviledges to create a ${account_type} account`);
                res.redirect('create');
            } else {

                Admin.findOne(emailQuery, (err, admin_email) => {
                    if(err) {throw err}
                    if(admin_email){
                        console.log(`This admin email exists already: ${admin_email}`);
                        req.flash('errorMsg', 'This manager email has been taken');
                        res.redirect('create');
                    } else {
                        mobileQuery = {mobile: mobile};
                        Admin.findOne(mobileQuery, (err, admin_mobile) => {
                            if(err){throw err}
                            
                            if(admin_mobile){
                                console.log(`This admin mobile exists already: ${admin_mobile}`);
                                req.flash('errorMsg', 'This manager mobile has been taken');
                                res.redirect('create');
                            } else {
                                
                                console.log("attempting to save the admin:");
                                const newAdmin = new Admin({
                                    firstname: firstname,
                                    lastname: lastname, 
                                    mobile: mobile, 
                                    email: email, 
                                    role: account_type,
                                    created_by: req.user._id,
                                    password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
                                    p_check: password
                                });
        
                                newAdmin.save( (err, registeredAdmin) => {
                                    if(err){
                                        throw error
                                    } else {
                                        console.log(`User saved to the database ${registeredAdmin.firstname}`);
        
                                        let newAdminWallet = new AdminWallet({
                                            wallet_id: mobile,
                                            user_id: registeredAdmin._id,
                                            wallet_type: account_type 
                                        });
        
                                        newAdminWallet.save( (err, registerdWallet) => {
                                            if(err) throw err;
                                            else {
                                                console.log(`AdminWallet saved to the database ${registerdWallet.wallet_id}`);
                                            }
                                        });
                                        
                                        req.flash('successMsg', `You have registered a new ${account_type} successfully, password is ${registeredAdmin.p_check}`);
                                        res.redirect('create');
                                    }
                                });
                            }
                        })
                    }
                });
            }
        }
        
    }

}
/*
|=======================================================================================================
|// adminCreateAccount.controller Ends 
|=======================================================================================================
*/

/*
|=======================================================================================================
|// Main Admin Action Starts 
|=======================================================================================================
*/
function genFunds(req, res) {
    console.log("loging genFundsData: " +req.body.gen_amount, req.body.remark);
    // console.log(req.user.role);
    

    req.checkBody('gen_amount', 'Amount is required').notEmpty();
    // req.checkBody('Remark', 'remark is required').notEmpty();
    
    let errors = req.validationErrors();
    if(errors) {
        console.log(`Validation Errors: ${JSON.stringify(errors)}`);
        req.flash('error', errors);
        res.redirect('dashboard');
    }    
    if(req.user.role != 'Super-Admin') {
        req.flash('errorMsg', `You cannot generate funds`);
        res.redirect('dashboard');
    } else {
        const amount = req.body.gen_amount;
        const remark = req.body.remark || null;
        
        const min_amount = 0;

        if(amount <= 0) {
            req.flash('infoMsg', `You can't generate anything bellow ${min_amount} `);
            res.redirect('dashboard');
        } else {
            mainAdminQuery = {user_id: req.user._id};
            AdminWallet.findOne(mainAdminQuery, (err, adminWallet) => {
                if(err) throw err;
                if(!adminWallet) {
                    req.flash('warningMsg', `Issue with your account, you can't generate right now`);
                    res.redirect('dashboard');
                } else {
                    console.log(`Found admin with wallet id ${adminWallet} `);
                    
                    AdminWallet.update({ 'wallet_id': req.user.mobile, 'user_id': req.user._id }, 
                        { $inc: { 'ballance': amount } }, (err) => {
                        if(err) throw err;
                        
                        else {
                            console.log('Updating...');
                            
                            let newGenFundsHistory = new GenFundsHistory({
                                user_id: req.user._id,
                                amount: amount,
                                remark: remark
                            });
                            newGenFundsHistory.save( (err, History) => {
                                if(err) throw err;
                                else {
                                    console.log(`GenerateFundHistory saved to the database ${History}`);
                                
                                    req.flash('successMsg', `Accounted topped up by ${amount}, previous ballance: ${adminWallet.ballance} `);
                                    res.redirect('dashboard');
                                }
                            })

                        }                            
                    });
                }
            })
        }
    }
}
/*
|=======================================================================================================
|// Main Admin Action Ends 
|=======================================================================================================
*/


//Access Control
function ensureAuth(req, res, next){
    if(req.isAuthenticated()){
        return next();
    } else {
        req.flash('errorMsg', 'You need to login to access this page');
        res.redirect('/admins/login');
    }
}

function redirectIfAuth(req, res, next){
    if(req.isAuthenticated()){
        req.flash('infoMsg', 'You are already logged in');
        res.redirect('/admins/dashboard');
    } else {
        return next();
    }
}

module.exports = router;
