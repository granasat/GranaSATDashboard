"use strict"

// REQUIRES ////////////////////////////////////////////////////////////
//Express stuff
var express = require('express');
var bodyParser = require("body-parser");
var cookieParser = require('cookie-parser');
var expressValidator = require('express-validator');
var proxy = require('express-http-proxy');

//Commons
var _ = require('lodash')
var path = require('path');
var util = require('util')
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


app.get('/logout', isAuthenticated, function(req, res) {
    log("Logging out " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));
    req.logout();
    res.json({
        status: "Done"
    })
});

var rotors = new Yaesu(config.serial_rotors);
// var radioStation = new Kenwood(config.serial_transceiver_keenwoodts2000)
var radioStation = new Icom9100(config.serial_transceiver_icom9100)

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

    rotors.getPosition(function(data) {
        res.json(data);
    })

});

app.post('/rotors/position', isAuthenticated, function(req, res) {
    //Set the elevation and azimuth information available on the HTTP request
    log("Moving rotors: " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    rotors.setPosition(req.body, function(data) {
        res.json(data);
    })

});

// SATELLITE STUFF
var scheduledPasses = []

app.get('/satellites', isAuthenticated, function(req, res) {
    db.getSatellites(function(satelliteData) {
        res.json(satelliteData)
    })
});

app.get('/satellites/scheduled', function(req, res) {
    res.json(scheduledPasses.map(function(e) {
        return {
            info: e.info,
            satellite: e.satellite
        }
    }))
});

app.get('/satellites/passes', isAuthenticated, function(req, res) {
    var sat = req.query.satellite;
    log("Calculating passes for: " + sat + " for next " + config.propagator_calculator_days + " days as " + req.user.USR_NAME)
    new Propagator(sat, config.ground_station_lng, config.ground_station_lat, config.ground_station_alt, db).then(function(p) {
        var now = new Date()
        var next = new Date(now.getTime() + (1000 * 60 * 60 * 24 * config.propagator_calculator_days));
        res.json(p.getPasses(now, next))
    });
});

app.post('/satellites/passes', isAuthenticated, function(req, res) {
    var data = req.body;
    var pass = data.pass
    var freq = data.satellite.RMT_RX_FREQ
    var passName = data.satellite.RMT_NAME.replace(/[^a-zA-Z0-9]/g, "") + "_" + dateFormat(new Date(), "dd-mm-yy-HH-mm")

    log("SCHEDULING pass for: " + data.satellite.RMT_NAME +
        "\n\t Date: " + pass.startDateUTC +
        "\n\t Duration: " + pass.duration / 1000 + " s" +
        "\n\t Frequency: " + freq + " Hz" +
        "\n\t File: " + passName + ".wav");

    new Propagator(data.satellite.RMT_NAME, config.ground_station_lng, config.ground_station_lat, config.ground_station_alt, db).then(function(propagator) {
        var passScheduled = {
            pass_id: passName,
            satellite: data.satellite.RMT_NAME,
            info: pass,
            handler_id: setTimeout(function() {
                log("STARTING pass for: " + data.satellite.RMT_NAME +
                    "\n\t Date: " + pass.startDateUTC +
                    "\n\t Duration: " + pass.duration / 1000 + " s" +
                    "\n\t Frequency: " + freq + " Hz" +
                    "\n\t File: " + passName + ".wav");

                exec("arecord -f cd -d " + (pass.duration / 1000) + " " + passName + ".wav", function(error, stdout, stderr) {
                        if (error) {
                            log(error + stdout + stderr, 'error');
                        } else {
                            log("Pass recording done. Processing the audio file: " + passName);
                            exec("sox " + passName + ".wav " + passName + "mod.wav rate 20800 channels 1", function(error, stdout, stderr) {
                                if (error) {
                                    log(error + stdout + stderr, 'error');
                                } else {
                                    // python GranaSatDashboard/utils/NOAAAPTDecoder.py a.wav out.png
                                    log("Audio conversion done. Processing the image: " + passName)
                                    exec("python GranaSatDashboard/utils/NOAAAPTDecoder.py " + passName + "mod.wav " + passName + ".png", function() {
                                        log("NOAA Decoding completed: " + passName)
                                    })
                                }
                            })
                        }
                    })
                    // exec("arecord -f cd -d " + (pass.duration / 1000) + " | sox -t raw -e signed -c 1 -b 16 -r 11025 - " + passName + ".wav")


                var passInterval = setInterval(function() {
                    var p = propagator.getStatusNow()

                    if (!p.error) {
                        //Move antennas
                        rotors.setPosition(p, function(ans) {
                            if (!ans.error) {
                                log("DOING pass for " + data.satellite.RMT_NAME + ": moving to AZ: " + p.azi + " EL: " + p.ele);
                            }
                        })

                        //Set freq
                        radioStation.setFrequency({
                            VFOA: freq * p.dopplerFactor
                        }, function(ans) {
                            if (!ans.error) {
                                log("DOING pass for " + data.satellite.RMT_NAME + ": setting freq to " + freq * p.dopplerFactor + " [" + freq + "]");
                            }
                        })
                    } else {
                        log(p.error, "error")
                    }


                }, config.auto_pass_refresh_rate)


                setTimeout(function() {
                    clearInterval(passInterval);
                    
                    log("ENDING pass for: " + data.satellite.RMT_NAME +
                        "\n\t Date: " + pass.startDateUTC +
                        "\n\t Duration: " + pass.duration / 1000 + " s" +
                        "\n\t Frequency: " + freq + " Hz" +
                        "\n\t File: " + passName + ".wav");
                }, pass.duration /*Pass duration*/ )


            }, new Date(pass.startDateUTC) - new Date() /*Time to pass start*/ )
        }

        //Saving to the list
        scheduledPasses.push(passScheduled)
    });

    res.json({
        status: "OK"
    })

});

app.get('/', function(req, res, next) {
    res.sendFile(path.join(__dirname + '/static/index.html'));
});

app.listen(config.web_port, config.web_host);
log("Web server listening: " + config.web_host + ":" + config.web_port);
