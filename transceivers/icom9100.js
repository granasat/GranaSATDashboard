"use strict"
var SerialPort = require("serialport");
var log = require('../utils/logger.js').Logger;
// var logAPRS = require('../utils/logger.js').APRSLogger;
var Promise = require('bluebird');
var leftPad = require('left-pad');


module.exports = function Icom9100(sAddress) {
    var s = new SerialPort(sAddress, {
        baudRate: 9600
    });

    s.on('open', function() {
        log("ICOM 9100 serial port opened");
    })

    s.on('error', function() {
        log("Unable to open ICOM 9100 serial port");
    })

    function cmd2freq(cmd) {
        return parseInt(leftPad(cmd[4].toString(16), 2, 0) +
            leftPad(cmd[3].toString(16), 2, 0) +
            leftPad(cmd[2].toString(16), 2, 0) +
            leftPad(cmd[1].toString(16), 2, 0) +
            leftPad(cmd[0].toString(16), 2, 0))
    }

    function freq2cmd(freq) {
        var f = leftPad(freq, 10, 0)
        var s = f.substring(8, 10) + f.substring(6, 8) + f.substring(4, 6) + f.substring(2, 4) + f.substring(0, 2)
        return s
    }


    function readFreq(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])
            if (serialBuffer.length >= 17) {
                var freq = {
                    VFOA: cmd2freq(serialBuffer.slice(11, 16))
                }
                p.resolve(freq);
            }
        }
    }


    function getFrequency(cb) {
        var p = new Promise.defer();

        var f = readFreq(p)
        s.on('data', f);

        s.write(Buffer("FEFE7CE003FD", "hex"))

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

    function setFrequency(freq, cb) {

        s.write(Buffer("FEFE7CE000" + freq2cmd(Math.round(freq.VFOA)) + "FD", "hex"), function(err) {
            if (err) {
                log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                cb({
                    status: "Done"
                });
            }
        })

    }

    return {
        getFrequency: getFrequency,
        setFrequency: setFrequency,
    }
}
