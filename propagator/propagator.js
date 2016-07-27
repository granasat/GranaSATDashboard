"use strict"
var satellite = require("satellite.js").satellite
var http = require('http');
var log = require('../utils/logger.js').Logger;


module.exports = function Propagator(satelliteName, stationLon, stationLat, stationAlt) {
    var observerGd = {
        longitude: stationLon * satellite.constants.deg2rad,
        latitude: stationLat * satellite.constants.deg2rad,
        height: stationAlt / 1000
    };
    var tle = null;

    var getTLE = function(name, cb) {
        cb("1 40907U 15049J   16209.49649285  .00001020  00000-0  60086-4 0  9991\n2 40907  97.4503 215.5702 0013313 255.1280 104.8477 15.13750769 47103")
            // http.get({
            //     host: 'www.celestrak.com',
            //     path: '/NORAD/elements/amateur.txt'
            // }, function(res) {
            //     var bodyChunks = [];
            //     res.on('data', function(chunk) {
            //         bodyChunks.push(chunk);
            //     }).on('end', function() {
            //         var data = bodyChunks.toString().replace(/(\s)*\r/g, "").split("\n")
            //         var i = data.indexOf(name)
            //         cb(data[i + 1] + "\n" + data[i + 2]);
            //     })
            // })
    }

    var getStatus = function(d) {
        if (!tle) {
            return {
                error: "No TLE available",
            }
        } else {
            var tleLine1 = tle.split("\n")[0],
                tleLine2 = tle.split("\n")[1];

            var satrec = satellite.twoline2satrec(tleLine1, tleLine2);

            var now = d;
            var positionAndVelocity = satellite.propagate(
                satrec,
                now.getUTCFullYear(),
                now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                now.getUTCDate(),
                now.getUTCHours(),
                now.getUTCMinutes(),
                now.getUTCSeconds()
            );

            var positionEci = positionAndVelocity.position,
                velocityEci = positionAndVelocity.velocity;

            var gmst = satellite.gstimeFromDate(
                now.getUTCFullYear(),
                now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                now.getUTCDate(),
                now.getUTCHours(),
                now.getUTCMinutes(),
                now.getUTCSeconds()
            );

            var positionEcf = satellite.eciToEcf(positionEci, gmst),
                velocityEcf = satellite.eciToEcf(velocityEci, gmst),
                observerEcf = satellite.geodeticToEcf(observerGd),
                positionGd = satellite.eciToGeodetic(positionEci, gmst),
                lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf),
                dopplerFactor = satellite.dopplerFactor(observerEcf, positionEcf, velocityEcf);

            return {
                azi: lookAngles.azimuth * satellite.constants.rad2deg,
                ele: lookAngles.elevation * satellite.constants.rad2deg,
                dopplerFactor: satellite.dopplerFactor(observerEcf, positionEcf, velocityEcf),
            }
        }
    }

    var getStatusNow = function() {
        return getStatus(new Date())
    }

    var getPasses = function(start, end) {

        var visible = false;
        var passes = [];
        var raise = 0;
        var maxElevation = 0;

        for (var i = start.getTime(); i < end.getTime(); i = i + (1000 * 60)) {
            var c = getStatus(new Date(i))
            if (c.ele >= 0 && !visible) {
                start = i;
                visible = true;
                maxElevation = 0;
            }
            if (visible && c.ele > maxElevation) {
                maxElevation = c.ele;
            }
            if (c.ele <= 0 && visible) {
                passes.push({
                    start: new Date(start),
                    end: new Date(i),
                    duration: i - start,
                    maxElevation: maxElevation
                })
                visible = false
            }
        }

        console.log(passes);
    }

    getTLE(satelliteName, function(data) {
        tle = data;
        log("TLE Available: " + data)
    })

    return {
        getStatusNow: getStatusNow,
        getPasses: getPasses
    }

}
