"use strict"

var express = require('express');
var app = express();

//TODO: Require serial package to interface with rotors and radiostation

var HOST = "0.0.0.0" //Listen to every IP address
var PORT = 8000 //Listening port

app.get('/', function(req, res) {
    //main
});


app.get('/rotors', function(req, res) {
    //Generate a response with elevation and azimuth information
});

app.post('/rotors', function(req, res) {
    //Set the elevation and azimuth information available on the HTTP request
});

app.get('/radiostation', function(req, res) {
    //Generate a response with radio information (mode, frequecy...)
});

app.post('/radiostation', function(req, res) {
    //Set radio information (mode, frequecy...) available on the HTTP request
});


app.listen(8000, '0.0.0.0')
