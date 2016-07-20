"use strict"

//Config
var config = require('./config.js').config

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

	function reg_user(req) {
		passReqToCallback: true,
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
};