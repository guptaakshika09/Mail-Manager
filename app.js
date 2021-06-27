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

mongoose.connect('mongodb://localhost:27017/mailInfoDB', {useNewUrlParser: true, useUnifiedTopology: true});
/****************************************************************************************************** */



const Future= new mongoose.Schema({
    user:String,
    
    mails:[{from: String,
        to:String,
        subject:String,
        body:String,
        frequency:String,
        mailDate : String}],

})

const History= new mongoose.Schema({
    user:String,
    
    mails:[{from: String,
        to:String,
        subject:String,
        body:String,
        frequency:String,
        mailDate : String}],
   
})


const history = mongoose.model('History',History);
const future = mongoose.model('Future',Future);



// var currentdate = new Date(); 
//                 var datetime =  currentdate.getDate() + "/"
//                 + (currentdate.getMonth()+1)  + "/" 
//                 + currentdate.getFullYear() + " @ "  
//                 + currentdate.getHours() + ":"  
//                 + currentdate.getMinutes();

// console.log(currentdate);

// app.get("/",ensureAuthenticated ,function (req,res) {
//     res.render("home.ejs",{
//         name : req.user.name
//     });
// })

app.get('/',ensureAuthenticated ,function (req,res) {
    res.render("main.ejs");
})

function AddMinutesToDate(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}


app.post('/',function (req,res) {
    var from=req.body.from;    
    var to=req.body.to; 
    var subject=req.body.subject;  
    var body=req.body.body;
    var name=req.body.name;
    var schedule=req.body.schedule;


    // history.find({user:req.user.email},function (err,user) {
    //     console.log(user,err);
    //     console.log(user.length)
        
    // })


    future.find({user:req.user.email},function (err,user) {
        if(user.length==0){
            var u1 = new future({user:req.user.email});
            future.insertMany([u1],function (err) {
                if(err){console.log(err);}
                else{
                    future.findOneAndUpdate(
                        {user:req.user.email},  
                        {$push : {mails:{from:from,to:to,subject:subject,body:body,frequency:schedule,mailDate:day+" "+timeof}}},
                        function (e,s) {
                            if(e){console.log(e);}
                            
                        }
                    )
                }
            });
        }
        else{
            future.findOneAndUpdate(
                {user:req.user.email},  
                {$push : {mails:{from:from,to:to,subject:subject,body:body,frequency:schedule,mailDate:day+" "+timeof}}},
                function (e,s) {
                    if(e){console.log(e);}
                    
                }
            )
        }
    })

    
    var sc;
    if(schedule=='30sec'){
        sc='*/30 * * * * *';
    }
    else if(schedule=='weekly'){
        
        var pre = new Date();
        var d = AddMinutesToDate(pre,2);
        var n = d.getDay();
        var h = d.getHours();
        var m = d.getMinutes();
        
        sc=`${m} ${h} * * ${n}`;
        // 2s minute after current time everyweek
    }
    else if(schedule=='monthly'){
        var pre = new Date();
        var d = AddMinutesToDate(pre,2);
        var n = d.getDay();
        var h = d.getHours();
        var m = d.getMinutes();
        var day=d.getDate();
        
        sc=`${m} ${h} ${day} * *`;
    }
    else{
        //yearly
        var pre = new Date();
        var d = AddMinutesToDate(pre,2);
        var n = d.getDay();
        var h = d.getHours();
        var m = d.getMinutes();
        var day=d.getDate();
        var month=d.getMonth()+1;
        
        sc=`${m} ${h} ${day} ${month} *`;

    }
    //console.log(sc);
    cron.schedule(sc, () => {
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
            let today=new Date();
            let options={
                year:"numeric",
                day:"numeric",
                month:"long"
            };
            let minute={ hour: '2-digit', minute: '2-digit' };
            let timeof = today.toLocaleTimeString("en-us",minute);
            let day=today.toLocaleDateString("en-us",options);

            
            history.find({user:req.user.email},function (err,user) {
                if(user.length==0){
                    var u1 = new history({user:req.user.email});
                    history.insertMany([u1],function (err) {
                        if(err){console.log(err);}
                        else{
                            history.findOneAndUpdate(
                                {user:req.user.email},  
                                {$push : {mails:{from:from,to:to,subject:subject,body:body,frequency:schedule,mailDate:day+" "+timeof}}},
                                function (e,s) {
                                    if(e){console.log(e);}
                                    
                                }
                            )
                        }
                    });
                }
                else{
                    history.findOneAndUpdate(
                        {user:req.user.email},  
                        {$push : {mails:{from:from,to:to,subject:subject,body:body,frequency:schedule,mailDate:day+" "+timeof}}},
                        function (e,s) {
                            if(e){console.log(e);}
                            
                        }
                    )
                }
            })

            // history.findOne({user:req.user.email},function (err,user){

            // });
            // history.findOneAndUpdate(
            //     {user:req.user.email},  
            //     {$push : {mails:{from:from,to:to,subject:subject,body:body,frequency:schedule,mailDate:day+" "+timeof}}},
            //     function (e,s) {
            //         if(e){console.log(e);}
                    
            //     }
            // )
            

            console.log('Mail sent : %s', info.response);
            
        }
    })



});

    res.redirect('/');
    
})


app.get('/history',function (req,res) {
    
    
})

// cron.schedule('*/5 * * * * *', () => {
//     console.log('running every 5 sec ');
//   });


app.listen(3000);