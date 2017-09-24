"use strict"
var SerialPort = require("serialport");
var leftPad = require('left-pad');
var Promise = require('bluebird');
var log = require('../utils/logger.js').Logger;

/**
  * Yaesu antenna rotator system
  * @param {string} sAddress - Port where is connected Yaesu.
  */
module.exports = function Yaesu(sAddress) {
    var s = new SerialPort(sAddress);

    //The port is opened and ready for writing
    s.on('open', function() {
        log("Yaesu Rotors serial port opened");
        s.write(Buffer("03", "hex"));
        s.write("TC 0;reset\necho off\n");
    });

    //There is an error opening the port
    s.on('error', function() {
        log("Unable to open Yaesu Rotors serial port");
    });


    function readPosition(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer += data;
            if (serialBuffer.substring(serialBuffer.length - 2, serialBuffer.length) == "\r\n") {
                p.resolve({
                    status: "Done",
                    azi: parseInt(serialBuffer.split('+')[1]),
                    ele: parseInt(serialBuffer.split('+')[2])
                });
            }
        }
    }


    /**
      * This callback type is called `positionCallback` and is displayed as a global symbol.
      * @callback positionCallback
      * @param {string} data
      */

    /**
      * Get the position of the antennas
      * @param {positionCallback} cb - The callback that handles the response.
      */
    function getPosition(cb) {
        var p = new Promise.defer();

        var f = readPosition(p);
        s.on('data', f);

        s.write(new Buffer("C2\n", "utf8"));

        setTimeout(function() {
            p.resolve({
                error: "Timeout"
            });
        }, 1000);

        p.promise.then(function(data) {
            s.removeListener('data', f);
            cb(data);
        });
    }

    /**
      * Set the position of the antennas
      * @param {Object} data - Where you want to rotate the antennas.
      * @param {number} data.ele - Elevation.
      * @param {number} data.azi - Azimuth.
      * @param {positionCallback} cb - The callback that handles the response.
      */
    function setPosition(data, cb) {
        if (data.ele < 0) {     //Elevation can not be negative!
            data.ele = 0;
        }
        var elevation = leftPad(Math.round(data.ele), 3, 0);      //The format that will be send to yaesu must have 3 digits
        var azimuth = leftPad(Math.round(data.azi), 3, 0);

        if (elevation != "" && azimuth != "") {
            s.write(new Buffer("W" + azimuth + " " + elevation + "\n", "utf8"), function(err) {
                if (err) {
                    log("Error writing to Yaesu Rotors : " + err.message, "error");
                    cb({
                        error: "Serial Write"
                    });
                } else {
                    cb({
                        status: "Done"
                    });
                }

            });
        } else {
            log("Bad azimuth or elevation", "error")
            callback({
                status: "Error"
            });
        }
    }


    /**
      * Stop rotors
      * @param {positionCallback} cb - The callback that handles the response.
      */
    function stopRotor(callback) {
        s.write(new Buffer("S\n", "utf8"), function() {
            callback({
                status: "Done"
            });
        });
    }


    //Public methods
    return {
        getPosition: getPosition,
        setPosition: setPosition,
        stopRotor: stopRotor
    }
}
