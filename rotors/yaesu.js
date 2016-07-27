"use strict"
var SerialPort = require("serialport");
var leftPad = require('left-pad');
var Promise = require('bluebird');
var log = require('../utils/logger.js').Logger;


module.exports = function Yaesu(sAddress) {
    var serialAddress = sAddress;
    var s = new SerialPort(sAddress);

    s.on('open', function() {
        log("Yaesu Rotors serial port opened");
        s.write(Buffer("03", "hex"))
        s.write("TC 0;reset\necho off\n");
    })

    s.on('error', function() {
        log("Unable to open Yaesu Rotors serial port");
    })


    function readPosition(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer += data
            if (serialBuffer.substring(serialBuffer.length - 2, serialBuffer.length) == "\r\n") {
                p.resolve({
                    status: "Done",
                    azi: parseInt(serialBuffer.split('+')[1]),
                    ele: parseInt(serialBuffer.split('+')[2])
                })
            }
        }
    }

    function getPosition(cb) {
        var p = new Promise.defer();

        var f = readPosition(p)
        s.on('data', f);

        s.write(new Buffer("C2\n", "utf8"))

        setTimeout(function() {
            p.resolve({
                error: "Timeout"
            });
        }, 1000);

        p.promise.then(function(data) {
            s.removeListener('data', f);
            cb(data)
        });
    }

    function setPosition(data, cb) {
        if (data.ele < 0) {
            data.ele = 0
        }
        var elevation = leftPad(Math.round(data.ele), 3, 0);
        var azimuth = leftPad(Math.round(data.azi), 3, 0);

        if (elevation != "" && azimuth != "") {
            s.write(new Buffer("W" + azimuth + " " + elevation + "\n", "utf8"), function(err) {
                if (err) {
                    log("Error writing to Yaesu Rotors", "error")
                    cb({
                        error: "Serial Write"
                    });
                } else {
                    cb({
                        status: "Done"
                    })
                }

            })
        } else {
            log("Bad azimuth or elevation", "error")
            callback({
                status: "Error"
            })
        }
    }

    function stopRotor(callback) {
        s.write(new Buffer("S\n", "utf8"), function() {
            callback({
                status: "Done"
            })
        })
    }

    return {
        getPosition: getPosition,
        setPosition: setPosition,
        stopRotor: stopRotor
    }
}
