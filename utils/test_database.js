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
            $type: 1
        }, function (result) {
            if (result == null) {
                res({
                    status: "Done"
                });
            }
            else {
                log(result, "error");
                console.log(result);
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


    function getSatellites(cb) {
        db.all('SELECT T1.*,T2.SAT_TLE1,T2.SAT_TLE2,T2.SAT_TLE_URL,T2.SAT_TLE_DATE FROM REMOTE_TRANSCEIVERS AS T1, SATELLITES AS T2 WHERE RMT_ID = SAT_ID', function(err, rows, fields) {
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
        db.run('INSERT INTO SATELLITES VALUES (NULL, $tle1, $tle2, $url, $date)', {
            $tle1 : data.tle1,
            $tle2 : data.tle2,
            $url : data.url,
            $date : (new Date()).toString()
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
        db.run('UPDATE SATELLITES SET SAT_TLE1 = $tle1, SAT_TLE2 = $tle2, SAT_TLE_URL = $url, SAT_TLE_DATE = $date WHERE SAT_ID = $id', {
            $id : data.id,
            $tle1 : data.tle1,
            $tle2 : data.tle2,
            $url : data.url,
            $date : (new Date()).toString()
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

    function delSatellite(req, res){
        db.run('DELETE FROM REMOTE_TRANSCEIVERS WHERE RMT_ID = ?', req.body.RMT_ID, function (result) {
            if(result == null){
                db.run('DELETE FROM SATELLITES WHERE SAT_ID = ?', req.body.RMT_ID, function(result){
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
        signup : signup,
        deserializeUser: deserializeUser,
        getUsers : getUsers,
        modUser : modUser,
        delUser : delUser,
        getSatellites: getSatellites,
        addSatellite : addSatellite,
        modSatellite : modSatellite,
        delSatellite : delSatellite,
        getSatelliteTLE: getSatelliteTLE
    }
}
