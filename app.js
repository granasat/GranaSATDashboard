/**
 * Last modification by Antonio Serrano (Github:antserran)
 *
 */

"use strict"

// REQUIRES ////////////////////////////////////////////////////////////
//Express stuff
var express = require('express');
var bodyParser = require("body-parser");
var cookieParser = require('cookie-parser');
var expressValidator = require('express-validator');
var proxy = require('express-http-proxy');
var nodemailer = require('nodemailer');
var crypto = require('crypto');
var async = require('async');
var smtpTransport = require('nodemailer-smtp-transport');
var multer = require('multer');
var webSocket = require('ws');
const http = require('http');
const https = require('https');

const KISS_TNC = require('./kiss-TNC/kiss_tnc.js');
const AX25 = require('./kiss-TNC/ax25.js'); // https://github.com/echicken/node-ax25/tree/es6rewrite



//Commons
var _ = require('lodash')
var path = require('path');
var util = require('util')
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var dateFormat = require('dateformat');
var fs = require('fs');

//Log
var log = require('./utils/logger.js').Logger;

//Config
var config = require('./config.json');

//Rotors, transceivers and propagator
var Yaesu = require('./rotors/yaesu.js');
var Kenwood = require('./transceivers/kenwoodts2000.js');
var Icom9100 = require('./transceivers/icom9100_2.js');
var Propagator = require('./propagator/propagator.js');
var satellites = require('./' + config.scripts_update_library_dest + "/" + config.scripts_update_result_file);
var modes = require('./' + config.scripts_update_library_dest + "/" + config.scripts_update_modes_file);
var Recordings = require('./recordings/recordings');

var record = new Recordings("data.json", path.join(__dirname, "recordings/"));


//Database stuff
 var db = new require("./utils/test_database.js")()
//var db = new require("./utils/database.js")();


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
    extended: true,
}));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'cambia esto cuando puedas',
    cookie: {
        maxAge: 1800000
    },
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(expressValidator());


// --------------------------------------------------------
// Transceiver audio output
// --------------------------------------------------------

// Executing darkice (important that icecast2 is running on server beforehand)
// Arguments: "-c file.cfg" in order to execute darkice with certain configuration
const audioStreaming = spawn('darkice', ['-c', config.audio_file_configuration]);

// --------------------------------------------------------
// DIREWOLF STUFF START
// --------------------------------------------------------

//When executing in Server, set this
//-------------------------------------------------------------

// read ssl certificate
//

/*
var privateKey = fs.readFileSync('/certificados/granasat2_ugr_es.key', 'utf8');
var certificate = fs.readFileSync('/certificados/bundle.crt', 'utf8');

var credentials = { key: privateKey, cert: certificate };

//pass in your credentials to create an https server
var httpsServer = https.createServer(credentials);
httpsServer.listen(8003);

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({
    server: httpsServer
});
//-------------------------------------------------------------

*/

//When executing in localhost, set this
//-------------------------------------------------------------

var server = http.createServer(app);
const wss = new webSocket.Server({ server : server});

server.listen(8003, function listening() {
    log('Direwolf web-socket on ' + server.address().port);
});



//--------------------------------------------------------------

// Executing direwolf
// Arguments:
// "-n 2" for setting 2 channels
// "-p" for setting KISS-TNC port on /tmp/kisstnc
// "-t 0" to disable colour text in output
// "-c file.conf" to take configuration from file
const direwolf = spawn('direwolf', ['-n','2','-p', '-t', '0', '-c', config.direwolf_configuration]);


wss.on('connection', function connection(ws) {

    var connected = true;

    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });

    ws.on('close', function(connection) {
        ws.close();
        connected = false;
    });

    direwolf.stdout.on('data', function(data)  {

        // Saving content into log file
        fs.appendFile(config.aprs_log_file, data.toString(), (err) => {
            if (err) {
                throw err;
            }
         });

        try {
            if (connected) {
                //var x = `${data}`;
                //ws.send(x.toString());
                ws.send(data.toString());
            }
        }

        catch (err) {
            console.log("HE")
            console.log(err.message)
        }
    });

});


//----------------------------------------------------------

// This function gets frames through Direwolf (we don't need it since
// Direwolf does the same)
function log_packet(data) {
    const packet = new AX25.Packet();
    packet.disassemble(data.data);
    console.log(`Packet received on port ${data.port}`);
    console.log('Destination:', packet.destination);
    console.log('Source:', packet.source);
    console.log('Type:', packet.type_name);
    if (packet.payload.length > 0) {
        console.log('Payload:', packet.payload.toString('ascii'));
    }
}


// This function sends frames through Direwolf
function send_string(str) {

    const packet = new AX25.Packet();
    packet.type = AX25.Masks.control.frame_types.u_frame.subtypes.ui;
    packet.source = { callsign : 'EB7DZP', ssid : 0 };
    packet.destination = { callsign : 'GRNSAT', ssid : 0 };
    packet.payload = Buffer.from(str, 'ascii');
    tnc.send_data(packet.assemble(), () => log('Sent AX25 frame:' + str));

}

// --------------------------------------------------------
// DIREWOLF STUFF END
// --------------------------------------------------------

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
            status: "No auth"
        })
    }
}

function isAuthenticated(req, res, next) {  // Only authenticated (user.USR_TYPE == 3) can access to passes and satellites administration
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.json({
            status: "No auth"
        })
    }
}

passport.use("login", new LocalStrategy(db.loginConfig, db.login));

passport.serializeUser(function(user, done) {
    return done(null, user.USR_ID);
});

passport.deserializeUser(db.deserializeUser);


// ROUTES, GET AND POST ////////////////////////////////////////////////


// This checks if there is someone logged in.
// If so, it returns status as "Done" and user type that is logged in
// as well.
app.get('/login', isAuthenticated, function (req, res) {

    res.json({
        status: "Done",
        type: req.user.USR_TYPE
    })
});

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


// Validating user (sending email)
app.post('/validate', function(req,res) {

    var mail = req.body.mail;
    var name = req.body.name;

    // crear token, meter token a usuario y enviar email
    async.waterfall([

        // Creating new password
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },

        // Sending e-mail with /validate:token route
        function (token) {

            var transporter = nodemailer.createTransport(smtpTransport({
                host: 'smtp.ugr.es',
                port: 587,
                secureConnection: true,
                auth: {
                    user: config.granasat_email,
                    pass: config.granasat_password
                }
            }));

            var mailOptions = {
                from: 'granasat@ugr.es',
                to: mail,
                bcc: 'granasat@ugr.es',
                subject: 'Verify your account for GranaSAT Dashboard',
                html: '<h3>You are receiving this because you (or someone else) have created and account with your e-mail\n' +
                        ' for GranaSAT Dashboard, with <b>' + name + '</b> as username\n</h3>' +
                    '<p>Click on the following link or copy and paste the URL to verify your account: </p>\n ' +
                    '<a> http://' + req.headers.host + '/validate' + token + '</a>' +

                    '<br><br>' +

                '<small>If you did not request this, just ignore this message</small>' +

                '<br><br>' +

                '<table width="351" cellspacing="0" cellpadding="0" border="0"> <tr> <td style="text-align:left;padding-bottom:10px"><a style="display:inline-block" href="http://granasat.ugr.es"><img style="border:none" width="50" src="https://fciencias.ugr.es/images/stories/imagenes/Proyectos/granasat.png"></a></td>' +
                '</tr> <tr> <td style="border-top:solid #000000 2px" height="12"></td> </tr> <tr> <td style="vertical-align: top; text-align:left;color:#000000;font-size:12px;font-family:helvetica, arial;; text-align:left"> <span style="margin-right:5px;color:#000000;font-size:15px;font-family:helvetica, arial">GranaSAT Electronics Aerospace Group</span> <br> <span style="font:12px helvetica, arial">E-mail:&nbsp;<a href="mailto:granasat@ugr.es" style="color:#3388cc;text-decoration:none">granasat@ugr.es</a></span> <span style="font:12px helvetica, arial">Telephone:&nbsp;<a href="tel:+34 958 24 40 10" style="color:#3388cc;text-decoration:none">+34 958 244010</a></span> <br><br> Dpto. Electr&#xF3;nica y Tecnolog&#xED;a de los Computadores Facultad de Ciencias, Granada, 18071, Spain <br><br> <table cellpadding="0" cellpadding="0" border="0">' +
                '<tr><td style="padding-right:4px"><a href="https://github.com/granasat" style="display: inline-block"><img width="30" height="30" src="https://s1g.s3.amazonaws.com/3f17b9035b42e747adbbe52785cb1013.png" alt="Github" style="border:none"></a></td><td style="padding-right:4px"><a href="https://linkedin.com/in/granasat-electronics-aerospace-group-263927135/" style="display: inline-block"><img width="30" height="30" src="https://s1g.s3.amazonaws.com/02de7d70bb5d182f19c7b5efaf819042.png" alt="LinkedIn" style="border:none"></a></td><td style="padding-right:4px"><a href="https://twitter.com/granasat?lang=es" style="display: inline-block"><img width="30" height="30" src="https://s1g.s3.amazonaws.com/a1f554e313ebc26ff5082a93c552ab04.png" alt="Twitter" style="border:none"></a></td></tr></table><a href="http://granasat.ugr.es" style="text-decoration:none;color:#3388cc">granasat.ugr.es</a> </td> </tr> </table>'
            };

            transporter.sendMail(mailOptions, function (error, info) {


                if (error) {
                    res.json({status: "error"});
                } else {

                    log('Verification email sent to ' + mail);

                    // Looking for the user and changing token
                    db.getUsers(function (us) {

                        var users = us;
                        users.forEach(function (user) {
                            if (user.USR_MAIL == mail) {

                                user.USR_TOKEN = token; // Changing password

                                log("Setting token for " + user.USR_NAME);
                                // Setting token for user in the DB
                                db.modToken(user, function (result) {
                                    res.json(result);
                                });

                            };
                        });
                    });
                }
            });
        }
    ]);

});

// Validating user (confirming token)
app.get('/validate:token', function(req,res) {


    // Getting token
    var token = (req.params.token);
    console.log(token);

    // Looking for token in database
    db.getUsers(function (us) {

        console.log(us);

        var users = us;
        users.forEach(function (user) {

            if (user.USR_TOKEN == token) {

                log("Veryfing user " + user.USR_NAME);

                // Verifying user in the DB
                db.verifyUser(user, function (result) {

                    if (result.status == "Done") {

                        // Sending feedabck
                        res.writeHead(200, {"Content-Type": "text/html"});
                        res.write('<h3>Your account has been verified</h3>' +
                            '<br>' +
                            '<p>Please, click <a href="/">here</a> to go to the main page</p>');

                        res.end();
                    }

                });

            };
        });
    });

});


// Uploading user image
app.post('/upload_user_image', multer({ dest: './uploads/user_images/'}).single('upl'), function(req,res){


    // Rename image with user name
    fs.rename('./uploads/user_images/' + req.file.filename, './uploads/user_images/' + req.user.USR_NAME, function(err) {
        if ( err ) console.log('ERROR: ' + err);
    });

    // Modifying user image path
    db.getUser(req.user.USR_NAME, function (data) {

        var user = {
            USR_IMG : './uploads/user_images/' + req.user.USR_NAME, // changing image path
            USR_NAME: data.USR_NAME,
            USR_ORGANIZATION: data.USR_ORGANIZATION,
            USR_MAIL: data.USR_MAIL,
            USR_TYPE: data.USR_TYPE,
            USR_BLOCKED: data.USR_BLOCKED,
            USR_ID: data.USR_ID
        };

        db.modUser(user, function (result) {

            if (!result.error) {
                log("Image modified for user " + req.user.USR_NAME);
                res.status(204).end();
            }

            else {
                log("Error while modifying user image for " + req.user.USR_NAME);
            }

        });

    });

});

// Getting user's image
app.get('/user_image', isAuthenticated, function (req,res) {

        // Getting user's image path
        var image_path = config.user_images_path + req.user.USR_NAME;

        // Serving user's image
        res.sendFile(path.resolve(image_path));

});

// Recovery password
app.post('/forgot', function(req, res) {

    // Getting user data
    var name = req.body.name;
    var org = req.body.org;
    var mail = req.body.mail;

    async.waterfall([

        // Creating new password
        function(done) {
            crypto.randomBytes(10, function(err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },

        // Sending e-mail
        function (token) {

            var transporter = nodemailer.createTransport(smtpTransport({
                // host: 'smtp.gmail.com',
                host: 'smtp.ugr.es',
                port: 587,
                secureConnection: true,
                auth: {
                    user: config.granasat_email,
                    pass: config.granasat_password
                }
            }));

            var mailOptions = {
                from: 'granasat@ugr.es',
                to: mail,
                bcc: 'granasat@ugr.es',
                subject: 'Recovery password for GranaSAT Dashboard',
                html: '<h3>You are receiving this because you (or someone else) have requested the reset of the password for your account\n\n</h3>' +

                '<ul><li>Your user: <b>' + name + '</b> </li> <li>Your organization: <b>' + org + '</b> </li> <li>Your new password: <b>' + token + '</b> </li> </ul>'+

                    '<p>Remember to change your password once you have accessed the system.</p>' +

                '<small>If you did not request this, please change your password as soon as possible. </small>' +

                '<br><br>' +

                '<table width="351" cellspacing="0" cellpadding="0" border="0"> <tr> <td style="text-align:left;padding-bottom:10px"><a style="display:inline-block" href="http://granasat.ugr.es"><img style="border:none" width="50" src="https://fciencias.ugr.es/images/stories/imagenes/Proyectos/granasat.png"></a></td>' +
                '</tr> <tr> <td style="border-top:solid #000000 2px" height="12"></td> </tr> <tr> <td style="vertical-align: top; text-align:left;color:#000000;font-size:12px;font-family:helvetica, arial;; text-align:left"> <span style="margin-right:5px;color:#000000;font-size:15px;font-family:helvetica, arial">GranaSAT Electronics Aerospace Group</span> <br> <span style="font:12px helvetica, arial">E-mail:&nbsp;<a href="mailto:granasat@ugr.es" style="color:#3388cc;text-decoration:none">granasat@ugr.es</a></span> <span style="font:12px helvetica, arial">Telephone:&nbsp;<a href="tel:+34 958 24 40 10" style="color:#3388cc;text-decoration:none">+34 958 244010</a></span> <br><br> Dpto. Electr&#xF3;nica y Tecnolog&#xED;a de los Computadores Facultad de Ciencias, Granada, 18071, Spain <br><br> <table cellpadding="0" cellpadding="0" border="0">' +
                '<tr><td style="padding-right:4px"><a href="https://github.com/granasat" style="display: inline-block"><img width="30" height="30" src="https://s1g.s3.amazonaws.com/3f17b9035b42e747adbbe52785cb1013.png" alt="Github" style="border:none"></a></td><td style="padding-right:4px"><a href="https://linkedin.com/in/granasat-electronics-aerospace-group-263927135/" style="display: inline-block"><img width="30" height="30" src="https://s1g.s3.amazonaws.com/02de7d70bb5d182f19c7b5efaf819042.png" alt="LinkedIn" style="border:none"></a></td><td style="padding-right:4px"><a href="https://twitter.com/granasat?lang=es" style="display: inline-block"><img width="30" height="30" src="https://s1g.s3.amazonaws.com/a1f554e313ebc26ff5082a93c552ab04.png" alt="Twitter" style="border:none"></a></td></tr></table><a href="http://granasat.ugr.es" style="text-decoration:none;color:#3388cc">granasat.ugr.es</a> </td> </tr> </table>'

            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    res.json({status: "error"});
                } else {
                    log('Recovery email sent to ' + mail);

                    // Looking for the user and changing password
                    db.getUsers(function (us) {

                        var users = us;
                        users.forEach(function (user) {
                            if (user.USR_MAIL == mail) {

                                user.USR_PASSWORD = token; // Changing password

                                log("Changing password for " + user.USR_NAME);
                                db.modUser(user, function (result) {
                                    res.json(result);
                                });

                            };
                        });
                    });

                }
            });

        }
    ])

});


app.get('/groundstation', function(req, res) {
    res.json({
        name: config.ground_name,
        lat: config.ground_station_lat,
        lng: config.ground_station_lng,
        alt: config.ground_station_alt
    })
});

app.get('/getUsers', isAdmin, function(req, res){
    log("Picking up user list from " + req.user.USR_NAME + " " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "warn");

    db.getUsers(function (usersData) {
        res.json(usersData);
    });
});

// This is necessary without "isAdmin" in order to check whether the e-mail recovery exists within the system
app.get('/getUsersInfo', function(req, res){
    db.getUsers(function (usersData) {
        res.json(usersData);
    });
});


app.get('/getUserInfo', isAuthenticated, function (req, res) {
   //log("Picking up info of " + req.user.USR_NAME, "warn");

   db.getUser(req.user.USR_NAME, function (result) {
       res.json(result);
   })
});

// This modifies user from Admin (Management tab)
app.post('/modUser', isAdmin, function (req, res) {
   log("Modifying users from: " + req.user.USR_NAME + " " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "warn");

   db.modUser(req.body, function (result) {
       res.json(result);
   });
});

// This modifies user from themselves (My Account tab).
app.post('/modOwnUser', function (req, res) {

    log("Modifying user " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress) )

    db.modUser(req.body, function (result) {
        res.json(result);
    });

});

app.post('/delUser', isAdmin, function (req, res) {
    log("Delete user from: " + req.user.USR_NAME + " " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "warn");

    db.delUser(req, function (result) {
        res.json(result);
    });
});


app.post('/delUserWhenWrongEmail', function (req, res) {
    log("Delete user from: " + req.user.USR_NAME + " " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress), "warn");

    db.delUser(req, function (result) {
        res.json(result);
    });
});



var rotors = new Yaesu(config.serial_rotors);
// var radioStation = new Kenwood(config.serial_transceiver_keenwoodts2000)
var radioStation = new Icom9100(config.serial_transceiver_icom9100)

// Direwolf creates a virtual KISS TNC on /tmp/kisstnc
const tnc = new KISS_TNC('/tmp/kisstnc', 9600);

// -------------------------------------------------------
// RadioStation commands (created by Antonio Serrano (Github: antserran)
// -------------------------------------------------------

// Sending AX25 packets with Direwolf
app.post('/radiostation/send_packet', isMember, function(req, res) {


    // Setting transceiver in TX
    radioStation.setTransceiverStatus("tx", function(data) {

        if (data.status == "Done") {

            // Sending AX25 frame
            process.on('SIGTERM', tnc.close);
            tnc.on('error', console.log);
            //tnc.on('data', log_packet); // not necessary (direwolf does it)
            tnc.open(
                () => {
                log('TNC opened');
                send_string(req.body.command);

                // Waiting the frame to be sent and setting again transceiver to
                // RX
                setTimeout(function() {

                    // Setting transceiver back to RX
                    radioStation.setTransceiverStatus("rx", function(data) {
                    res.json(data)
                });
                }, ((1/1200)*8*req.body.command.length) + config.delay_error);

            //BFSK (1 bit por simbolo) x 1/1200 seg (1200 bauds = 1 simbolo cada 1/1200 seg) x len(mgs)x8 + ERROR

            }
            );


        } // if

    else {
            res.json({error: "Error"})
        }
    });
});



// Setting DUP+
app.post('/radiostation/dup_plus', isMember, function(req, res) {

    radioStation.setDUPPlusOperation(function(data) {
        res.json(data);
    })
});

// Setting DUP-
app.post('/radiostation/dup_minus', isMember, function(req, res) {

    radioStation.setDUPMinusOperation(function(data) {
        res.json(data);
    })
});

// Setting Simplex operation
app.post('/radiostation/simplex_operation', isMember, function(req, res) {

    radioStation.setSimplexOperation(function(data) {
        res.json(data);
    })
});

// Setting MAIN Band
app.post('/radiostation/main_band', isMember, function(req, res) {

    radioStation.setMainBand(function(data) {
        res.json(data);
    })
});

// Setting SUB Band
app.post('/radiostation/sub_band', isMember, function(req, res) {

    radioStation.setSubBand(function(data) {
        res.json(data);
    })
});

// Exchange bands
app.post('/radiostation/exchange_bands', isMember, function(req, res) {

    radioStation.exchangeBands( function(data) {
        res.json(data);
    })
});


// Getting operating mode
app.get('/radiostation/operating_mode', isMember, function(req, res) {

    radioStation.getOperatingMode(function(data) {
        res.json(data);
    })
});

// Setting operating mode
app.post('/radiostation/operating_mode', isMember, function(req, res) {

    radioStation.setOperatingMode(req.body.mode, function(data) {
        res.json(data);
    })
});


// Getting transceiver status (RX or TX)
app.get('/radiostation/status', function(req, res) {

    radioStation.getTransceiverStatus(function(status) {
        res.json(status);
    })
});

// Setting transceiver status (RX or TX)
app.post('/radiostation/status', isMember, function(req, res) {

    radioStation.setTransceiverStatus(req.body.option, function(data) {
        res.json(data);
    })
});

// Getting frequency
app.get('/radiostation/freq', function(req, res) {

    // log("Asking for radio freq: " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    radioStation.getFrequency(function(freq) {
        res.json(freq);
    })
});

// Sending frequency
app.post('/radiostation/freq', isMember, function(req, res) {
    log("Moving radio freq: " + " A " + req.body.VFOA + " " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    radioStation.setFrequency(req.body, function(data) {
        res.json(data);
    })
});


// Setting satellite mode
app.post('/radiostation/satmode', function(req,res) {

    radioStation.setSatelliteMode(req.body.option, function(data) {
        res.json(data);
    });

});

// Setting satellite mode
app.get('/radiostation/satmode', function(req,res) {

    radioStation.getSatelliteMode(function(data) {
        res.json(data);
    });
});


// Setting noise reduction (NR)
app.post('/radiostation/nr', function(req,res) {

    radioStation.setNoiseReduction(req.body.option, function(data) {
        res.json(data);
    });
});

// Getting noise reduction (NR)
app.get('/radiostation/nr', function(req,res) {

    radioStation.getNoiseReduction(function(data) {
        res.json(data);
    });
});

// Setting Duplex offset frequency
app.post('/radiostation/duplex_offset', function(req,res) {

    log("Changing dupplex offset frequency to " + req.body.freq)

    radioStation.setOffSet(req.body.freq, function(data) {
        res.json(data);
    });
});

// Getting Duplex offset frequency
app.get('/radiostation/duplex_offset', function(req,res) {
    radioStation.getOffSetFrequency(function(data) {
        res.json(data);
    });
});


// Getting Repeater Tone status
app.get('/radiostation/repeater_tone', function(req,res) {

    radioStation.getRepeaterTone(function(data) {
        res.json(data);
    });
});

// Setting repeater tone
app.post('/radiostation/repeater_tone', function(req,res) {

    radioStation.setRepeaterTone(req.body.option, function(data) {
        res.json(data);
    });
});

// Getting Repeater Tone frequency (subtone)
app.get('/radiostation/repeater_tone_freq', function(req,res) {
    radioStation.getRepeaterToneFrequency(function(data) {
        res.json(data);
    });
});


// Sending repeater tone frequency (subtone)
app.post('/radiostation/repeater_tone_freq', isMember, function(req, res) {

    log("Changing subtone to " + req.body.freq)

    radioStation.setRepeaterToneFrequency(req.body.freq, function(data) {
        res.json(data);
    })
});

// Sending Tone SQL frequency
app.post('/radiostation/tone_sql_freq', isMember, function(req, res) {

    radioStation.setToneSquelchFrequency(req.body.freq, function(data) {
        res.json(data);
    })
});

// Setting Tone SQL
app.post('/radiostation/tone_sql', function(req,res) {

    radioStation.setToneSquelch(req.body.option, function(data) {
        res.json(data);
    });
});

// Getting Tone SQL status
app.get('/radiostation/tone_sql', function(req,res) {

    radioStation.getToneSquelch(function(data) {
        res.json(data);
    });
});

// Setting attenuator
app.post('/radiostation/attenuator', function(req,res) {

    radioStation.setAttenuator(req.body.option, function(data) {
        res.json(data);
    });
});

// Getting attenuator
app.get('/radiostation/attenuator', function(req,res) {

    radioStation.getAttenuator(function(data) {
        res.json(data);
    });
});

// Setting SQL (squelch)
app.post('/radiostation/squelch', function(req,res) {

    radioStation.setSQLStatus(req.body.option, function(data) {
        res.json(data);
    });
});

// Getting SQL
app.get('/radiostation/squelch', function(req,res) {

    radioStation.getSQL(function(data) {
        res.json(data);
    });
});

// Setting RF-power position
app.post('/radiostation/rf_power', function(req,res) {

    radioStation.setRF_Power(req.body.option, function(data) {
        res.json(data);
    });
});

// Getting RF-power position
app.get('/radiostation/rf_power', function(req,res) {

    radioStation.getRFPowerPosition(function(data) {
        res.json(data);
    });
});


// Setting SQL position
app.post('/radiostation/sql_position', function(req,res) {

    radioStation.setSQLPosition(req.body.option, function(data) {
        res.json(data);
    });
});

// Getting SQL position
app.get('/radiostation/sql_position', function(req,res) {

    radioStation.getSQLPosition(function(data) {
        res.json(data);
    });
});


// Setting AF position
app.post('/radiostation/af', function(req,res) {
    radioStation.setAF(req.body.option, function(data) {
        res.json(data);
    });
});

// Getting AF position
app.get('/radiostation/af', function(req,res) {
    radioStation.getAFPosition(function(data) {
        res.json(data);
    });
});


// Setting [RF/SQL] position (RF gain level)
app.post('/radiostation/rf_gain', function(req,res) {
    radioStation.setRFGainLevel(req.body.option, function(data) {
        res.json(data);
    });
});

// Getting [RF/SQL] position (RF gain level)
app.get('/radiostation/rf_gain', function(req,res) {
    radioStation.getRFGainLevel(function(data) {
        res.json(data);
    });
});


// Getting s-meteres
app.get('/radiostation/Smeters', function(req,res) {

    radioStation.getSMeters(function(sMeters) {
        res.json(sMeters);
    });
});

// Getting RF
app.get('/radiostation/rf_meter', function(req,res) {

    radioStation.getRFMeter(function(rf) {
        res.json(rf);
    });

});

// Getting ALC
app.get('/radiostation/alc', function(req,res) {

    radioStation.getALC(function(alc) {
        res.json(alc);
    });

});

// Getting SWR
app.get('/radiostation/swr', function(req,res) {

    radioStation.getSWR(function(swr) {
        res.json(swr);
    });

});

// Getting COMP
app.get('/radiostation/comp', function(req,res) {

    radioStation.getCOMP(function(comp) {
        res.json(comp);
    });

});

// -------------------------------------------------------
// Yaesu rotors commands
// -------------------------------------------------------

// Getting position
app.get('/rotors/position', function(req, res) {
    // log("Asking for rotors: " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    rotors.getPosition(function(data) {
        res.json(data);
    })

});

// Setting position
app.post('/rotors/position', isMember, function(req, res) {
    //Set the elevation and azimuth information available on the HTTP request
    log("Moving rotors: " + req.user.USR_NAME + " from " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));

    rotors.setPosition(req.body, function(data) {
        res.json(data);
    })

});


// -------------------------------------------------
// Satellites over GroundStation
// -------------------------------------------------
app.get('/satellites_groundstation', isAuthenticated, function(req, res) {

    var satellites_ground = [];

    // Update satellite's TLE's in data base
    db.getSatellites(function (sats) {
        sats.forEach(function (sat) {

            var satellite_name = sat.SAT_NAME;
            var tle1 = sat.SAT_TLE1;
            var tle2 = sat.SAT_TLE2;

            // Getting satellites data from propagator
            new Propagator(tle1, tle2, satellite_name, config.ground_station_lng, config.ground_station_lat, config.ground_station_alt).then(function (p) {

                var data = p.getStatusNow();
                if (data.ele > 0) {
                    satellites_ground.push(data)
                }
            });

        });
    });

    setTimeout(function(){
        res.json(satellites_ground)
    },3000)

});


// -------------------------------------------------------
// Repeaters stuff
// -------------------------------------------------------

app.get('/vhf_repeaters', isAuthenticated, function(req, res) {
    db.getVHFRepeaters(function(satelliteData) {
        res.json(satelliteData)
    })
});


app.post('/vhf_repeaters', isAuthenticated, function(req, res) {
    db.addVHFRepeater(req.body.repeater, function (data) {
        res.json(data);
    });
});


app.post('/uhf_repeaters', isAuthenticated, function(req, res) {
    db.addUHFRepeater(req.body.repeater, function (data) {
        res.json(data);
    });
});


app.get('/uhf_repeaters', isAuthenticated, function(req, res) {
    db.getUHFRepeaters(function(satelliteData) {
        res.json(satelliteData)
    })
});



// -------------------------------------------------------
// Satellites stuff
// -------------------------------------------------------
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
            satellite: e.satellite,
            id: e.id,
            startDateUTC : e.info.startDateUTC,
            endDateUTC : e.info.endDateUTC,
            startDateLocal : e.info.startDateLocal,
            endDateLocal : e.info.endDateLocal,
            duration : e.info.duration,
            maxElevation : e.info.maxElevation,
            scheduled : e.info.scheduled
        }
    }))
});

app.get('/satellites/passes', function(req, res) {
    res.json(passes);
});

app.post('/satellites/passes', isAuthenticated, function(req, res) {
    var sat = passes.find(function (satellite) {   //Get passes info from DB
        return satellite.SAT_ID === req.body.satId;
    });

    var pass = sat.pass.find(function (pass) {
        return pass.id === req.body.passId;
    });

    var trsp = sat.rmt.find(function (rmt) {
        return rmt.RMT_ID === req.body.trspId;
    });

    var freq = 0;

    if((freq = (trsp.RMT_DOWNLINK_LOW)? trsp.RMT_DOWNLINK_LOW : trsp.RMT_DOWNLINK_HIGH) && pass.data.length > 0){
        var passName = sat.SAT_NAME.replace(/[^a-zA-Z0-9]/g, "") + "_" + dateFormat(new Date(), "dd-mm-yy-HH-mm");
        var passRefreshInterval = pass.duration / pass.data.length;

        log("SCHEDULING pass for: " + sat.SAT_NAME +
            "\n\t Date: " + pass.startDateUTC +
            "\n\t Duration: " + pass.duration / 1000 + " s" +
            "\n\t Frequency: " + freq + " Hz" +
            "\n\t File: " + passName + ".wav");

        var passScheduled = {
            id: req.body.passId,
            satellite: sat.SAT_NAME,
            info: pass,
            handler_id: setTimeout(function() {
                log("STARTING pass for: " + sat.SAT_NAME +
                    "\n\t Date: " + pass.startDateUTC +
                    "\n\t Duration: " + pass.duration / 1000 + " s" +
                    "\n\t Frequency: " + freq + " Hz" +
                    "\n\t File: " + passName + ".wav");

                exec("arecord -f cd -D hw:1,0 -d " + (pass.duration / 1000) + " " + config.recordings_path + passName + ".wav", function(error, stdout, stderr) {
                    if (error) {
                        log(error + stdout + stderr, 'error');
                    } else {
                        log("Pass recording done. Processing the audio file: " + passName);
                        record.addRecording(passName + ".wav", passScheduled);

                        /*
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

                        */
                    }
                });
                // exec("arecord -f cd -d " + (pass.duration / 1000) + " | sox -t raw -e signed -c 1 -b 16 -r 11025 - " + passName + ".wav")

                /*
                    In the var pass we have the data of the pass, it is a array with the values of azi, ele and doppler.
                    We divide the time of the pass with the number of values in pass, then it will refresh every this value.
                 */

                var i = 0;
                var passInterval = setInterval(function() {
                    var p = pass.data[i];
                    //console.log(p);

                    if (!p.error) {
                        //Move antennas
                        rotors.setPosition(p, function(ans) {
                            if (!ans.error) {
                                log("DOING pass for " + sat.SAT_NAME + ": moving to AZ: " + p.azi + " EL: " + p.ele);
                            }
                        });

                        //Set freq
                        radioStation.setFrequency({
                            VFOA: freq * p.dopplerFactor
                        }, function(ans) {
                            if (!ans.error) {
                                log("DOING pass for " + sat.SAT_NAME + ": setting freq to " + freq * p.dopplerFactor + " [" + freq + "]");
                            }
                        })
                    } else {
                        log(p.error, "error")
                    }

                    i++;
                }, passRefreshInterval);


                setTimeout(function() {
                    clearInterval(passInterval);

                    log("ENDING pass for: " + sat.SAT_NAME +
                        "\n\t Date: " + pass.startDateUTC +
                        "\n\t Duration: " + pass.duration / 1000 + " s" +
                        "\n\t Frequency: " + freq + " Hz" +
                        "\n\t File: " + passName + ".wav");
                }, pass.duration /*Pass duration */)


            }, new Date(pass.startDateUTC) - new Date() /*Time to pass start */)};
        //Saving to the list
        pass.scheduled = true;
        pass.scheduledBy = req.body.scheduledBy;
        scheduledPasses.push(passScheduled);
    }
    else{
        // There is no freq to listen
    }

    res.json({
        status: "Done"
    });
});

app.post('/satellites/undoSchedule', isAuthenticated, function(req, res) {

    log("Undo Scheduled pass with id:" + req.body.id, "warn");

    var pass = scheduledPasses.find(function (pass) {
        return pass.id === req.body.id;
    });

    if(pass){
        clearTimeout(pass.handler_id);
        pass.info.scheduled = false;
    }



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

app.get('/getModes', isAuthenticated, function (req, res) {
    res.json(modes);
});

app.get('/getConf', isAuthenticated, function (req, res) {
    var copyConf = {};

    for(var attr in config){
        if(attr !== "database_user" && attr !== "database_password" && attr !== "aprsfi_apikey") copyConf[attr] = config[attr]
    }

    res.json(copyConf);
});


app.post('/updateConf', isAuthenticated, function (req, res) {
    var newConf = req.body.conf;

    for(var attr in newConf){
        if(config[attr] !== newConf[attr] && Object.prototype.toString.call(config[attr]) !== '[object Array]' ){
            log("Modifying config " + attr + " from " + config[attr] + " to " + newConf[attr], "warn")
        }
    }


    newConf.database_user = config.database_user;
    newConf.database_password = config.database_password;



    var newConfJSON = JSON.stringify(newConf, undefined, 2);

    fs.writeFile('config.json', newConfJSON, function (err) {
        if (err){
            log(err.toString(), "error");

            res.json({
                error : "Error while writing json"
            })
        }
        else{
            res.json({
                status : "Done"
            })

            config = newConf;
        }

    })
});

app.get('/getLog', isAuthenticated, function (req, res) {
    fs.stat(config.log_file, function (err, stats) {
        if(!err){
            var stream = fs.createReadStream(config.log_file, {
                flags: "r",
                encoding: "utf-8",
                fd: null,
                start: stats.size - config.log_size_sent,
                end: stats.size
            });

            var data = "";

            stream.on("data", function(moreData){
                data += moreData;
            });

            stream.on("error", function(){
                log("Error while reading log file", "error");
                res.json({
                    error : "Error while reading log file"
                })
            });

            stream.on("end", function(){
                res.json({
                    data : data
                })
            });
        }
        else{
            log("Error while reading log file", "error");
            res.json({
                error : "Error while reading log file"
            })
        }
    });
});


// Getting satellites data
app.get('/getSatellitesData', function (req,res) {

    // Getting satellite's name from http request
    var satellite_name = req.query.sat_name;
    var tle1 = req.query.tle1;
    var tle2 = req.query.tle2;

    // Getting satellies data from propagator
    new Propagator(tle1, tle2, satellite_name, config.ground_station_lng, config.ground_station_lat, config.ground_station_alt).then(function (p) {
        res.json(p.getStatusNow()); // sending response
    });

/*
    // Esto hace lo mismo pero ejecutando un script de Python utilizando PyPredict

        // Executing script (it will create JSON file with data (lon,lat, az, el, footprint, etc)
    // of satellite). The script receives satellite's name and TLE's
    var data_sat= spawn('python', ['sat_library/getSatData.py', satellite_name, tle1, tle2])

    data_sat.stdout.on('data', function (data) {
        console.log(data.toString());
    });

    data_sat.stderr.on('data', function(data){
        console.log(data.toString(), "error");
    });

    data_sat.on('close', function (code) {
        //console.log("Script exit code: " + code.toString());

        if(code === 0){

            // Reading file created by the script above
            var conts = fs.readFileSync("./sat_library/data2.json");

            // Definition to the JSON type
            var jsonCont = JSON.parse(conts);

            res.json(jsonCont); // sending response

        }
        else{
            res.json({
                error: "Error while executing python"
            });
        }

    });
*/

});


// Getting satellites path by executing a script
app.get('/getSatellitesOrbit', function(req,res) {

    // Getting satellite's name and TLE
    var satellite_name = req.query.sat_name;
    var tle1 = req.query.tle1;
    var tle2 = req.query.tle2;


    // Executing script (it will create JSON file with coordinates of satellite)
    // The script receives satellite's name and TLE's
    var path_satellites= spawn('python3', ['sat_library/getSatOrbit.py',satellite_name, tle1,tle2])

    path_satellites.stdout.on('data', function (data) {
        console.log(data.toString());
    });

    path_satellites.stderr.on('data', function(data){
        console.log(data.toString(), "error");
    });

    path_satellites.on('close', function (code) {
        //console.log("Script exit code: " + code.toString());

        if(code === 0){

            // Reading file created by the script above
            var conts = fs.readFileSync("./sat_library/data.json");

            // Definition to the JSON type
            var jsonCont = JSON.parse(conts);

            res.json(jsonCont); // sending response

        }
        else{
            res.json({
                error: "Error while executing python"
            });
        }

    });

});

app.get('/updateLibrary', isAuthenticated, function (req, res) {
    log("Updating sat library", "warn");

    var update_scripts = spawn("python", [config.scripts_update_library, config.scripts_update_library_dest], {
        encoding: 'utf-8'
    });

    update_scripts.stdout.on('data', function (data) {
        log(data.toString());
    });

    update_scripts.stderr.on('data', function(data){
        log(data.toString(), "error");
    });

    update_scripts.on('close', function (code) {
        log("Script exit code: " + code.toString());

        if(code === 0){

            // Update satellite's TLE's in data base
            db.getSatellites(function (sats) {
                sats.forEach(function (sat) {

                    // Get updated TLE's from final.json
                    var new_tle1;
                    var new_tle2;
                    var length = satellites.length
                    for (var i=0; i<length; i++){
                        if (satellites[i].name == sat.SAT_NAME) {
                            new_tle1 = satellites[i].tle1
                            new_tle2 = satellites[i].tle2
                        }
                    }

                    var req = {
                        SAT_NAME : sat.SAT_NAME,
                        SAT_TLE1 : new_tle1,
                        SAT_TLE2 : new_tle2
                    };

                    // Updating TLE in data base
                    db.updateSatelliteTLE(req, function (data) {

                    });

                });
            });


            res.json({
                status : "Done"
            });

        }
        else{
            res.json({
                error: "Error while executing python"
            });
        }
    });
});

app.get('/getRecordings', isAuthenticated, function (req, res) {
    log("Getting recordings");

    res.json(record.getRecordings());
});

app.get('/downloadRecording', function (req, res) {
    log("Downloading a recording");

    res.download(record.getRecording(req.query.data));
});



app.listen(config.web_port, config.web_host);
log("Web server listening: " + config.web_host + ":" + config.web_port);
log("Remember to execute in sudo mode")

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
