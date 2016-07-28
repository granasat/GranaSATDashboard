"use strict"
var satellite = require("satellite.js").satellite
var http = require('http');
var log = require('../utils/logger.js').Logger;
var Promise = require('bluebird');
var config = require('../config.js').config


module.exports = function Propagator(satelliteName, stationLng, stationLat, stationAlt) {
    var p = new Promise.defer();

    var observerGd = {
        longitude: stationLng * satellite.constants.deg2rad,
        latitude: stationLat * satellite.constants.deg2rad,
        height: stationAlt / 1000
    };

    var tle = null;

    var getTLE = function(cb) {
        // cb("1 40907U 15049J   16209.49649285  .00001020  00000-0  60086-4 0  9991\n2 40907  97.4503 215.5702 0013313 255.1280 104.8477 15.13750769 47103")
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
        var fs = require("fs")
        var path = require("path");
        fs.readFile(__dirname + '/../static/tle/noaa.txt', 'utf8', function(err, d) {
            var data = d.toString().replace(/(\s)*\r/g, "").split("\n")
            var i = data.indexOf(satelliteName)
            tle = data[i + 1] + "\n" + data[i + 2]
            log("TLE Available for " + satelliteName + ": " + data[i + 1] + " " + data[i + 2])
            p.resolve({
                getStatusNow: getStatusNow,
                getPasses: getPasses,
                getStatus: getStatus
            })
        })
    }

    var getStatus = function(atDate) {
        if (!tle) {
            return {
                error: "No TLE available",
            }
        } else {
            var tleLine1 = tle.split("\n")[0],
                tleLine2 = tle.split("\n")[1];

            var satrec = satellite.twoline2satrec(tleLine1, tleLine2);

            var positionAndVelocity = satellite.propagate(
                satrec,
                atDate.getUTCFullYear(),
                atDate.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                atDate.getUTCDate(),
                atDate.getUTCHours(),
                atDate.getUTCMinutes(),
                atDate.getUTCSeconds()
            );

            var positionEci = positionAndVelocity.position,
                velocityEci = positionAndVelocity.velocity;

            var gmst = satellite.gstimeFromDate(
                atDate.getUTCFullYear(),
                atDate.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                atDate.getUTCDate(),
                atDate.getUTCHours(),
                atDate.getUTCMinutes(),
                atDate.getUTCSeconds()
            );

            var positionEcf = satellite.eciToEcf(positionEci, gmst),
                velocityEcf = satellite.eciToEcf(velocityEci, gmst),
                observerEcf = satellite.geodeticToEcf(observerGd),
                lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf),
                dopplerFactor = satellite.dopplerFactor(observerEcf, positionEcf, velocityEcf);

            return {
                azi: lookAngles.azimuth * satellite.constants.rad2deg,
                ele: lookAngles.elevation * satellite.constants.rad2deg,
                dopplerFactor: dopplerFactor,
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

        for (var i = start.getTime(); i < end.getTime();) {
            var c = getStatus(new Date(i))
            if (c.ele >= 0 && !visible) {
                raise = i;
                visible = true;
                maxElevation = 0;
            }
            if (c.ele <= 0 && visible) {
                passes.push({
                    startDateUTC: new Date(raise).toUTCString(),
                    endDateUTC: new Date(i).toUTCString(),
                    startDate: new Date(raise).toString(),
                    endDate: new Date(i).toString(),
                    duration: i - raise,
                    maxElevation: maxElevation.toFixed(2)
                })
                raise = 0;
                visible = false;
            }
            if (visible && c.ele > maxElevation) {
                maxElevation = c.ele;
            }
            if (c.ele > -config.propagator_min_elevation && !visible) {
                i += 1000
            } else if (c.ele < config.propagator_min_elevation && visible) {
                i += 1000
            } else {
                i += (1000 * 60 * config.propagator_passes_step)
            }
        }
        return passes
    }

    getTLE()
    return p.promise
}
