"use strict"

//TODO: insert module issues: export, serial require, inner package.json
var Rotors = require('./rotors.js');

module.exports = function Yaesu(serialAddress) {
    var serialDevice;
    var r;

    function open() {
        //serialDevice = serial.open(ser)
        //r = Rotors("mv", "rd", serialDevice)
        
        r = Rotors("mv", "rd")
    }

    function close(){
        serialDevice.close()
    }

    function move(elevation,azimuth){
        return r.move(elevation,azimuth);
    }

    function query(elevation,azimuth){
        return r.query();
    }

    return {
        open: open,
        close: close,
        move: move,
        query: query
    }
}


/*
Usage:

var r = Yaesu("/dev/rotorspath")
r.open()
r.move(90,145)
r.query().done(function(answer){
    console.log(answer)
})
r.close()
*/
