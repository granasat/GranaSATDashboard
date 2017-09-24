"use strict"

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
            if(user == null){
                return done(null, false, { message: 'Incorrect username.'});
            }
            else{
                if (hashPassword(password, user.USR_PASSWORD.split(":")[0]) == user.USR_PASSWORD.split(":")[1]) {
                    log("Logged " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));
                    return done(null, user);
                } else {
                    log("Non valid password for " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "error");
                    return done(null, false);
                }
            }
        })
    }

    function deserializeUser(id, done) {
        db.get('SELECT * FROM USERS WHERE USR_ID = ?', id, function(err, user) {
            if (!user) return done(null, false);
            return done(null, user);
        });
    }

    function signup(req, res) {
        //req.checkBody('username', 'Name is required').notEmpty().isAlpha().len(6, 20);
        //req.checkBody('organization', 'Organization is required').notEmpty().isAlpha();
        //req.checkBody('email', 'A valid email is required').notEmpty().isEmail();
        //req.checkBody('password', 'A valid password is required').notEmpty().len(6, 8);
        //req.checkBody('usertype', 'A valid type is required').notEmpty().isInt();

        var salt = createSalt();

        db.run('INSERT INTO USERS (USR_NAME,USR_ORGANIZATION,USR_MAIL,USR_PASSWORD,USR_TYPE) VALUES ($username, $org, $mail, $password, $type)', {
            $username : req.username,
            $password : salt + ":" + hashPassword(req.password, salt),
            $org : req.org,
            $mail : req.mail,
            $type: 3
        }, function (result) {
            if (result == null) {
                res({
                    status: "Done"
                });
            }
            else {
                log(result, "error");
                res({
                    error: result
                });
            }
        });
    }

    function getUsers(cb){
        db.all('SELECT USR_ID, USR_NAME, USR_ORGANIZATION, USR_MAIL, USR_TYPE, USR_LAST_VST, USR_BLOCKED FROM USERS', function (err, rows) {
            if(err){
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
        db.get('SELECT USR_ID, USR_NAME, USR_ORGANIZATION, USR_MAIL, USR_TYPE, USR_LAST_VST, USR_BLOCKED FROM USERS WHERE USR_NAME = ?', req, function(err, data) {
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

    function modUser(req, res){
        if(req.body.password == null){      //No modify password
            db.run('UPDATE USERS SET USR_NAME = $name, USR_ORGANIZATION = $org, USR_MAIL = $mail, USR_TYPE = $type, USR_BLOCKED = $blocked WHERE USR_ID = $id', {
                $id : req.body.USR_ID,
                $name : req.body.USR_NAME,
                $org : req.body.USR_ORGANIZATION,
                $mail : req.body.USR_MAIL,
                $type : req.body.USR_TYPE,
                $blocked : req.body.USR_BLOCKED
            }, function (result) {
                if(result == null){
                    res({
                        status : "Done"
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
    }

    function delUser(req, res){
        db.run('DELETE FROM USERS WHERE USR_ID = ?', req.body.USR_ID, function (result) {
            if(result == null){
                res({
                    status : "Done"
                });
            }
            else{
                log(result, "error");
                res({
                    error: "Database error"
                });
            }
        });
    }

    function getSatellites(cb){
        var error = false;
        var i = 0;

        db.all('SELECT * FROM SATELLITES', function(err, rows, fields) {
            if (err) {
                log(err.toString(), "error");
                cb({
                    error: "Database error"
                });
            } else {
                rows.forEach(function (sat, index, array) {
                    db.all('SELECT * FROM REMOTE_TRANSCEIVERS WHERE RMT_CAT = ?', sat.SAT_CAT, function (err, rmts, fields) {
                        i++;
                        if (err) {
                            error = true;

                            log(err.toString(), "error");
                        } else {
                            sat.rmt = rmts;
                        }

                        if (i === array.length){
                            if(error){
                                cb({
                                    error: "Database error"
                                });
                            }
                            else{
                                cb(rows);
                            }
                        }
                    })
                });
            }
        });
    }

    function getRemoteTransceivers(cb){
        db.all('SELECT * FROM REMOTE_TRANSCEIVERS', function(err, rows, fields){
            if(err){
                log(err.toString(), "error");
                cb({
                    error: "Database error"
                });
            } else{
                cb(rows);
            }
        })
    }

    function addRemoteTransceiversDB(rmt, cb) {
        db.run('INSERT INTO REMOTE_TRANSCEIVERS (RMT_CAT,RMT_STATUS,RMT_DESC,RMT_MODE,RMT_BAUD,RMT_UPLINK_LOW,RMT_UPLINK_HIGH,RMT_DOWNLINK_LOW,RMT_DOWNLINK_HIGH) VALUES ($cat, $status, $desc, $mode, $baud, $uplink_low, $uplink_high, $downlink_low, $downlink_high)', {
            $cat : rmt.cat,
            $status : rmt.RMT_STATUS,
            $desc : rmt.RMT_DESC,
            $mode : rmt.RMT_MODE,
            $baud : rmt.RMT_BAUD,
            $uplink_low : rmt.RMT_UPLINK_LOW,
            $uplink_high : rmt.RMT_UPLINK_HIGH,
            $downlink_low : rmt.RMT_DOWNLINK_LOW,
            $downlink_high : rmt.RMT_DOWNLINK_HIGH
        }, function (result) {
            cb(result);
        });
    }

    function addSatelliteDB(data, cb){
        db.run('INSERT INTO SATELLITES VALUES (NULL, $cat, $name, $desc, $tle1, $tle2, $url, $date)', {
            $cat : data.SAT_CAT,
            $name : data.SAT_NAME,
            $desc : data.SAT_DESC,
            $tle1 : data.SAT_TLE1,
            $tle2 : data.SAT_TLE2,
            $url : data.SAT_TLE_URL,
            $date : (new Date()).toString()
        }, function (result) {
            cb(result);
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

        var error = false;


        addSatelliteDB(req.body, function (result) {
            if (result == null) {
                req.body.rmt.forEach(function (rmt, index, array) {
                    rmt.cat = req.body.SAT_CAT;
                    addRemoteTransceiversDB(rmt, function (result) {
                        if (result != null) {
                            error = true;
                        }

                        if (index === array.length - 1){
                            if(error){
                                log(result, "error");
                                res({
                                    error : result
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
            }
            else {
                log(result, "error");
                res({
                    error: result
                });
            }
        });
    }

    function modRemoteTransceiversDB(data, cb) {
        db.run('UPDATE REMOTE_TRANSCEIVERS SET RMT_CAT = $cat, RMT_STATUS = $status, RMT_DESC= $desc, RMT_MODE= $mode, RMT_BAUD= $baud, RMT_UPLINK_LOW= $uplink_low, RMT_UPLINK_HIGH= $uplink_high, RMT_DOWNLINK_LOW= $downlink_low, RMT_DOWNLINK_HIGH= $downlink_high WHERE RMT_ID = $id', {
            $id : data.RMT_ID,
            $cat : data.RMT_CAT,
            $status : data.RMT_STATUS,
            $desc : data.RMT_DESC,
            $mode : data.RMT_MODE,
            $baud : data.RMT_BAUD,
            $uplink_low : data.RMT_UPLINK_LOW,
            $uplink_high : data.RMT_UPLINK_HIGH,
            $downlink_low : data.RMT_DOWNLINK_LOW,
            $downlink_high : data.RMT_DOWNLINK_HIGH
        }, function (result) {
            cb(result);
        });
    }

    function modSatelliteDB(data, cb){
        db.run('UPDATE SATELLITES SET SAT_CAT = $cat, SAT_NAME = $name, SAT_DESC = $desc, SAT_TLE1 = $tle1, SAT_TLE2 = $tle2, SAT_TLE_URL = $url, SAT_TLE_DATE = $date WHERE SAT_ID = $id', {
            $id : data.SAT_ID,
            $cat : data.SAT_CAT,
            $name : data.SAT_NAME,
            $desc : data.SAT_DESC,
            $tle1 : data.SAT_TLE1,
            $tle2 : data.SAT_TLE2,
            $url : data.SAT_TLE_URL,
            $date : (new Date()).toString()
        }, function (result) {
            cb(result);
        });
    }

    function modSatellite(req, res){
        //req.checkBody('satname', 'Satellite name is required').notEmpty().isAlpha();
        //req.checkBody('tle', 'TLE is required').notEmpty();

        var error = false;

        modSatelliteDB(req.body, function (result) {
            if (result == null) {
                req.body.rmt.forEach(function (trsp, index, array) {
                    modRemoteTransceiversDB(trsp, function (result) {
                        if (result != null) {
                            log(result, "error");
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
                                    status: "Done"
                                });
                            }
                        }
                    });
                });
            }
            else {
                log(result, "error");
                res({
                    error: "Database error"
                });
            }
        });
    }

    function delSatellite(req, res){
        db.run('DELETE FROM REMOTE_TRANSCEIVERS WHERE RMT_CAT = ?', req.body.SAT_CAT, function (result) {
            if(result == null){
                db.run('DELETE FROM SATELLITES WHERE SAT_CAT = ?', req.body.SAT_CAT, function(result){
                    if(result == null){
                        res({
                            status: "Done"
                        });
                    }
                    else{
                        log(result, "error");
                        res({
                            error: "Database error"
                        });
                    }
                });
            }
            else{
                log(result, "error");
                res({
                    error : "Database error"
                })
            }
        });
    }

    return {
        loginConfig: loginConfig,
        login: login,
        signup : signup,
        deserializeUser: deserializeUser,
        getUsers : getUsers,
        getUser : getUser,
        modUser : modUser,
        delUser : delUser,
        getSatellites: getSatellites,
        addSatellite : addSatellite,
        getRemoteTransceivers : getRemoteTransceivers,
        modSatellite : modSatellite,
        delSatellite : delSatellite
    }
}
