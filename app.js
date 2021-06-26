const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const express = require("express");
const expressLayouts = require('express-ejs-layouts');

const bodyParser=require("body-parser");
const mongoose = require("mongoose");
const flash = require('connect-flash');
const session = require('express-session');
const passport = require("passport");
const { ensureAuthenticated } = require('./config/auth');
const { on } = require("./models/User.js");

const app=express();


//Passport config
require('./config/passport')(passport);

const User = require('./models/User.js');

//EJS
//app.use(expressLayouts);
app.set('view engine', 'ejs');

app.use(express.static("public")); 
app.use(bodyParser.urlencoded({extended :true}))
var cron = require('node-cron');
//Express Session
app.use(session({
    secret : 'secret',
    resave: true,
    saveUninitialized : true
}));

//Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//Connect flash
app.use(flash());

//Global Variables
app.use(function(req,res,next){
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
})

//Routes

app.use("/users", require('./routes/users'));

mongoose.connect('mongodb://localhost:27017/questionsDB', {useNewUrlParser: true, useUnifiedTopology: true});
/****************************************************************************************************** */


// app.get("/",ensureAuthenticated ,function (req,res) {
//     res.render("home.ejs",{
//         name : req.user.name
//     });
// })

app.get('/',ensureAuthenticated ,function (req,res) {
    res.render("main.ejs");
})


app.post('/',function (req,res) {
    var from=req.body.from;    
    var to=req.body.to; 
    var subject=req.body.subject;  
    var body=req.body.body;
    var name=req.body.name;
    var schedule=req.body.schedule;

    var sc;
    if(schedule=='30sec'){
        sc='*/30 * * * * *';
    }
    else if(schedule=='weekly'){
        var d = new Date();
        var n = d.getDay();
        sc='* * * * '+n;
    }

    cron.schedule('*/15 * * * * *', () => {
    //console.log('running every 15 sec ');
    

    const oauth2Client = new OAuth2(
        "1041816779848-ehb6ngglc96q5p8hvujd67vpv9d1qh3u.apps.googleusercontent.com", // ClientID
        "_MI73ojAvQr2EQavt5bsR7Zk", // Client Secret
        "https://developers.google.com/oauthplayground" // Redirect URL
    );

    oauth2Client.setCredentials({
        refresh_token: "1//04egSAIPyuptFCgYIARAAGAQSNwF-L9IrvM97fUxHsK3qJC3iD-hJYWZXtTeWN_cOKgxXz7Gucf71E9gJMYZi3hFl0nvhoPzNZM8"
    });
    const accessToken = oauth2Client.getAccessToken()



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
        from:  name+" "+ from  +' via <iitjforumandhelp@gmail.com>', // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        html: body, // html body
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            
        }
        else {
            console.log('Mail sent : %s', info.response);
           
        }
    })



});

    res.redirect('/');
    
})


// cron.schedule('*/5 * * * * *', () => {
//     console.log('running every 5 sec ');
//   });


app.listen(3000);