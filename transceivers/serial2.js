"use strict"
var SerialPort = require("serialport");

module.exports = function Kenwood(sAddress) {
    var serialAddress = sAddress;
    var FREQ_MIN = 1;
    var FREQ_MAX=10;
    var MSG_MIN;
    var MSG_MAX;

    function getData(callback){
        var s = new SerialPort(serialAddress);
        s.on("open", function() {
            var command = "DISPLAY";
            port.write(new Buffer('DISPLAY','utf8'), function() {
            // At this point, data may still be buffered and not sent out over the port yet
            // write function returns asynchronously even on the system level.
            //
            // Note: The write operation is non-blocking. When it returns, 
            // data may still have not actually been written to the serial port.
            console.log('Write callback returned');
            console.log('Calling drain');
            port.drain(function() {
              // Waits until all output data has been transmitted to the serial port
              console.log('Drain callback returned');
              // Now the data has "left the pipe".
            });

          });  

        })

    }

    function writeData(command, callback){
        console.log(command)
        callback({
            command:command
        })
    }

    function configure(body,callback){

        if (body.freq){
            if(parseInt(body.freq)>FREQ_MIN && parseInt(body.freq)<FREQ_MAX){
                //write("set frequency")

                var command = "cambia la freq a "+body.freq 

                writeData(command,function(data){
                    callback({
                        status: "OK, FREQ: "+ body.freq +" | "+ command,
                    })
                })
                
            }else{
                callback({
                    status: "ERROR, FREQ out of range ["+FREQ_MIN+","+FREQ_MAX+"]",
                })
            }
        }

        if (body.mode && (body.mode=="FM" || body.mode=="AM" )) {
            //write("set mode")
        }

        if (body.msg && (body.msg.length<MSG_MAX || body.msg.length>MSG_MIN )) {
            //write("send message") ???
        }

        callback({status:0})    


    }

    return {
        getData: getData,
        configure:configure
    }
}
var Kenwood = require('./serial.js');
var k = new Kenwood("/dev/ttyS0");
k.getData(function(data){
        console.log(data)
    })