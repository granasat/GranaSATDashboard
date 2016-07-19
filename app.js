"use strict"

// REQUIRES ////////////////////////////////////////////////////////////
//Express stuff
var express = require('express');
var bodyParser = require("body-parser");
var cookieParser = require('cookie-parser');


//Commons
var leftPad = require('left-pad');
var crypto = require('crypto');
var path = require('path');


//Rotors and transceivers
var Yaesu = require('./rotors/yaesu.js');
var Kenwood = require('./transceivers/kenwoodts2000.js');

//Database stuff
var mysql = require('mysql');
var database = mysql.createConnection({
    host: 'localhost',
    user: 'adminboard',
    password: 'granada2016',
    database: 'dashboard'
});

//Auth stuff
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;



// CONF //////////////////////////////////////////////////////////////
var HOST = "0.0.0.0" //Listen to every IP address
var PORT = 8002 //Listening port
var SERIAL_ROTORS = "/dev/ttyUSB0" // Rotors path
var SERIAL_TRANSCEIVER = "/dev/ttyS0" // Transceiver path

// APPs ////////////////////////////////////////////////////////////////
var app = express();
app.use(express.static('static'));
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


//PASSPORTJS AND AUTH/ /////////////////////////////////////////////////
function log(s) {
    var l = new Date() + "-> " + s;
    console.log(l);
    //TODO: Save to a file
}

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

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.json({
            status: "No auth",
        })
    }
}

passport.use("login", new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true,
}, function(req, username, password, done) {
    log("Trying to login: " + username + " at " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));
    database.query('select * from USERS where USER_NAME = ?', username, function(err, rows) {
        if (err) {
            log(err);
            return done(null, false);
        }
        if (rows.length != 0) {
            var user = rows[0];
            var hash = hashPassword(password, user.USER_PASSWORD.split(":")[0]);
            if (hash == user.USER_PASSWORD.split(":")[1]) {
                done(null, user);
            } else {
                return done(null, false);
            }
        } else {
            return done(null, false);
        }
    });
}));

// passport.use('signup', new LocalStrategy({
//     usernameField: 'username',
//     passwordField: 'password'
// }, function(username, password, done) {
//     var salt = createSalt();
//     var hashedPassword = hashPassword(password, salt);
//     db.serialize(function() {
//         db.run("INSERT INTO users (id, username,password,salt,userGroup) VALUES (?,?,?,?,?)", [null, username, hashedPassword, salt, 1], function(err, row) {
//             if (err) {
//                 return done(null, false)
//             } else {
//                 db.get('SELECT username, id FROM users WHERE username = ? AND password = ?', username, hashedPassword, function(err, row) {
//                     if (!row) return done(null, false);
//                     return done(null, row);
//                 });
//             };
//         });
//     });
// }));

passport.serializeUser(function(user, done) {
    return done(null, user.USER_ID);
});

passport.deserializeUser(function(id, done) {
    database.query('select * from USERS where USER_ID = ?', id, function(err, rows) {
        if (rows.length == 0) return done(null, false);
        return done(null, rows[0]);
    });
});


// ROUTES, GET AND POST ////////////////////////////////////////////////
// Radiostation

app.post('/login', passport.authenticate('login'), function(req, res) {
    log("Logged: " + req.user.USER_NAME);
    res.json({
        status: "Done"
    })
});

app.get('/logout', function(req, res) {
    req.logout();
    res.json({
        status: "Done"
    })
});

var radioStation = new Kenwood(SERIAL_TRANSCEIVER);

app.get('/radiostation', function(req, res) {

    radioStation.getData(function(data) {
        res.json(data)
    })

});

app.post('/radiostation', function(req, res) {
    //Set radio information (mode, frequecy...) available on the HTTP request

    var k = new Kenwood(SERIAL_TRANSCEIVER);

    k.configure(req.body, function(data) {
        res.json(data);
    })
});

app.get('/rotors', function(req, res) {
    //Generate a response with elevation and azimuth information

    log("Asking for rotors: " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));


    var y = new Yaesu(SERIAL_ROTORS);
    y.getData(function(data) {
        res.json(data);
    })

});

app.post('/rotors', isAuthenticated, function(req, res) {
    //Set the elevation and azimuth information available on the HTTP request

    var elevation = leftPad(parseInt(req.body.ele), 3, 0);
    var azimuth = leftPad(parseInt(req.body.azi), 3, 0);
    var y = new Yaesu(SERIAL_ROTORS);

    y.move(azimuth, elevation, function(data) {
        res.json(data);
    })

});

app.get('/', function(req, res, next) {
    res.sendFile(path.join(__dirname + '/static/index.html'));
});

app.listen(PORT, HOST)
