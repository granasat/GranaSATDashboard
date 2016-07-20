"use strict"

passport.use("login", new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true,
}, function(req, username, password, done) {
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
}));