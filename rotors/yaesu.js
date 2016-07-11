"use strict"

//TODO: insert module issues: export, serial require, inner package.json

function Yaesu(serialAddress) {
    var serialDevice;
    var r;

    function open() {
        serialDevice = serial.open(ser)
        r = Rotors("mv", "rd", serialDevice)
    }

    function close(){
        serialDevice.close()
    }

    return {
        open: open,
        close: close,
        move: r.move,
        query: r.query
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
