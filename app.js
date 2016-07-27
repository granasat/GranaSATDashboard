"use strict"

// REQUIRES ////////////////////////////////////////////////////////////
//Express stuff
var express = require('express');
var bodyParser = require("body-parser");
var cookieParser = require('cookie-parser');
var expressValidator = require('express-validator');
var proxy = require('express-http-proxy');

//Commons
var path = require('path');
var sys = require('sys')
var exec = require('child_process').exec;
var dateFormat = require('dateformat');

//Log
var log = require('./utils/logger.js').Logger;

//Config
var config = require('./config.js').config

//Rotors, transceivers and propagator
var Yaesu = require('./rotors/yaesu.js');
var Kenwood = require('./transceivers/kenwoodts2000.js');
var Icom9100 = require('./transceivers/icom9100.js');
var Propagator = require('./propagator/propagator.js');


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
    return done(null, user.USR_ID);
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
    log("Logging out " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));
    req.logout();
    res.json({
        status: "Done"
    })
});

var rotors = new Yaesu(config.serial_rotors);
// var radioStation = new Kenwood(config.serial_transceiver_keenwoodts2000)
var radioStation = new Icom9100(config.serial_transceiver_icom9100)
var propagator = new Propagator("XW-2D", -3.6095, 37.179640, 672);

propagator.getPasses(new Date(),new Date(new Date().getTime() + (1000*60*60*24*7)))


//Propagator
setTimeout(function() {
    log("Starting pass")
    var passName = "pass_" + dateFormat(new Date(), "dd-mm-yy-HH-mm")
    var duration = 10
    var freq = 145855000
    var command = "arecord -f cd -d " + duration.toString() + " " + passName + ".wav"

    exec(command, function(error, stdout, stderr) {
        if (error) {
            console.log(error)
        }
    })

    var passInterval = setInterval(function() {
        var p = propagator.getStatusNow()

        if (!p.error) {
            //Move antennas
            rotors.move(p, function(data) {
                if (!data.error) {
                    log("Moving to AZ: " + p.azi + " EL: " + p.ele);
                }
            })

            //Set freq
            radioStation.setFrequency({
                VFOA: freq * p.dopplerFactor
            }, function(data) {
                if (!data.error) {
                    log("Setting freq to " + freq * p.dopplerFactor + " [" + freq + "]");
                }
            })
        }else {
            log(p.error,"error")
        }


    }, config.auto_pass_refresh_rate)


    setTimeout(function() {
        clearInterval(passInterval);
        log("Ending pass")
    }, duration * 1000 /*Pass duration*/ )


}, 0 /*Time to pass start*/ )


app.get('/radiostation/freq', function(req, res) {

    // log("Asking for radio freq: " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    radioStation.getFrequency(function(freq) {
        res.json(freq);
    })

});

app.post('/radiostation/freq', isAuthenticated, function(req, res) {
    log("Moving radio freq: " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    radioStation.setFrequency(req.body, function(data) {
        res.json(data);
    })
});

app.get('/rotors/position', function(req, res) {
    // log("Asking for rotors: " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    rotors.getData(function(data) {
        res.json(data);
    })

});

app.post('/rotors/position', isAuthenticated, function(req, res) {
    //Set the elevation and azimuth information available on the HTTP request

    rotors.move(req.body, function(data) {
        res.json(data);
    })

});

app.get('/', function(req, res, next) {
    res.sendFile(path.join(__dirname + '/static/index.html'));
});

app.listen(config.web_port, config.web_host)
log("Web server listening: " + config.web_host + ":" + config.web_port)
