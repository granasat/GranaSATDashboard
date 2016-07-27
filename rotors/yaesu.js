"use strict"
var SerialPort = require("serialport");
var leftPad = require('left-pad');
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

    function getData(cb) {
        s.write(new Buffer("C2\n", "utf8"), function() {
            var answer = ""
            var f = function(data) {
                answer += data
                if (answer.substring(answer.length - 2, answer.length) == "\r\n") {
                    cb({
                        status: "Done",
                        azi: parseInt(answer.split('+')[1]),
                        ele: parseInt(answer.split('+')[2])
                    })
                    s.removeListener('data', f);
                }
            }
            setTimeout(function() {
                s.removeListener('data', f);
                cb({
                    error: "Timeout",
                })
            }, 1000);
            s.on("data", f)
        })
    }

    function move(data, cb) {
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
        getData: getData,
        move: move,
        stopRotor: stopRotor
    }
}
