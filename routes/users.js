const express = require('express');
const router =express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const jwt = require('jsonwebtoken');
const JWT_KEY = "jwtactive987";
const JWT_RESET_KEY = "jwtreset987";

const { ensureNotAuthenticated } = require('../config/notAuth.js');
//User Model
const User = require('../models/User');
const { ensureAuthenticated } = require('../config/auth.js');
const { Mongoose } = require('mongoose');

//Login Page
router.get('/login',ensureNotAuthenticated ,function(req,res){
    res.render("login");
})

//Register Page
router.get('/register',ensureNotAuthenticated ,function(req,res){
    res.render("register");
})

// router.get('/forgot',ensureNotAuthenticated,function (req,res){
//     res.render("forgot");
// })

// router.get('/reset/:id', (req, res) => {
//     res.render('reset', { id: req.params.id })
// });
//Register Handle
router.post('/register', function(req,res){
    var {name, email, password, password2} = req.body;
    let errors = [];

    //Check required fields
    if (!name || !email || !password || !password2){
        errors.push({msg: 'Please enter all fields'});
    }

    //Check passwords match
    if (password !== password2){
        errors.push({msg : 'Passwords do not match'});
    }

    //Check password length
    if (password.length < 6){
        errors.push({msg : 'Password must be at least 6 characters'});
    }
    // email=email.trim()
    // var endEmail="@iitj.ac.in"
    // // xyz@iitj.ac.in
    // if(email.slice(-11)!=endEmail){
    //     errors.push({msg : 'This is not an IITJ email'});
    // }
    if (errors.length > 0){
        res.render('register', {
            errors,
            name,
            email,
            password,
            password2
        });
    }else{
        //Validation passed
        User.findOne({email : email})
            .then(function(user){
                if (user){
                    //User exists
                    errors.push({msg : 'Email is already registered'});
                    res.render('register', {
                        errors,
                        name,
                        email,
                        password,
                        password2
                    });
                }else{
                    
                    const oauth2Client = new OAuth2(
                        "1041816779848-ehb6ngglc96q5p8hvujd67vpv9d1qh3u.apps.googleusercontent.com", // ClientID
                        "_MI73ojAvQr2EQavt5bsR7Zk", // Client Secret
                        "https://developers.google.com/oauthplayground" // Redirect URL
                    );
    
                    oauth2Client.setCredentials({
                        refresh_token: "1//04egSAIPyuptFCgYIARAAGAQSNwF-L9IrvM97fUxHsK3qJC3iD-hJYWZXtTeWN_cOKgxXz7Gucf71E9gJMYZi3hFl0nvhoPzNZM8"
                    });
                    const accessToken = oauth2Client.getAccessToken()
    
                    const token = jwt.sign({ name, email, password }, JWT_KEY, { expiresIn: '30m' });
                    const CLIENT_URL = 'http://' + req.headers.host;
    
                    const output = `
                    <h2>Please click on below link to activate your account</h2>
                    <p>${CLIENT_URL}/users/activate/${token}</p>
                    <p><b>NOTE: </b> The above activation link expires in 30 minutes.</p>
                    `;
    
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            type: "OAuth2",
                            user: "iitjforumhelp@gmail.com",
                            clientId: "1041816779848-ehb6ngglc96q5p8hvujd67vpv9d1qh3u.apps.googleusercontent.com",
                            clientSecret: "_MI73ojAvQr2EQavt5bsR7Zk",
                            refreshToken: "1//04egSAIPyuptFCgYIARAAGAQSNwF-L9IrvM97fUxHsK3qJC3iD-hJYWZXtTeWN_cOKgxXz7Gucf71E9gJMYZi3hFl0nvhoPzNZM8",
                            accessToken: accessToken
                        },
                    });
    
                    // send mail with defined transport object
                    const mailOptions = {
                        from: '"Auth Admin" <iitjforumhelp@gmail.com>', // sender address
                        to: email, // list of receivers
                        subject: "Account Verification: NodeJS Auth ✔", // Subject line
                        generateTextFromHTML: true,
                        html: output, // html body
                    };
    
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.log(error);
                            req.flash(
                                'error_msg',
                                'Something went wrong on our end. Please register again.'
                            );
                            res.redirect('/users/login');
                        }
                        else {
                            console.log('Mail sent : %s', info.response);
                            req.flash(
                                'success_msg',
                                'Activation link sent to email ID. Please activate to log in.'
                            );
                            res.redirect('/users/login');
                        }
                    })                  
                };
            });
    }
});

router.get('/activate/:token',function (req,res) {
    const token = req.params.token;
    let errors = [];
    if (token) {
        jwt.verify(token, JWT_KEY, (err, decodedToken) => {
            if (err) {
                req.flash(
                    'error_msg',
                    'Incorrect or expired link! Please register again.'
                );
                res.redirect('/users/register');
            }
            else {
                const { name, email, password } = decodedToken;
                User.findOne({ email: email }).then(user => {
                    if (user) {
                        //------------ User already exists ------------//
                        req.flash(
                            'error_msg',
                            'Email ID already registered! Please log in.'
                        );
                        res.redirect('/users/login');
                    } else {
                        const newUser = new User({
                            name,
                            email,
                            password
                        });

                        bcrypt.genSalt(10, (err, salt) => {
                            bcrypt.hash(newUser.password, salt, (err, hash) => {
                                if (err) throw err;
                                newUser.password = hash;
                                newUser
                                    .save()
                                    .then(user => {
                                        req.flash(
                                            'success_msg',
                                            'Account activated. You can now log in.'
                                        );
                                        res.redirect('/users/login');
                                    })
                                    .catch(err => console.log(err));
                            });
                        });
                    }
                });
            }
        })
    }
    else {
        console.log("Account activation error!")
    }
})

//Login Handle
router.post('/login',function(req,res, next){
    passport.authenticate('local',{
        successRedirect : '/',
        failureRedirect : '/users/login',
        failureFlash : true
    }) (req,res,next);
});

//Logout Handle
router.get('/logout', function(req, res){
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
})

// router.post('/reset/:id', function (req,res) {
//     {
//         var { password, password2 } = req.body;
//         const id = req.params.id;
//         let errors = [];
    
//         //------------ Checking required fields ------------//
//         if (!password || !password2) {
//             req.flash(
//                 'error_msg',
//                 'Please enter all fields.'
//             );
//             res.redirect(`/users/reset/${id}`);
//         }
    
//         //------------ Checking password length ------------//
//         else if (password.length < 6) {
//             req.flash(
//                 'error_msg',
//                 'Password must be at least 8 characters.'
//             );
//             res.redirect(`/users/reset/${id}`);
//         }
    
//         //------------ Checking password mismatch ------------//
//         else if (password != password2) {
//             req.flash(
//                 'error_msg',
//                 'Passwords do not match.'
//             );
//             res.redirect(`/users/reset/${id}`);
//         }
    
//         else {
//             bcrypt.genSalt(10, (err, salt) => {
//                 bcrypt.hash(password, salt, (err, hash) => {
//                     if (err) throw err;
//                     password = hash;
    
//                     User.findByIdAndUpdate(
//                         { _id: id },
//                         { password },
//                         function (err, result) {
//                             if (err) {
//                                 req.flash(
//                                     'error_msg',
//                                     'Error resetting password!'
//                                 );
//                                 res.redirect(`/auth/reset/${id}`);
//                             } else {
//                                 req.flash(
//                                     'success_msg',
//                                     'Password reset successfully!'
//                                 );
//                                 res.redirect('/users/login');
//                             }
//                         }
//                     );
//                 });
//             });
//         }   
//     }
// });


// router.get('/forgot/:token', function (req,res) {
//     const { token } = req.params;

//     if (token) {
//         jwt.verify(token, JWT_RESET_KEY, (err, decodedToken) => {
//             if (err) {
//                 req.flash(
//                     'error_msg',
//                     'Incorrect or expired link! Please try again.'
//                 );
//                 res.redirect('/users/login');
//             }
//             else {
//                 const { _id } = decodedToken;
//                 User.findById(_id, (err, user) => {
//                     if (err) {
//                         req.flash(
//                             'error_msg',
//                             'User with email ID does not exist! Please try again.'
//                         );
//                         res.redirect('/users/login');
//                     }
//                     else {
//                         res.redirect(`/users/reset/${_id}`)
//                     }
//                 })
//             }
//         })
//     }
//     else {
//         console.log("Password reset error!")
//     }
// });

// router.post('/forgot',function (req,res) {
//     const { email } = req.body;

//     let errors = [];

//     //------------ Checking required fields ------------//
//     if (!email) {
//         errors.push({ msg: 'Please enter an email ID' });
//     }

//     if (errors.length > 0) {
//         res.render('forgot', {
//             errors,
//             email
//         });
//     } else {
//         User.findOne({ email: email }).then(user => {
//             if (!user) {
//                 //------------ User dosent exists ------------//
//                 errors.push({ msg: 'User with Email ID does not exist!' });
//                 res.render('forgot', {
//                     errors,
//                     email
//                 });
//             } else {

//                 const oauth2Client = new OAuth2(
//                     "1041816779848-ehb6ngglc96q5p8hvujd67vpv9d1qh3u.apps.googleusercontent.com", // ClientID
//                     "_MI73ojAvQr2EQavt5bsR7Zk", // Client Secret
//                     "https://developers.google.com/oauthplayground" // Redirect URL
//                 );

//                 oauth2Client.setCredentials({
//                     refresh_token: "1//04mLfMU4FJBg_CgYIARAAGAQSNwF-L9Ir2DWRTyBnDQwvoVfpNJXteXk4eGFfIyxWpgojPSq11ktuGa5s8Y0IRipEghfILtAbZJ8"
//                 });
//                 const accessToken = oauth2Client.getAccessToken()

//                 const token = jwt.sign({ _id: user._id }, JWT_RESET_KEY, { expiresIn: '30m' });
//                 const CLIENT_URL = 'http://' + req.headers.host;
//                 const output = `
//                 <h2>Please click on below link to reset your account password</h2>
//                 <p>${CLIENT_URL}/users/forgot/${token}</p>
//                 <p><b>NOTE: </b> The activation link expires in 30 minutes.</p>
//                 `;

//                 User.updateOne({ resetLink: token }, (err, success) => {
//                     if (err) {
//                         errors.push({ msg: 'Error resetting password!' });
//                         res.render('forgot', {
//                             errors,
//                             email
//                         });
//                     }
//                     else {
//                         const transporter = nodemailer.createTransport({
//                             service: 'gmail',
//                             auth: {
//                                 type: "OAuth2",
//                                 user: "iitjforumhelp@gmail.com",
//                                 clientId: "1041816779848-ehb6ngglc96q5p8hvujd67vpv9d1qh3u.apps.googleusercontent.com",
//                                 clientSecret: "_MI73ojAvQr2EQavt5bsR7Zk",
//                                 refreshToken: "1//04mLfMU4FJBg_CgYIARAAGAQSNwF-L9Ir2DWRTyBnDQwvoVfpNJXteXk4eGFfIyxWpgojPSq11ktuGa5s8Y0IRipEghfILtAbZJ8",
//                                 accessToken: accessToken
//                             },
//                         });

//                         // send mail with defined transport object
//                         const mailOptions = {
//                             from: '"Auth Admin" <iitjforumhelp@gmail.com>', // sender address
//                             to: email, // list of receivers
//                             subject: "Account Password Reset: NodeJS Auth ✔", // Subject line
//                             html: output, // html body
//                         };

//                         transporter.sendMail(mailOptions, (error, info) => {
//                             if (error) {
//                                 console.log(error);
//                                 req.flash(
//                                     'error_msg',
//                                     'Something went wrong on our end. Please try again later.'
//                                 );
//                                 res.redirect('/users/forgot');
//                             }
//                             else {
//                                 console.log('Mail sent : %s', info.response);
//                                 req.flash(
//                                     'success_msg',
//                                     'Password reset link sent to email ID. Please follow the instructions.'
//                                 );
//                                 res.redirect('/users/login');
//                             }
//                         })
//                     }
//                 })
//             }
//         });
//     }
// });


// router.get("/my-questions/:token",ensureAuthenticated,function name(req,res) {
//     const {token} = req.params;
//     User.findOne({email:token},function (err,user) {
//         if(err){res.redirect('/users/login')}
//         if(!user){
//             res.redirect('/users/login');
//         }
//         else{
//             if(user.email==req.user.email){
//                 Mongoose.Model('questions').find({email:user.email},function (err,questionsUploaded) {
//                     if(err){res.redirect('/1')};
//                     console.log(questionsUploaded);
//                     if(!questionsUploaded){questionsUploaded=[]}
//                     res.render("myQues.ejs",{question:questionsUploaded,user:req.user.name});
                    
                    
//                 })
//             }
//             res.redirect('/1');
//         }        
//     })

// })
    



module.exports = router;