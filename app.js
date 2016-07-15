"use strict"

// REQUIRES ////////////////////////////////////////////////////////////
//todo: Require serial package to interface with rotors and radiostation
var express = require('express');
var bodyParser = require("body-parser");
var leftPad = require('left-pad')

var Yaesu = require('./rotors/yaesu.js');
var Kenwood = require('./transceivers/kenwoodts2000.js');

// CONSTs //////////////////////////////////////////////////////////////
var HOST = "0.0.0.0" //Listen to every IP address
var PORT = 8002 //Listening port
var SERIAL_DEVICE = "/dev/ttyUSB0" // Rotors path
var SERIAL_TRANSCEIVER = "/dev/ttyS0" // Transceiver path

// APPs ////////////////////////////////////////////////////////////////
var app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));

// ROUTES, GET AND POST ////////////////////////////////////////////////
// Radiostation
app.get('/radiostation', function(req, res) {

    var k = new Kenwood(SERIAL_TRANSCEIVER);

    k.getData(function(data){
        res.json(data)
    })

});

app.post('/radiostation', function(req, res) {
    //Set radio information (mode, frequecy...) available on the HTTP request

    var k = new Kenwood(SERIAL_TRANSCEIVER);
    
    k.configure(req.body,function(data){
        res.json(data);
    })
});

app.get('/rotors', function(req, res) {
    //Generate a response with elevation and azimuth information

    var y = new Yaesu(SERIAL_DEVICE);

    y.getData(function(data){
        res.json(data);
    })

});

app.post('/rotors', function(req, res) {
    //Set the elevation and azimuth information available on the HTTP request
    var elevation = leftPad(parseInt(req.body.ele), 3, 0);
    var azimuth = leftPad(parseInt(req.body.azi), 3, 0);

    if (elevation != "" && azimuth != "") {
        var SerialPort = require("serialport");
        var s = new SerialPort(SERIAL_DEVICE);
        s.on("open", function() {
                s.write(new Buffer("W" + azimuth + " " + elevation + "\n", "utf8"), function() {
                    res.json({
                        status: "Done"
                    })
                    s.close()
                })
            })
            // var y = new Yaesu(SERIAL_DEVICE);
            // y.open();
            // y.move(elevation, azimuth)
            // res.send('Pos: ' + y.query());
    } else {
        res.json({
            status: "Error"
        })
    }

});

app.get('/*', function(req, res, next) {
    next();
}, function(req, res) {
    res.end();
});

app.listen(PORT, HOST)
