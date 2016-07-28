"use strict"
var satellite = require("satellite.js").satellite
var http = require('http');
var log = require('../utils/logger.js').Logger;
var Promise = require('bluebird');
var config = require('../config.js').config

module.exports = function Propagator(satelliteName, stationLng, stationLat, stationAlt, db) {
    var p = new Promise.defer();

    var observerGd = {
        longitude: stationLng * satellite.constants.deg2rad,
        latitude: stationLat * satellite.constants.deg2rad,
        height: stationAlt / 1000
    };

    var tle = ["",""];

    var getTLE = function() {

        db.getSatelliteTLE(satelliteName, function(data) {
            // log("DB answer TLE for: " + satelliteName)
            console.log(data);

            if (!data.error) {
                tle[0] = data.SAT_TLE1
                tle[1] = data.SAT_TLE2
                console.log(tle);
                p.resolve({
                    getStatusNow: getStatusNow,
                    getPasses: getPasses,
                    getStatus: getStatus
                })
            } else {
                log("TLE retrievement error", "error")
            }
        })
    }

    var getStatus = function(atDate) {
        if (!tle) {
            return {
                error: "No TLE available",
            }
        } else {
            var tleLine1 = tle[0],
                tleLine2 = tle[1];

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

            console.log("PROPAGATE:");
            console.log(positionAndVelocity);

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
