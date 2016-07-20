"use strict"

//Config
var config = require('./config.js').config

//Declare Express-Validator
var expressValidator = require('express-validator'); 

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

module.exports = function DashboardDB(req) {

    function login(req, username, password, done) {
        log("Trying to login: " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "warn");
        database.query('select * from USERS where USER_NAME = ?', username, function(err, rows) {
            if (err) {
                log(err);
                return done(null, false);
            }
            if (rows.length != 0) {
                var user = rows[0];
                var hash = hashPassword(password, user.USER_PASSWORD.split(":")[0]);
                if (hash == user.USER_PASSWORD.split(":")[1]) {
                    log("Logged " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));
                    done(null, user);
                } else {
                    log("Non valid password for " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "error");
                    return done(null, false);
                }
            } else {
                log("Non valid username: " + username + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "error");
                return done(null, false);
            }
        });
    };

    function reg_user(req,done) {
        passReqToCallback: true;
        
        //app.use(express.bodyParser());
        //app.use(expressValidator([options]));
        
        req.checkBody('username', 'Name is required').notEmpty().isAlpha().len(6, 20);
        req.checkBody('organization', 'Organization is required').notEmpty().isAlpha();
        req.checkBody('email', 'A valid email is required').notEmpty().isEmail();
        req.checkBody('password', 'A valid password is required').notEmpty().len(6, 8);
        req.checkBody('usertype', 'A valid type is required').notEmpty().isInt();
        
        var post = {
            username: req.body.username,
            organization: req.body.organization,
            mail: req.body.mail,
            password: hashPassword(req.body.password,createSalt()),
            usertype: req.body.usertype
        };
        
        database.query('INSERT INTO USERS(USER_NAME,USER_ORGANIZATION,USER_MAIL,USER_PASSWORD,USER_TYPE) VALUES ?', post, function(err) {
            if (err) {
                log(err);
                return done(null, false);
            }
        });
    };
};