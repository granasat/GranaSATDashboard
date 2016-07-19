var SerialPort = require("serialport");

var s = new SerialPort("/dev/ttyS0");

s.on('open', function() {
    console.log("Serial port opened");
    s.write(Buffer("03","hex"))
    s.write("TC 0;echo off\n")
    s.write("TC 1;FA;FB;FC;TC 0;")
})

var buffer = "";
var freq = {};

s.on('data', function(data) {
    buffer += data;
    console.log("KENWOOD: " + new Buffer(data).toString('hex') + "[" + data.toString().replace(/[\n\r]/g, "") + "]");

    if (buffer.substring(buffer.length - 5, buffer.length) == "TC 0;" && buffer.length > 5) {
        var re = /F([ABC])([0-9]+);/g
        var m = null

        do {
            m = re.exec(buffer);
            if (m) {
                freq["VFO" + m[1]] = parseInt(m[2])
            }
        } while (m);
        console.log(freq);
    }
})
