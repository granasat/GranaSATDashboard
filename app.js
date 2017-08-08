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
var config = require('./config.js').config;

//Rotors, transceivers and propagator
var Yaesu = require('./rotors/yaesu.js');
var Kenwood = require('./transceivers/kenwoodts2000.js');
var Icom9100 = require('./transceivers/icom9100.js');
var Propagator = require('./propagator/propagator.js');
var satellites = require('./sat_library/final.json');


//Database stuff
// var db = new require("./utils/test_database.js")()
var db = new require("./utils/database.js")()


//Auth stuff
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;


//Where passes will be saved
var passes = [];
refreshPasses();
var refreshPassesInterval = setInterval(refreshPasses, config.propagator_calculator_frequency);

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

function isAdmin(req, res, next){           //Admin is when user.USR_TYPE == 1, can access to everything
    if (req.isAuthenticated() && req.user.USR_TYPE == 1) {
        return next();
    } else {
        res.json({
            status: "No auth",
        })
    }
}

function isMember(req, res, next){          //Member is when user.USR_TYPE == 2, can access everything except manage users and terminal
    if (req.isAuthenticated() && (req.user.USR_TYPE == 2 || req.user.USR_TYPE == 1)) {
        return next();
    } else {
        res.json({
            status: "No auth",
        })
    }
}

function isAuthenticated(req, res, next) {  //Only authenticated (user.USR_TYPE == 3) can access to passes and satellites administration
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

app.post('/login', passport.authenticate('login'), function(req, res) {
    res.json({
        status: "Done",
        type: req.user.USR_TYPE
    })
});

app.post('/signup', function(req, res) {
    db.signup(req.body, function (result) {
        res.json(result);
    })
});

app.get('/logout', isAuthenticated, function(req, res) {
    log("Logging out " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));
    req.logout();
    res.json({
        status: "Done"
    })
});

app.get('/groundstation', function(req, res) {
    res.json({
        name: config.ground_name,
        lat: config.ground_station_lat,
        lng: config.ground_station_lng,
        alt: config.ground_station_alt,
    })
});

app.get('/getUsers', isAdmin, function(req, res){
    log("Picking up user list from " + req.user.USR_NAME + " " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "warn");

    db.getUsers(function (usersData) {
        res.json(usersData);
    });
});

app.post('/modUser', isAdmin, function (req, res) {
   log("Modifying users from: " + req.user.USR_NAME + " " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "warn");

   db.modUser(req, function (result) {
       res.json(result);
   });
});

app.post('/delUser', isAdmin, function (req, res) {
    log("Delete user from: " + req.user.USR_NAME + " " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "warn");

    db.delUser(req, function (result) {
        res.json(result);
    });
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

app.post('/radiostation/freq', isMember, function(req, res) {
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

app.post('/rotors/position', isMember, function(req, res) {
    //Set the elevation and azimuth information available on the HTTP request
    log("Moving rotors: " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    rotors.setPosition(req.body, function(data) {
        res.json(data);
    })

});

// SATELLITE STUFF
var scheduledPasses = [];

app.get('/satellites', isAuthenticated, function(req, res) {
    db.getSatellites(function(satelliteData) {
        res.json(satelliteData)
    })
});

app.get('/updateSatellites', isAuthenticated, function (req, res) {
    log("Updating satellites");
    refreshPasses().then(function () {
        res.json(passes);
    });
});

app.post('/satellites', isAuthenticated, function(req, res) {
    //Set the elevation and azimuth information available on the HTTP request
    log("Adding sat: "  + req.body.satname + " " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    db.addSatellite(req, function (data) {
        res.json(data);
    });
});

app.post('/modSatellites', isAuthenticated, function(req, res) {
    //Set the elevation and azimuth information available on the HTTP request
    log("Mod sat: " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    db.modSatellite(req, function (data) {
        res.json(data);
    });
});

app.post('/delSatellites', isAuthenticated, function(req, res) {
    //Set the elevation and azimuth information available on the HTTP request
    log("Del sat: " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    db.delSatellite(req, function (data) {
        res.json(data);
    });
});

app.get('/satellites/scheduled', function(req, res) {
    res.json(scheduledPasses.map(function(e) {
        return {
            name: e.satellite,
            id: e.id
        }
    }))
});

app.get('/satellites/passes', function(req, res) {
    res.json(passes);
});

app.post('/satellites/passes', isAuthenticated, function(req, res) {
    db.getSatellites(function (satellites) {
        var sat = satellites.find(function (f) {        //Get satellite info from DB
            return f.RMT_NAME === req.body.sat;
        });

        var pass = passes.find(function (satellite) {   //Get passes info from DB
            return satellite.name === sat.RMT_NAME;
        }).pass.find(function (pass) {
            return pass.id === req.body.id;
        });

        var freq = sat.rmt[0].RMT_DOWNLINK_LOW;

        var passName = sat.SAT_NAME.replace(/[^a-zA-Z0-9]/g, "") + "_" + dateFormat(new Date(), "dd-mm-yy-HH-mm")

        log("SCHEDULING pass for: " + sat.RMT_NAME +
            "\n\t Date: " + pass.startDateUTC +
            "\n\t Duration: " + pass.duration / 1000 + " s" +
            "\n\t Frequency: " + freq + " Hz" +
            "\n\t File: " + passName + ".wav");

        new Propagator(sat.RMT_NAME, config.ground_station_lng, config.ground_station_lat, config.ground_station_alt, db).then(function(propagator) {
            var passScheduled = {
                id: req.body.id,
                satellite: sat.RMT_NAME,
                info: pass,
                handler_id: setTimeout(function() {
                    log("STARTING pass for: " + sat.RMT_NAME +
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
                                    log("DOING pass for " + sat.RMT_NAME + ": moving to AZ: " + p.azi + " EL: " + p.ele);
                                }
                            })

                            //Set freq
                            radioStation.setFrequency({
                                VFOA: freq * p.dopplerFactor
                            }, function(ans) {
                                if (!ans.error) {
                                    log("DOING pass for " + sat.RMT_NAME + ": setting freq to " + freq * p.dopplerFactor + " [" + freq + "]");
                                }
                            })
                        } else {
                            log(p.error, "error")
                        }


                    }, config.auto_pass_refresh_rate)


                    setTimeout(function() {
                        clearInterval(passInterval);

                        log("ENDING pass for: " + sat.RMT_NAME +
                            "\n\t Date: " + pass.startDateUTC +
                            "\n\t Duration: " + pass.duration / 1000 + " s" +
                            "\n\t Frequency: " + freq + " Hz" +
                            "\n\t File: " + passName + ".wav");
                    }, pass.duration /*Pass duration */)


                }, new Date(pass.startDateUTC) - new Date() /*Time to pass start */)};
            //Saving to the list
            scheduledPasses.push(passScheduled);
        });
    });
    res.json({
        status: "Done"
    })

});

app.post('/satellites/undoSchedule', isAuthenticated, function(req, res) {
    scheduledPasses = scheduledPasses.filter(function (pass) {
       return pass.id !== req.body.id;
    });

    res.json({
        status: "Done"
    })
});

app.get('/', function(req, res, next) {
    res.sendFile(path.join(__dirname + '/static/index.html'));
});


app.get('/getSatLibrary', isAuthenticated, function(req, res) {
    res.json(satellites);
});


app.listen(config.web_port, config.web_host);
log("Web server listening: " + config.web_host + ":" + config.web_port);


/** Check db and passes, sync the elements. If the user add a satellite to DB
 *  it must be added to passes. The same when the user delete a satellite.
 *
 * @returns {Promise}
 */

function refreshSatellites(){
    return new Promise(function (resolve, reject) {
        db.getSatellites(function (satellites) {
            satellites.forEach(function (sat) {
                //Search if the satellite has been added to passes
                var included = passes.some(function (f) {
                    return f.SAT_CAT === sat.SAT_CAT;
                });

                if (!included) {          //Add a new satellite to passes
                    log("Adding " + sat.SAT_NAME + " to passes", "warn");
                    passes.push(sat);
                }
            });

            //Delete satellites in passes if they have been deleted from db
            passes.forEach(function (satellitePasses) {
                //Search if the satellite is in satellites
                var included = satellites.some(function (f) {
                    return f.SAT_CAT === satellitePasses.SAT_CAT;
                });

                if (!included) {          //Delete satellite from passes
                    log("Deleting " + satellitePasses.SAT_NAME + " from passes", "warn");

                    passes = passes.filter(function (el) {
                        return el.SAT_CAT !== satellitePasses.SAT_CAT;
                    });
                }
            });

            //Refresh info of the satellites and transceivers
            passes.forEach(function (sat) {
                var satDB = satellites.find(function (satdb) {
                    return satdb.SAT_CAT === sat.SAT_CAT;
                });

                if(satDB) {
                    sat.SAT_CAT = satDB.SAT_CAT;
                    sat.SAT_NAME = satDB.SAT_NAME;
                    sat.SAT_DESC = satDB.SAT_DESC;
                    sat.SAT_TLE1 = satDB.SAT_TLE1;
                    sat.SAT_TLE2 = satDB.SAT_TLE2;
                    sat.SAT_TLE_URL = satDB.SAT_TLE_URL;
                    sat.rmt = satDB.rmt;
                }
            });

            resolve();
        });
    });
}


/**
 * Refresh and calculate passes from satellites in DB
 * @returns {Promise} - Function's promise
 */
function refreshPasses(){
    return new Promise(function (resolve, reject) {
        refreshSatellites().then(function () {
            var start = new Date();
            var end = new Date(start.getTime() + (1000 * 60 * 60 * 24 * config.propagator_calculator_days));
            var promises = [];

            log("Calculating passes from " + start + " to " + end, "warn");
            passes.forEach(function (sat) {
                promises.push(fetchPasses(sat));
            });

            Promise.all(promises).then(function () {
                resolve();
            });

        });
    });
}

/**
 * Calculate passes of a satellite for the next config.propagator_calculator_days days and added to passes
 */

function fetchPasses(sat){
    return new Promise(function (resolve, reject) {
        var start = new Date();
        var end = new Date(start.getTime() + (1000 * 60 * 60 * 24 * config.propagator_calculator_days));

        new Propagator(sat.SAT_TLE1, sat.SAT_TLE2, sat.SAT_NAME, config.ground_station_lng, config.ground_station_lat, config.ground_station_alt).then(function (p) {
            if(sat.pass){           //There is a previous propagator, we have to compare them
                var nextPasses = p.getPasses(start, end);
                nextPasses.forEach(function (elem, index, array) {
                    var findPass = sat.pass.find(function (pass) {                  //If it is a new pass it can't be found
                        return Math.abs(pass.endDateLocal.getTime() - elem.endDateLocal.getTime()) < config.propagator_error;
                    });

                    if(findPass) {
                        elem.id = findPass.id;
                    }

                    if(index === array.length - 1) {
                        sat.pass = nextPasses;
                        resolve();
                    }
                });
            }
            else{
                sat.pass = p.getPasses(start, end);
                resolve();
            }
        });
    });
}