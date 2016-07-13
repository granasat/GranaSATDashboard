'use strict';

var SERIAL_DEVICE = '/dev/ttyUSB0';

var SerialPort = require('serialport');
var port = new SerialPort(SERIAL_DEVICE);

// list serial ports:
SerialPort.list(function (err, ports) {
  ports.forEach(function(port) {
    console.log(port.comName);
  });
});


function getBuffer() {
  
  var buffer = new Buffer(8);  

  buffer[0] = 0x57;   
  buffer[1] = 0x30;  
  buffer[2] = 0x33;
  buffer[3] = 0x30;  

  buffer[4] = 0x20; 

  buffer[5] = 0x30;
  buffer[6] = 0x33;
  buffer[7] = 0x30;
  
  return buffer;

}

port.on('open', function() {

  var message = getBuffer();
  //console.log(message);
  console.log('Calling write');

  port.write(message, function() {
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

});

port.on('data', function(data) {
  console.log('Received: \t', data.toString('utf8'));
});

port.on('error', function(error) {
  console.log('ERROR: \t', error);
});



