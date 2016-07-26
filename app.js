"use strict"

// REQUIRES ////////////////////////////////////////////////////////////
//Express stuff
var express = require('express');
var bodyParser = require("body-parser");
var cookieParser = require('cookie-parser');
var expressValidator = require('express-validator');

//Commons
var path = require('path');

//Log
var log = require('./utils/logger.js').Logger;

//Config
var config = require('./config.js').config

//Rotors and transceivers
var Yaesu = require('./rotors/yaesu.js');
var Kenwood = require('./transceivers/kenwoodts2000.js');

//Database stuff
var db = new require("./utils/database.js")()

//Auth stuff
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

// APPs ////////////////////////////////////////////////////////////////
var app = express();
app.use(express.static(__dirname + '/static'));
app.use('/bower_components', express.static(__dirname + '/bower_components'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'cambia esto cuando puedas',
    cookie: {
        maxAge: 1800000
    },
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(expressValidator());


//PASSPORTJS AND AUTH/ /////////////////////////////////////////////////

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.json({
            status: "No auth",
        })
    }
}

passport.use("login", new LocalStrategy(db.loginConfig, db.login));


passport.serializeUser(function(user, done) {
    return done(null, user.USER_ID);
});

passport.deserializeUser(db.deserializeUser);


// ROUTES, GET AND POST ////////////////////////////////////////////////

app.post('/signup', isAuthenticated, db.signup);

app.post('/login', passport.authenticate('login'), function(req, res) {
    res.json({
        status: "Done"
    })
});


app.get('/logout', function(req, res) {
    log("Logging out " + req.user.USER_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));
    req.logout();
    res.json({
        status: "Done"
    })
});

// Radiostation
var radioStation = new Kenwood(config.serial_transceiver)


app.get('/radiostation/freq', function(req, res) {

    // log("Asking for radio freq: " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    radioStation.getFrequency(function(freq) {
        res.json(freq);
    })

});

app.post('/radiostation/freq', isAuthenticated, function(req, res) {
    log("Moving radio freq: " + req.user.USER_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    radioStation.setFrequency(req.body, function(data) {
        res.json(data);
    })
});

app.get('/rotors', function(req, res) {
    // log("Asking for rotors: " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    var y = new Yaesu(config.serial_rotors);

    y.getData(function(data) {
        res.json(data);
    })

});

app.post('/rotors', isAuthenticated, function(req, res) {
    //Set the elevation and azimuth information available on the HTTP request

    var y = new Yaesu(config.serial_rotors);

    y.move(req.body, function(data) {
        res.json(data);
    })

});

app.get('/', function(req, res, next) {
    res.sendFile(path.join(__dirname + '/static/index.html'));
});

app.listen(config.web_port, config.web_host)
log("Web server listening: " + config.web_host + ":" + config.web_port)
