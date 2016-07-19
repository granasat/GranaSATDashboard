"use strict"
var SerialPort = require("serialport");

module.exports = function Kenwood(sAddress) {
    var serialAddress = sAddress;
    var FREQ_MIN = 1;
    var FREQ_MAX = 10;
    var MSG_MIN;
    var MSG_MAX;

    var stationData = {
        freq: -1,
        mode: -1
    }

    var s = new SerialPort(serialAddress);
    s.on('open', function() {
            console.log("Serial port opened");
        })
        // var auxiliarFunction = function(data,cb) {}

    s.on('data', function(data) {
        buffer += data
            // auxiliarFunction(data)
        console.log("KENWOOD: " + new Buffer(data).toString('hex') + "[" + data.replace(/[^a-zA-Z0-9]/g, "") + "]");
    })

    function getData(callback) {
        if (s.isOpen()) {
            setRADIOMode(function() {
                s.write("FA;FB,FC;", function() {
                    callback({
                        data: buffer
                    })
                })
            })
        } else {
            callback({
                status: "Error"
            })
        }
    }

    function writeData(command, callback) {
        console.log(command)
        callback({
            command: command
        })
    }

    function setCMDMode(cb) {
        var cntrC = buffer("03", hex).toString()
        s.write("TC 0;" + buffer("03", hex).toString(), function() {
            cb();
        })
    }

    function setKISSMode(cb) {
        setCMDMode(function() {
            s.write("TC 0;" + buffer("03", hex).toString(), function() {
                cb();
            })
        })
    }

    function setRADIOMode(cb) {
        s.write("TC 1;", function() {
            cb();
        })
    }

    function configure(body, callback) {
        if (body.freq) {
            if (parseInt(body.freq) > FREQ_MIN && parseInt(body.freq) < FREQ_MAX) {
                //write("set frequency")

                var command = "cambia la freq a " + body.freq

                writeData(command, function(data) {
                    callback({
                        status: "OK, FREQ: " + body.freq + " | " + command,
                    })
                })

            } else {
                callback({
                    status: "ERROR, FREQ out of range [" + FREQ_MIN + "," + FREQ_MAX + "]",
                })
            }
        }

        if (body.mode && (body.mode == "FM" || body.mode == "AM")) {
            //write("set mode")
        }

        if (body.msg && (body.msg.length < MSG_MAX || body.msg.length > MSG_MIN)) {
            //write("send message") ???
        }

        callback({
            status: 0
        })
    }

    return {
        getData: getData,
        configure: configure
    }
}
