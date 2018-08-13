"use strict";

//Utils
var config = require('../config.json');
var crypto = require('crypto');


//Log
var log = require('../utils/logger.js').Logger;



//PASSPORTJS AND AUTH
function hashPassword(password, salt) {
    var hash = crypto.createHash('sha256');
    hash.update(password);
    hash.update(salt);
    return hash.digest('hex');
}

function createSalt() {
    var len = 30;
    return crypto.randomBytes(Math.ceil(len * 3 / 4))
        .toString('base64') // convert to base64 format
        .slice(0, len) // return required number of characters
        .replace(/\+/g, '0') // replace '+' with '0'
        .replace(/\//g, '0'); // replace '/' with '0'
}

//Database connection
var mysql = require('mysql');
var database = mysql.createConnection({
    host: 'localhost',
    user: config.database_user,
    password: config.database_password,
    database: 'dashboard'
});

module.exports = function DashboardDB() {
    var loginConfig = {
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true,
    };

    function login(req, username, password, done) {
        log("Trying to login: " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "warn");
        database.query('select * from USERS where USR_NAME = ?', username, function(err, rows) {
            if (err) {
                log(err.toString(), "error");
                return done(null, false);
            }
            if (rows.length != 0) {
                var user = rows[0];

                if (user.USR_BLOCKED == false && user.USR_VERIFIED == 1) {
                    var hash = hashPassword(password, user.USR_PASSWORD.split(":")[0]);
                    if (hash == user.USR_PASSWORD.split(":")[1]) {
                        log("Logged " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));
                        database.query('UPDATE USERS SET USR_LAST_VST = NOW() WHERE USR_NAME = ?', username, function(err, rows) {
                            if (err) {
                                log(err.toString(), "error");
                                return done(null, false);
                            }
                            done(null, user);
                        });
                    } else {
                        log("Non valid password for " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "error");
                        return done(null, false);
                    }
                } else {
                    log("Blocked or not verified user: " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "error");
                    return done(null, false);
                }
            } else {
                log("Non valid username: " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "error");
                return done(null, false);
            }
        });
    }

    function signup(req, res) {
        //req.checkBody('username', 'Name is required').notEmpty().isAlpha().len(6, 20);
        //req.checkBody('organization', 'Organization is required').notEmpty().isAlpha();
        //req.checkBody('email', 'A valid email is required').notEmpty().isEmail();
        //req.checkBody('password', 'A valid password is required').notEmpty().len(6, 8);
        //req.checkBody('password2', 'Passwords do not match').equals(req.body.password);
        //req.checkBody('usertype', 'A valid type is required').notEmpty().isInt();

        var salt = createSalt();


        var post = [
            [
                req.username,
                req.organization,
                req.mail,
                salt + ":" + hashPassword(req.password, salt),
                3,
                config.user_image_default,
                0

            ]
        ];

        database.query('INSERT INTO USERS (USR_NAME,USR_ORGANIZATION,USR_MAIL,USR_PASSWORD,USR_TYPE, USR_IMG, USR_VERIFIED) VALUES ?', [post], function(err) {
            if (err) {
                log(err.toString(), "error");
                res({
                    error: err
                })
            } else {
                res({
                    status: "Done"
                })
            }
        });
    }

    function modUser(req, res) {

        if (req.USR_PASSWORD == null) { //No modify password.

            //req.checkBody('username', 'Name is required').notEmpty().isAlpha().len(6, 20);
            //req.checkBody('organization', 'Organization is required').notEmpty().isAlpha();
            //req.checkBody('email', 'A valid email is required').notEmpty().isEmail();
            //req.checkBody('usertype', 'A valid type is required').notEmpty().isInt();

            var post = [
                req.USR_NAME,
                req.USR_ORGANIZATION,
                req.USR_MAIL,
                req.USR_TYPE,
                req.USR_BLOCKED,
                req.USR_IMG,
                req.USR_ID
            ];

            database.query('UPDATE USERS SET USR_NAME = ?, USR_ORGANIZATION = ?, USR_MAIL = ?, USR_TYPE = ?, USR_BLOCKED = ?, USR_IMG = ? WHERE USR_ID = ?', post, function(err) {
                if (err) {
                    log(err.toString(), "error");
                    res({
                        error: "Database error"
                    })
                } else {
                    res({
                        status: "Done"
                    })
                }
            });


    }  else {

            //req.checkBody('username', 'Name is required').notEmpty().isAlpha().len(6, 20);
            //req.checkBody('organization', 'Organization is required').notEmpty().isAlpha();
            //req.checkBody('email', 'A valid email is required').notEmpty().isEmail();
            //req.checkBody('password', 'A valid password is required').notEmpty().len(6, 8);
            //req.checkBody('password2', 'Passwords do not match').equals(req.body.password);
            //req.checkBody('usertype', 'A valid type is required').notEmpty().isInt();

            var salt = createSalt();

                var post = [
                    req.USR_NAME,
                    req.USR_ORGANIZATION,
                    req.USR_MAIL,
                    salt + ":" + hashPassword(req.USR_PASSWORD, salt),
                    req.USR_TYPE,
                    req.USR_BLOCKED,
                    req.USR_IMG,
                    req.USR_ID

                ];


            database.query('UPDATE USERS SET USR_NAME = ?, USR_ORGANIZATION = ?, USR_MAIL = ?, USR_PASSWORD = ?, USR_TYPE = ?, USR_BLOCKED = ?, USR_IMG = ? WHERE USR_ID = ?', post, function(err) {
                if (err) {
                    log(err.toString(), "error");
                    res({
                        error: "Database error"
                    })
                } else {

                    res({
                        status: "Done"
                    })
                }
            });
        }
    }



    function modToken(req,res) {

        var post = [
            req.USR_TOKEN,
            req.USR_ID
        ];


        database.query('UPDATE USERS SET USR_TOKEN = ? WHERE USR_ID = ?', post,  function(err) {
            if (err) {
                log(err.toString(), "error");
                res({
                    error: "Database error"
                })
            } else {
                res({
                    status: "Done"
                })
            }
        });
    }



    function verifyUser(req,res) {

        var post = [
            1,
            req.USR_ID,
        ];

        database.query('UPDATE USERS SET USR_VERIFIED = ? WHERE USR_ID = ?', post, function(err) {
            if (err) {
                log(err.toString(), "error");
                res({
                    error: "Database error"
                })
            } else {
                res({
                    status: "Done"
                })
            }
        });


    };


    function delUser(req, res) {
        req.checkBody('id', 'User ID').notEmpty().isInt();

        database.query('DELETE FROM USERS WHERE USR_ID = ?', [req.body.USR_ID], function(err) {
            if (err) {
                log(err.toString(), "error");
                res({
                    error: "Database error"
                })
            } else {
                res({
                    status: "Done"
                })
            }
        });
    }

    function getUsers(cb){
        database.query('SELECT USR_ID, USR_NAME, USR_ORGANIZATION, USR_MAIL, USR_TYPE, USR_LAST_VST, USR_BLOCKED, USR_VERIFIED, USR_TOKEN, USR_IMG FROM USERS', function(err, rows) {
            if(err){
                log(err.toString(), "error");
                cb({
                    error: "Database error"
                })
            }
            else{
                cb(rows);
            }
        });
    }

    function getUser(req, res){
        database.query('SELECT USR_ID, USR_NAME, USR_ORGANIZATION, USR_MAIL, USR_TYPE, USR_LAST_VST, USR_BLOCKED, USR_VERIFIED, USR_TOKEN, USR_IMG FROM USERS WHERE USR_NAME = ?', req, function(err, data) {
            if (!err) {
                res(data);
            }
            else{
                res({
                    error: "Database error"
                })
            }
        });
    }


    function getVHFRepeaters(cb){
        database.query('SELECT FREQ,SUBTONE,DUPLEX,NAME,LOCATOR,INDICATIVE,OBSERVATION FROM REPEATERS_VHF', function(err, rows) {
                if(err){
                    log(err.toString(), "error");
                    cb({
                        error: "Database error"
                    })
                }
                else{
                    cb(rows);
                }
            });
    }

    function addVHFRepeater(data, cb){

        var post = [
            [
            data.FREQ,
            data.DUPLEX,
            data.SUBTONE,
            data.LOCATOR,
            data.NAME,
            data.OBSERVATION,
            data.INDICATIVE
            ]
        ];

        database.query('INSERT INTO REPEATERS_VHF (FREQ, DUPLEX, SUBTONE, LOCATOR, NAME, OBSERVATION, INDICATIVE) VALUES ?', [post], function(err) {
            if (err) {
                log(err.toString(), "error");
                cb({
                    error: err
                })
            } else {
                cb({
                    status: "Done"
                })
            }
        });
    }

    function getUHFRepeaters(cb){
        database.query('SELECT FREQ,SUBTONE,DUPLEX,NAME,LOCATOR,INDICATIVE,OBSERVATION FROM REPEATERS_UHF', function(err, rows) {
            if(err){
                log(err.toString(), "error");
                cb({
                    error: "Database error"
                })
            }
            else{
                cb(rows);
            }
        });
    }

    function addUHFRepeater(data, cb){
        var post = [
            [
                data.FREQ,
                data.DUPLEX,
                data.SUBTONE,
                data.LOCATOR,
                data.NAME,
                data.OBSERVATION,
                data.INDICATIVE
            ]
        ];

        database.query('INSERT INTO REPEATERS_UHF (FREQ, DUPLEX, SUBTONE, LOCATOR, NAME, OBSERVATION, INDICATIVE) VALUES ?', [post], function(err) {
            if (err) {
                log(err.toString(), "error");
                cb({
                    error: err
                })
            } else {
                cb({
                    status: "Done"
                })
            }
        });
    }


    function deserializeUser(id, done) {
        database.query('SELECT * FROM USERS WHERE USR_ID = ?', id, function(err, rows) {
            if (rows.length == 0) return done(null, false);
            return done(null, rows[0]);
        });
    }

    function addSatellite(req, res) {
        req.checkBody('satname', 'Satellite name is required').notEmpty().isAlpha();
        req.checkBody('tle', 'TLE is required').notEmpty();

        var error = false;

        var post = [
            [
                req.body.SAT_CAT,
                req.body.SAT_NAME,
                req.body.SAT_DESC,
                req.body.SAT_TLE1,
                req.body.SAT_TLE2,
                req.body.SAT_TLE_URL,
                (new Date()).toString()
            ]
        ];
//INSERT INTO REMOTE_TRANSCEIVERS (RMT_CAT, RMT_STATUS, RMT_DESC, RMT_MODE, RMT_BAUD, RMT_UPLINK_LOW, RMT_UPLINK_HIGH, RMT_DOWNLINK_LOW, RMT_DOWNLINK_HIGH) VALUES ?
        database.query('INSERT INTO SATELLITES (SAT_CAT, SAT_NAME, SAT_DESC, SAT_TLE1,SAT_TLE2,SAT_TLE_URL,SAT_TLE_DATE) VALUES ?', [post], function(err) {
            if (!err) {
                req.body.rmt.forEach(function (rmt, index, array) {
                    var post2 = [
                        [
                            req.body.SAT_CAT,
                            rmt.RMT_STATUS,
                            rmt.RMT_DESC,
                            rmt.RMT_MODE,
                            rmt.RMT_BAUD,
                            rmt.RMT_UPLINK_LOW,
                            rmt.RMT_UPLINK_HIGH,
                            rmt.RMT_DOWNLINK_LOW,
                            rmt.RMT_DOWNLINK_HIGH
                        ]
                    ];
                    database.query('INSERT INTO REMOTE_TRANSCEIVERS (RMT_CAT, RMT_STATUS, RMT_DESC, RMT_MODE, RMT_BAUD, RMT_UPLINK_LOW, RMT_UPLINK_HIGH, RMT_DOWNLINK_LOW, RMT_DOWNLINK_HIGH) VALUES ?', [post2], function(err) {
                        if (err) {
                            log(err.toString(), "error");
                            error = true;
                        }

                        if(index === array.length - 1){
                            if(error){
                                res({
                                    error: "Database error"
                                });
                            }
                            else{
                                res({
                                    status: "Done"
                                });
                            }
                        }
                    });
                });
            } else {
                log(err.toString(), "error");
                res({
                    error: "Database error"
                })
            }
        });
    }

    function modSatellite(req, res) {
        req.checkBody('satname', 'Satellite name is required').notEmpty().isAlpha();
        req.checkBody('tle', 'TLE is required').notEmpty();

        var error = false;

        var post = [
            req.body.SAT_CAT,
            req.body.SAT_NAME,
            req.body.SAT_DESC,
            req.body.SAT_TLE1,
            req.body.SAT_TLE2,
            req.body.SAT_TLE_URL,
            (new Date()).toString(),
            req.body.id
        ];

        database.query('UPDATE SATELLITES SET SAT_CAT = ?, SAT_NAME = ?, SAT_DESC = ?, SAT_TLE1 = ?, SAT_TLE2 = ?, SAT_TLE_URL = ?, SAT_TLE_DATE = ? WHERE SAT_ID = ?', post, function(err) {
            if (!err) {
                req.body.rmt.forEach(function (rmt, index, array) {
                    var post2 = [
                        req.body.RMT_CAT,
                        req.body.RMT_STATUS,
                        req.body.RMT_DESC,
                        req.body.RMT_MODE,
                        req.body.RMT_BAUD,
                        req.body.RMT_UPLINK_LOW,
                        req.body.RMT_UPLINK_HIGH,
                        req.body.RMT_DOWNLINK_LOW,
                        req.body.RMT_DOWNLINK_HIGH,
                        req.body.RMT_ID
                    ];

                    database.query('UPDATE REMOTE_TRANSCEIVERS SET RMT_CAT = ?, RMT_STATUS = ?, RMT_DESC= ?, RMT_MODE= ?, RMT_BAUD= ?, RMT_UPLINK_LOW= ?, RMT_UPLINK_HIGH= ?, RMT_DOWNLINK_LOW= ?, RMT_DOWNLINK_HIGH= ? WHERE RMT_ID = ?', post2, function(err) {
                        if (err) {
                            log(err.toString(), "error");

                            error = true;
                        }

                        if(index === array.length - 1){
                            if(error){
                                res({
                                    error : "Database error"
                                });
                            }
                            else{
                                res({
                                    status : "Done"
                                });
                            }
                        }
                    });
                });
            } else {
                log(err.toString(), "error");
                res({
                    error: "Database error"
                })
            }
        });
    }


    function updateSatelliteTLE(data, cb) {

        var post = [
            data.SAT_TLE1,
            data.SAT_TLE2,
            (new Date()).toString(),
            data.SAT_NAME
        ];

        database.query('UPDATE SATELLITES SET SAT_TLE1 = ?, SAT_TLE2 = ?, SAT_TLE_DATE = ? WHERE SAT_NAME = ?', post,  function(err) {
            if (err) {
                log(err.toString(), "error");
                cb({
                    error: "Database error"
                })
            } else {
                cb({
                    status: "Done"
                })
            }
        });
    }

    function delSatellite(req, res) {
        req.checkBody('rmt_id', 'Remote Transceiver ID').notEmpty().isInt();

        database.query('DELETE FROM REMOTE_TRANSCEIVERS WHERE RMT_CAT = ?', req.body.SAT_CAT, function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                });
            } else {
                database.query('DELETE FROM SATELLITES WHERE SAT_CAT = ?', req.body.SAT_CAT, function(err){
                    if(err){
                        log(err.toString(), "error");
                        res({
                            error: "Database error"
                        });
                    }
                    else{
                        res({
                            status: "Done"
                        });
                    }
                });
            }
        });
    }

    function getSatellites(cb) {
        var error = false;

        database.query('SELECT * FROM SATELLITES', function(err, rows, fields) {
            if (err) {
                log(err.toString(), "error");
                cb({
                    error: "Database error"
                });

            } else {
                rows.forEach(function (sat, index, array) {
                    database.query('SELECT * FROM REMOTE_TRANSCEIVERS WHERE RMT_CAT = ?', [sat.SAT_CAT], function(err, rmts, fields) {
                        if(err){
                            error = true;

                            log(err.toString(), "error");
                        } else{
                            sat.rmt = rmts;
                        }

                        if(index === array.length - 1){
                            if(error){
                                cb({
                                    error: "Database error"
                                });
                            }
                            else{
                                cb(rows);
                            }
                        }
                    });
                });
            }
        });
    }

    function getRemoteTransceivers(cb){
        database.query('SELECT * FROM REMOTE_TRANSCEIVERS', function(err, rows, fields) {
            if (err) {
                log(err.toString(), "error");
                cb({
                    error: "Database error"
                });

            } else {
                cb(rows);
            }
        });
    }

    return {
        loginConfig: loginConfig,
        login: login,
        signup: signup,
        modUser: modUser,
        modToken : modToken,
        verifyUser : verifyUser,
        getUHFRepeaters : getUHFRepeaters,
        getVHFRepeaters : getVHFRepeaters,
        addVHFRepeater : addVHFRepeater,
        addUHFRepeater : addUHFRepeater,
        delUser: delUser,
        getUsers: getUsers,
        getUser: getUser,
        deserializeUser: deserializeUser,
        addSatellite: addSatellite,
        modSatellite: modSatellite,
        delSatellite: delSatellite,
        getSatellites: getSatellites,
        getRemoteTransceivers : getRemoteTransceivers,
        updateSatelliteTLE : updateSatelliteTLE
    };
}
