"use strict"

//Utils
var config = require('../config.js').config
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
    }

    function login(req, username, password, done) {
        log("Trying to login: " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "warn");
        database.query('select * from USERS where USR_NAME = ?', username, function(err, rows) {
            if (err) {
                log(err.toString(), "error");
                return done(null, false);
            }
            if (rows.length != 0) {
                var user = rows[0];
                if (user.USR_BLOCKED == false) {
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
                    log("Blocked user: " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "error");
                    return done(null, false);
                }
            } else {
                log("Non valid username: " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "error");
                return done(null, false);
            }
        });
    };

    function signup(req, res) {
        req.checkBody('username', 'Name is required').notEmpty().isAlpha().len(6, 20);
        req.checkBody('organization', 'Organization is required').notEmpty().isAlpha();
        req.checkBody('email', 'A valid email is required').notEmpty().isEmail();
        req.checkBody('password', 'A valid password is required').notEmpty().len(6, 8);
        req.checkBody('password2', 'Passwords do not match').equals(req.body.password);
        req.checkBody('usertype', 'A valid type is required').notEmpty().isInt();

        var salt = createSalt();

        var post = [
            [
                req.body.username,
                req.body.organization,
                req.body.mail,
                salt + ":" + hashPassword(req.body.password, salt),
                req.body.usertype
            ]
        ];

        database.query('INSERT INTO USERS (USR_NAME,USR_ORGANIZATION,USR_MAIL,USR_PASSWORD,USR_TYPE) VALUES ?', [post], function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                })
            } else {
                res.json({
                    status: "Done"
                })
            }
        });
    };

    function modUser(req, res) {

        if (req.body.password == null) { //No modify password.

            req.checkBody('username', 'Name is required').notEmpty().isAlpha().len(6, 20);
            req.checkBody('organization', 'Organization is required').notEmpty().isAlpha();
            req.checkBody('email', 'A valid email is required').notEmpty().isEmail();
            req.checkBody('usertype', 'A valid type is required').notEmpty().isInt();

            var post = [
                [
                    req.body.username,
                    req.body.organization,
                    req.body.mail,
                    req.body.usertype,
                    req.body.user_id
                ]
            ];

<<<<<<< HEAD
            database.query('UPDATE USERS SET USR_NAME = ?, USR_ORGANIZATION = ?, USR_MAIL = ?, USR_TYPE = ? WHERE USR_ID = ?', [post], function(err) {
=======
            database.query('UPDATE USERS SET USR_NAME = ?, USER_ORGANIZATION = ?, USER_MAIL = ?, USER_TYPE = ? WHERE USER_ID = ?', [post], function(err) {
>>>>>>> refs/remotes/origin/master
                if (err) {
                    log(err.toString(), "error");
                    res.json({
                        error: "Database error"
                    })
                } else {
                    res.json({
                        status: "Done"
                    })
                }
            });

        } else {

            req.checkBody('username', 'Name is required').notEmpty().isAlpha().len(6, 20);
            req.checkBody('organization', 'Organization is required').notEmpty().isAlpha();
            req.checkBody('email', 'A valid email is required').notEmpty().isEmail();
            req.checkBody('password', 'A valid password is required').notEmpty().len(6, 8);
            req.checkBody('password2', 'Passwords do not match').equals(req.body.password);
            req.checkBody('usertype', 'A valid type is required').notEmpty().isInt();

            var salt = createSalt();

            var post = [
                [
                    req.body.username,
                    req.body.organization,
                    req.body.mail,
                    salt + ":" + hashPassword(req.body.password, salt),
                    req.body.usertype,
                    req.body.user_id
                ]
            ];

<<<<<<< HEAD
            database.query('UPDATE USERS SET USR_NAME = ?, USR_ORGANIZATION = ?, USR_MAIL = ?, USR_PASSWORD = ?, USR_TYPE = ? WHERE USR_ID = ?', [post], function(err) {
=======
            database.query('UPDATE USERS SET USR_NAME = ?, USER_ORGANIZATION = ?, USER_MAIL = ?, USER_PASSWORD = ?, USER_TYPE = ? WHERE USER_ID = ?', [post], function(err) {
>>>>>>> refs/remotes/origin/master
                if (err) {
                    log(err.toString(), "error");
                    res.json({
                        error: "Database error"
                    })
                } else {
                    res.json({
                        status: "Done"
                    })
                }
            });
        }
    };

    function delUser(req, res) {
        req.checkBody('user_id', 'User ID').notEmpty().isInt();

        database.query('DELETE FROM USERS WHERE USR_ID = ?', req.body.user_id, function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                })
            } else {
                res.json({
                    status: "Done"
                })
            }
        });
    };

    function deserializeUser(id, done) {
        database.query('select * from USERS where USR_ID = ?', id, function(err, rows) {
            if (rows.length == 0) return done(null, false);
            return done(null, rows[0]);
        });
    }

    function addSatellite(req, res) {
        req.checkBody('satname', 'Satellite name is required').notEmpty().isAlpha();
        req.checkBody('tle', 'TLE is required').notEmpty();

        var post = [
            [
                req.body.satname,
                req.body.description,
                req.body.rx_freq,
                req.body.tx_freq,
                req.body.status
            ]
        ];

        database.query('INSERT INTO REMOTE_TRANSCEIVERS (RMT_NAME,RMT_TLE,RMT_RX_FREQ,RMT_TX_FREQ,RMT_STATUS) VALUES ?', [post], function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                })
            } else {
                database.query('INSERT INTO SATELLITES (SAT_ID,SAT_TLE) VALUES (LAST_INSERT_ID(),?)', req.body.tle, function(err) {
                    if (err) {
                        log(err.toString(), "error");
                        res.json({
                            error: "Database error"
                        })
                    } else {
                        res.json({
                            status: "Done"
                        });
                    }
                });
            }
        });
    };

    function modSatellite(req, res) {
        req.checkBody('satname', 'Satellite name is required').notEmpty().isAlpha();
        req.checkBody('tle', 'TLE is required').notEmpty();

        var post = [
            [
                req.body.satname,
                req.body.tle,
                req.body.rx_freq,
                req.body.tx_freq,
                req.body.sat_id
            ]
        ];

        database.query('UPDATE USERS SET SAT_NAME = ?, SAT_TLE = ?, SAT_RX_FREQ = ?, SAT_TX_FREQ = ? WHERE SAT_ID = ?', [post], function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                })
            } else {
                res.json({
                    status: "Done"
                })
            }
        });
    };

    function updateTLE(req, res) {
        req.checkBody('tle', 'TLE is required').notEmpty();

        var post = [
            [
                req.body.tle,
                req.body.sat_id
            ]
        ];

        database.query('UPDATE USERS SET SAT_TLE = ? WHERE SAT_ID = ?', [post], function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                })
            } else {
                res.json({
                    status: "Done"
                })
            }
        });
    };

    function delSatellite(req, res) {
        req.checkBody('sat_id', 'Satellite ID').notEmpty().isInt();

        database.query('DELETE FROM SATELLITES WHERE SAT_ID = ?', req.body.sat_id, function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                })
            } else {
                res.json({
                    status: "Done"
                })
            }
        });
    };

    function addAntenna(req, res) {
        req.checkBody('antname', 'Antenna name is required').notEmpty().isAlpha();
        req.checkBody('antfreq', 'Antenna frequency is required').notEmpty();

        var post = [
            [
                req.body.antname,
                req.body.antfreq
            ]
        ];

        database.query('INSERT INTO ANTENNAS (ANT_NAME, ANT_FREQ) VALUES ?', [post], function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                })
            } else {
                res.json({
                    status: "Done"
                })
            }
        });
    };

    function modAntenna(req, res) {
        req.checkBody('antname', 'Antenna name is required').notEmpty().isAlpha();
        req.checkBody('antfreq', 'Antenna frequency is required').notEmpty();

        var post = [
            [
                req.body.antname,
                req.body.antfreq,
                req.body.ant_id
            ]
        ];

        database.query('UPDATE ANTENNAS SET ANT_NAME = ?, ANT_FREQ = ? WHERE ANT_ID = ?', [post], function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                })
            } else {
                res.json({
                    status: "Done"
                })
            }
        });
    };

    function delAntenna(req, res) {
        req.checkBody('ant_id', 'Antenna ID').notEmpty().isInt();

        database.query('DELETE FROM ANTENNAS WHERE ANT_ID = ?', req.body.ant_id, function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                })
            } else {
                res.json({
                    status: "Done"
                })
            }
        });
    };

    function addTransceiver(req, res) {
        req.checkBody('traname', 'Transceiver name is required').notEmpty().isAlpha();
        req.checkBody('traport', 'Transceiver port is required').notEmpty();

        var post = [
            [
                req.body.trasname,
                req.body.traport
            ]
        ];

        database.query('INSERT INTO TRANSCEIVERS (TRA_NAME, TRA_PORT) VALUES ?', [post], function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                })
            } else {
                res.json({
                    status: "Done"
                })
            }
        });
    };

    function modTransceiver(req, res) {
        req.checkBody('traname', 'Transceiver name is required').notEmpty().isAlpha();
        req.checkBody('traport', 'Transceiver port is required').notEmpty();

        var post = [
            [
                req.body.trasname,
                req.body.traport,
                req.body.tra_id
            ]
        ];

        database.query('UPDATE ANTENNAS SET TRA_NAME = ?, TRA_PORT = ? WHERE TRA_ID = ?', [post], function(err) {
            if (err) {
                log(err.toString(), "error");
                res.json({
                    error: "Database error"
                })
            } else {
                res.json({
                    status: "Done"
                })
            }
        });
    };

    return {
        loginConfig: loginConfig,
        login: login,
        signup: signup,
        modUser: modUser,
        delUser: delUser,
        deserializeUser: deserializeUser,
        addSatellite: addSatellite,
        modSatellite: modSatellite,
        updateTLE: updateTLE,
        delSatellite: delSatellite,
        addAntenna: addAntenna,
        modAntenna: modAntenna,
        delAntenna: delAntenna,
        addTransceiver: addTransceiver,
        modTransceiver: modTransceiver
    }
};
