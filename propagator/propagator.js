/**
 * Last modification by Antonio Serrano (Github:antserran)
 *
 */

"use strict";
var satellite = require("satellite.js").satellite;
var log = require('../utils/logger.js').Logger;
var Promise = require('bluebird');
var config = require('../config.json');

// this is used to include 'footprint' and 'light' variables (not calculated in satellite.js library)
var jspredict = require('jspredict');

// This module will calculate satellite's parameteres (current longitude, latitude, azimuth, elevation, etc)
// and the proper passes, given TLE and QTH Groundstation (coordinates).
module.exports = function Propagator(tle1, tle2, satname, stationLng, stationLat, stationAlt) {
    var p = new Promise.defer();
    var observerGd = {
        longitude: stationLng * satellite.constants.deg2rad,
        latitude: stationLat * satellite.constants.deg2rad,
        height: stationAlt / 1000
    };

    var tle = ["", ""];


    var getTLE = function() {
        tle[0] = tle1;
        tle[1] = tle2;
        p.resolve({
            getStatusNow: getStatusNow,
            getPasses: getPasses,
            getStatus: getStatus
        })
    };


    /**
     * It returns the satellite status (azimuth, elevation, long, lat, etc), given a date
     * @param {atDate} (date to calculate satellite's status from)
     */
    var getStatus = function(atDate) {
        if (!tle) {
            return {
                error: "No TLE available"
            }
        } else {
            var tleLine1 = tle[0];
            var tleLine2 = tle[1];

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
                positionGd    = satellite.eciToGeodetic(positionEci, gmst),
                lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf),
                dopplerFactor = satellite.dopplerFactor(observerEcf, positionEcf, velocityEcf);


            // Using jspredict in order to get footprint and light
            var tle_jspredict = satname + "\n" + tle1 + "\n" + tle2;
            var data_sat = jspredict.observe(tle_jspredict, null);
            var footprint = data_sat["footprint"];
            var light = data_sat["sunlit"];

            // Returning all the data
            return {
                name : satname,
                azi: lookAngles.azimuth * satellite.constants.rad2deg,
                ele: lookAngles.elevation * satellite.constants.rad2deg,
                dopplerFactor: dopplerFactor,
                height : positionGd.height,
                latitude : satellite.degreesLat(positionGd.latitude),
                longitude : satellite.degreesLong(positionGd.longitude),
                footprint : footprint,
                light: light,
                velocity : Math.sqrt(Math.pow(velocityEci.x,2) + Math.pow(velocityEci.y,2) + Math.pow(velocityEci.z,2))

            }
        }
    };

    /**
     * It returns the satellite status (azimuth, elevation, long, lat, etc) at the current time
     * @returns {getStatus(now}
     */
    var getStatusNow = function() {
        return getStatus(new Date())
    };

    /**
     * It returns satellite's passes given a start and end date
     * @param {start} start date to calculate passes from
     * @param {end} end date to calculate passes
     */
    var getPasses = function(start, end) {

        var visible = false;
        var passes = [];
        var raise = 0;
        var maxElevation = 0;
        var data = [];

        for (var i = start.getTime(); i < end.getTime();) {
            var c = getStatus(new Date(i));
            if (c.ele >= 0 && !visible) {
                raise = i;
                visible = true;
                maxElevation = 0;
                data = []
            }
            if (c.ele <= 0 && visible) {
                passes.push({
                    startDateUTC: new Date(raise),
                    endDateUTC: new Date(i),
                    startDateLocal: new Date(raise),
                    endDateLocal: new Date(i),
                    duration: i - raise,
                    maxElevation: maxElevation.toFixed(2),
                    id : Math.random() * (10000),
                    satellite : satname,
                    data: data
                });
                raise = 0;
                visible = false;
            }
            if (visible && c.ele > maxElevation) {
                maxElevation = c.ele;
            }
            if (visible) {
                data.push(c)
            }

            if (c.ele > -config.propagator_passes_thr && !visible) {
                i += 5000
            }else if (visible) {
                i += 5000
            }else {
                i += (1000 * 60 * config.propagator_passes_step)
            }
        }
        return passes
    };

    getTLE();

    return p.promise
};
