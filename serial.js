var SerialPort = require('serialport');

portName ='/dev/cu.Bluetooth-Incoming-Port';

/*
// list serial ports:
SerialPort.list(function (err, ports) {
  ports.forEach(function(port) {
    console.log(port.comName);
  });
});
*/

var myPort = new SerialPort(portName, {
   baudRate: 9600,
   // look for return and newline at the end of each data packet:
   parser: SerialPort.parsers.readline("\n")
 });


function showPortOpen() {
   console.log('Port open. Data rate: ' + myPort.options.baudRate);
}
 
function sendSerialData(data) {
   console.log(data);
}
 
function showPortClose() {
   console.log('Port closed.');
}
 
function showError(error) {
   console.log('Serial port error: ' + error);
}

myPort.on('open', showPortOpen);
myPort.on('data', sendSerialData);

//myPort.write("Hello");

myPort.on('close', showPortClose);
myPort.on('error', showError);


