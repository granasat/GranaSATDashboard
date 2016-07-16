"use strict"
var SerialPort = require("serialport");

module.exports = function Yaesu(sAddress) {
    var serialAddress = sAddress;

    function getData(callback) {
        var s = new SerialPort(serialAddress);
        s.on("open", function() {
            s.write(new Buffer("C2\n", "utf8"), function() {
                var answer = ""
                s.on("data", function(data) {
                    answer += data
                    if (answer.substring(answer.length - 2, answer.length) == "\r\n") {
                        callback({
                            status: "Rotors Done",
                            azi: parseInt(answer.split('+')[1]),
                            ele: parseInt(answer.split('+')[2])
                        })
                        s.close()
                    }
                })
            })
        })

    }


    function move(azimuth, elevation, callback) {
        if (elevation != "" && azimuth != "") {

            var SerialPort = require("serialport");
            var s = new SerialPort(serialAddress);
            s.on("open", function() {
                s.write(new Buffer("W" + azimuth + " " + elevation + "\n", "utf8"), function() {
                    callback({
                        status: "Done"
                    })
                    s.close()
                })
            })

        } else {
            callback({
                status: "Error"
            })
        }
    }


    return {
        getData: getData,
        move: move
    }
}
