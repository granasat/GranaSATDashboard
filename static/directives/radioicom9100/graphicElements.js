/**
 *
 * Created by: Antonio Serrano (github.com/antserran)
 *
 *
 */

// ---------------------------------------------------
// This module defines the behavior of graphic elements in
// transceiver tab (gauges and bars)
// ---------------------------------------------------

// ---------------------------------------------------
// Gauges (http://bernii.github.io/gauge.js/)
// ---------------------------------------------------

var gaugeRFPower;
var gaugeAF;
var gaugeRFGain;
var gaugeSQL;

function setSQLGauge() {
    var opts = {
        lines: 12,               // The number of lines to draw
        angle: 0.07,             // The length of each line
        lineWidth: 0.44,         // The line thickness
        fontSize: 32,
        pointer: {
            length: 0.9,        // The radius of the inner circle
            strokeWidth: 0.046, // The rotation offset
            color: '#424242'    // Fill color
        },
        limitMax: 'false',        // If true, the pointer will not go past the end of the gauge
        gradients: ['#6FADCF', '#B6D0DE'],
        strokeColor: '#FFFFFF',   // to see which ones work best for you
        generateGradient: true
    };



    var target = document.getElementById('SQL_gauge'); // your canvas element
    gaugeSQL = new Gauge(target).setOptions(opts); // create sexy gauge!
    gaugeSQL.setMinValue(0);  // Prefer setter over gauge.minValue = 0
    gaugeSQL.animationSpeed = 32; // set animation speed (32 is default value)
    gaugeSQL.maxValue = 100;
    gaugeSQL.setTextField(document.getElementById('tfDisplaySQL'));
    gaugeSQL.set(1);
}

function setRFPowerGauge() {
        var opts = {
            lines: 12,               // The number of lines to draw
            angle: 0.07,             // The length of each line
            lineWidth: 0.44,         // The line thickness
            fontSize: 32,
            pointer: {
                length: 0.9,        // The radius of the inner circle
                strokeWidth: 0.046, // The rotation offset
                color: '#424242'    // Fill color
            },
            limitMax: 'false',        // If true, the pointer will not go past the end of the gauge
            gradients: ['#6FADCF', '#B6D0DE'],
            strokeColor: '#FFFFFF',   // to see which ones work best for you
            generateGradient: true
        };



    var target = document.getElementById('rfPower_gauge'); // your canvas element
    gaugeRFPower = new Gauge(target).setOptions(opts); // create sexy gauge!
    gaugeRFPower.setMinValue(2);  // min value in 430MHz (see page 3 of manual)
    gaugeRFPower.animationSpeed = 32; // set animation speed (32 is default value)
    gaugeRFPower.maxValue = 75; // max value in 430MHz (see page 3 of manual)
    gaugeRFPower.setTextField(document.getElementById('tfDisplayRFPower'));

}


function setRFGainGauge() {
    var opts = {
        lines: 12,               // The number of lines to draw
        angle: 0.07,             // The length of each line
        lineWidth: 0.44,         // The line thickness
        fontSize: 32,
        pointer: {
            length: 0.9,        // The radius of the inner circle
            strokeWidth: 0.046, // The rotation offset
            color: '#424242'    // Fill color
        },
        limitMax: 'false',        // If true, the pointer will not go past the end of the gauge
        gradients: ['#6FADCF', '#B6D0DE'],
        strokeColor: '#FFFFFF',   // to see which ones work best for you
        generateGradient: true
    };



    var target = document.getElementById('rfGain_gauge'); // your canvas element
    gaugeRFGain = new Gauge(target).setOptions(opts); // create sexy gauge!
    gaugeRFGain.setMinValue(0);  // Prefer setter over gauge.minValue = 0
    gaugeRFGain.animationSpeed = 32; // set animation speed (32 is default value)
    gaugeRFGain.maxValue = 100;
    gaugeRFGain.setTextField(document.getElementById('tfDisplayRFGain'));
    gaugeRFGain.set(1);
}


function setAFGauge() {
    var opts = {
        lines: 12,               // The number of lines to draw
        angle: 0.07,             // The length of each line
        lineWidth: 0.44,         // The line thickness
        fontSize: 32,
        pointer: {
            length: 0.9,        // The radius of the inner circle
            strokeWidth: 0.046, // The rotation offset
            color: '#424242'    // Fill color
        },
        limitMax: 'false',        // If true, the pointer will not go past the end of the gauge
        gradients: ['#6FADCF', '#B6D0DE'],
        strokeColor: '#FFFFFF',   // to see which ones work best for you
        generateGradient: true
    };



    var target = document.getElementById('af_gauge'); // your canvas element
    gaugeAF = new Gauge(target).setOptions(opts); // create sexy gauge!
    gaugeAF.setMinValue(0);  // Prefer setter over gauge.minValue = 0
    gaugeAF.animationSpeed = 32; // set animation speed (32 is default value)
    gaugeAF.maxValue = 100;
    gaugeAF.setTextField(document.getElementById('tfDisplayAF'));
    gaugeAF.set(1);

}


// ---------------------------------------------------
// Functions that update gauges given a value
// ---------------------------------------------------

function updateAFGauge(value) {
    gaugeAF.set(parseInt(value)); // set actual value
    gaugeAF.setTextField(document.getElementById('tfDisplayAF'));
}

function updateRFPowerGauge(value) {
    gaugeRFPower.set(parseInt(value)); // set actual value
    gaugeRFPower.setTextField(document.getElementById('tfDisplayRFPower'));
}

function updateRFGainGauge(value) {
    gaugeRFGain.set(parseInt(value)); // set actual value
    gaugeRFGain.setTextField(document.getElementById('tfDisplayRFGain'));
}

function updateSQLGauge(value) {
    gaugeSQL.set(parseInt(value)); // set actual value
    gaugeSQL.setTextField(document.getElementById('tfDisplaySQL'));
}

// ---------------------------------------------------
// Functions that update bars given a value between 0000-0255
// (see transceiver's manual instruction)
// ---------------------------------------------------

function updateSMetersBar(s_meters) {

    // following instruction on page 185 we can
    // represent the values of s-meters, which can be
    // a value from 0 to 255
    // (0000=S0, 0120=S9, 0240=S9+60 dB)

    var progress = 0; // progress to be painted (from 0% to 100%)

    // SO
    if (s_meters < 120) {

        // adjusting to S1-S9 scale
        progress = s_meters * 9 / 120;

        // adjusting to represent on bar (0-50%)
        progress = progress * 50 / 9;
    }

    // S9
    else if (s_meters < 240){

        // adjusting to 20-60dB scale
        progress = s_meters / 240;

        // adjusting to represent on bar (50-100%)
        progress = progress * 100;

    }

    // S9 + 60dB
    else if (s_meters >= 240){

        // full bar
        progress = 100
    }

    // Repainting
    var elem = document.getElementById("s-meters");

    // Changing colours according to progress
    if (progress > 50) { // >S9 -> red
        elem.style.background = 'red';
    } else {
        elem.style.background = 'green';
    }

    // Redrawing bar
    elem.style.width = progress + '%';
}


function updateALCBar(alc) {

    // following instruction on page 185 we can
    // represent the values of ALC
    // (0000=Min. to 0120=Max.)
    var progress = 0; // progress to be painted (from 0% to 100%)

    // Adapting to progress bar (0-100%)
    if (alc <= 120){
        progress = alc / 120 * 100;
    } else if (alc>120){
        progress = 100;
    }

    // Redrawing bar
    var elem = document.getElementById("alc");
    elem.style.width = progress + '%';
}

function updateSWRBar(alc) {

    // following instruction on page 185 we can
    // represent the values of ALC
    // 0000=SWR1.0, 0041=SWR1.5,
    // 0081=SWR2.0, 0120=SWR3.0)
    var progress = 0; // progress to be painted (from 0% to 100%)

    // SWR1.0 - SWR1.5
    if (alc <= 41) {
        progress = alc / 41;
        progress = progress * 17; // SWR1.5 will be 17% of the bar
    }

    // SWR1.5- SWR2.0
    else if (alc <= 81){
        progress = alc / 81;
        progress = progress * 30; // SWR2.0 will be 30% of the bar
    }

    // SWR2.0 - SWR3.0
    else if (alc <= 120) {
        progress = alc / 120;
        progress = progress * 50; // SWR3.0 will be 50% of the bar
    }

    // +SWR3.0 (infinite symbols)
    else if (alc > 120) {
        progress = alc / 255
        progress = progress * 100;
    }

    // Redrawing bar
    var elem = document.getElementById("swr");
    elem.style.width = progress + '%';
}

function updateCOMPBar(comp) {

    // no hace falta
}


function updateRFBar(rf_value) {

    // following instruction on page 185 we can
    // represent the values of rf
    // (0000=0%, 0141=50%, 0215=100%)

    var progress = 0; // progress to be painted

    if (rf_value <= 141) {

        progress = rf_value / 141 * 50;

    } else if (rf_value <= 215){
        progress = rf_value/215*100; // obtaining %

    } else if (rf_value > 215 ) {
        progress = 100
    }

    // Redrawing bar
    var elem = document.getElementById("rf-meter");
    elem.style.width = progress + '%';
}