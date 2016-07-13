"use strict"

// REQUIRES ////////////////////////////////////////////////////////////
//todo: Require serial package to interface with rotors and radiostation
var express = require('express');
var Yaesu = require('./rotors/yaesu.js');

// CONSTs //////////////////////////////////////////////////////////////
var HOST = "0.0.0.0" //Listen to every IP address
var PORT = 8002 //Listening port
var SERIAL_DEVICE = "/dev/rotorspath" // Rotors path

// APPs ////////////////////////////////////////////////////////////////
var app = express();

// ROUTES, GET AND POST ////////////////////////////////////////////////
app.get('/radiostation', function(req, res) {
  	//Generate a response with radio information (mode, frequecy...)
  	res.send('GET RADIOSTATION');    
  });

app.post('/radiostation', function(req, res) {
	//Set radio information (mode, frequecy...) available on the HTTP request
	
	var mode = req.param('mode') ;
	var freq = req.param('freq');

	if (mode && freq ){ 		
		res.send(mode + ',' + freq)
	}else{
		res.send('Parámetros no definidos')
	}  

});

app.get('/rotors', function(req, res) {
	//Generate a response with elevation and azimuth information
	var y = new Yaesu(SERIAL_DEVICE);
	y.open();
  res.send(y.query()); 	
    
});

app.post('/rotors', function(req, res) {
  //Set the elevation and azimuth information available on the HTTP request

  var elevation = req.param('ele');
  var azimuth = req.param('azi');

  if (elevation && azimuth ){  			
		var y = new Yaesu("/dev/rotorspath");
		y.open();
	  y.move(elevation,azimuth)
	  res.send('Pos: ' + y.query());
	}else{
		res.send('Parámetros no definidos')
	}
    
});

app.get('/*', function(req, res, next) {
  	console.log('index')  
    next();
}, function (req, res){
    res.send('INDEX');
});

app.listen(PORT, HOST)
