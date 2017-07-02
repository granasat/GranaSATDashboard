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

//Test Database connection
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(__dirname + "/test_database.db");

module.exports = function DashboardDB() {
    var loginConfig = {
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true,
    }

    function login(req, username, password, done) {
        log("Trying to login: " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "warn");

        db.get('SELECT * FROM USERS WHERE USR_NAME = ?', username, function(err, user) {
            if (hashPassword(password, user.USR_PASSWORD.split(":")[0]) == user.USR_PASSWORD.split(":")[1]) {
                log("Logged " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));
                return done(null, user);
            } else {
                log("Non valid password for " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "error");
                return done(null, false);
            }
        })
    }

    function deserializeUser(id, done) {
        db.get('SELECT * FROM USERS WHERE USR_ID = ?', id, function(err, user) {
            if (!user) return done(null, false);
            return done(null, user);
        });
    }

    function getSatellites(cb) {
        db.all('SELECT T1.*,T2.SAT_TLE1,T2.SAT_TLE2,T2.SAT_TLE_URL FROM REMOTE_TRANSCEIVERS AS T1, SATELLITES AS T2 WHERE RMT_ID = SAT_ID', function(err, rows, fields) {
            if (err) {
                log(err.toString(), "error");
                cb({
                    error: "Database error"
                });

            } else {
                cb(rows);
            };
        });
    }

    function addRemoteTransceiversDB(data, cb){
        db.run('INSERT INTO REMOTE_TRANSCEIVERS VALUES (NULL, $name, $desc, $rx, $tx, $status)', {
            $name : data.satname,
            $desc : data.description,
            $rx : data.rx_freq,
            $tx : data.tx_freq,
            $status : data.status
        }, function (result) {
            cb({
                result : result
            })
        });
    }

    function addSatelliteDB(data, cb){
        db.run('INSERT INTO SATELLITES VALUES (NULL, $tle1, $tle2, $url)', {
            $tle1 : data.tle1,
            $tle2 : data.tle2,
            $url : data.url
        }, function (result) {
            cb({
                result : result
            })
        });
    }

    /**
     * Add satellite to db
     *
     * @param {Object} req
     * @param {string} req.body.satname
     * @param {string} req.body.description
     * @param {number} req.body.rx_freq
     * @param {number} req.body.tx_freq
     * @param {string} req.body.status
     * @param {string} req.body.tle1
     * @param {string} req.body.tle2
     * @param {string} req.body.url
     */
    function addSatellite(req, res) {
        //req.checkBody('satname', 'Satellite name is required').notEmpty().isAlpha();
        //req.checkBody('tle', 'TLE is required').notEmpty();

        addSatelliteDB(req.body, function (result) {
            if (result.result == null) {
                addRemoteTransceiversDB(req.body, function (result) {
                    if (result.result == null) {
                        res({
                            status: "Done"
                        });
                    }
                    else {
                        log(result.result, "error");
                        res({
                            error: "Database error"
                        });
                    }
                });
            }
            else {
                log(result.result, "error");
                res({
                    error: "Database error"
                });
            }
        });
    }



    function modRemoteTransceiversDB(data, cb){
        db.run('UPDATE REMOTE_TRANSCEIVERS SET RMT_NAME = $name, RMT_DESC = $desc, RMT_RX_FREQ = $rx, RMT_TX_FREQ = $tx, RMT_STATUS = $status WHERE RMT_ID = $id', {
            $id : data.id,
            $name : data.satname,
            $desc : data.description,
            $rx : data.rx_freq,
            $tx : data.tx_freq,
            $status : data.status
        }, function (result) {
            cb({
                result : result
            })
        });
    }

    function modSatelliteDB(data, cb){
        db.run('UPDATE SATELLITES SET SAT_TLE1 = $tle1, SAT_TLE2 = $tle2, SAT_TLE_URL = $url WHERE SAT_ID = $id', {
            $id : data.id,
            $tle1 : data.tle1,
            $tle2 : data.tle2,
            $url : data.url
        }, function (result) {
            cb({
                result : result
            })
        });
    }

    function modSatellite(req, res){
        //req.checkBody('satname', 'Satellite name is required').notEmpty().isAlpha();
        //req.checkBody('tle', 'TLE is required').notEmpty();

        modSatelliteDB(req.body, function (result) {
            if (result.result == null) {
                modRemoteTransceiversDB(req.body, function (result) {
                    if (result.result == null) {
                        res({
                            status: "Done"
                        });
                    }
                    else {
                        log(result.result, "error");
                        res({
                            error: "Database error"
                        });
                    }
                });
            }
            else {
                log(result.result, "error");
                res({
                    error: "Database error"
                });
            }
        });
    }

    function getSatelliteTLE(sat, cb) {
        db.all('SELECT SAT_TLE1, SAT_TLE2 FROM SATELLITES WHERE SAT_ID = (SELECT RMT_ID FROM REMOTE_TRANSCEIVERS WHERE RMT_NAME = ?)', sat, function(err, rows, fields) {
            if (err || rows.length != 1) {
                log(err, "error");
                cb({
                    error: "Database error"
                });

            } else {
                cb(rows[0]);
            };
        });
    }

    return {
        loginConfig: loginConfig,
        login: login,
        deserializeUser: deserializeUser,
        getSatellites: getSatellites,
        modSatellite : modSatellite,
        getSatelliteTLE: getSatelliteTLE
    }
}
