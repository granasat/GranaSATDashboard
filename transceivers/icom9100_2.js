/**
 *
 * Created by: Antonio Serrano (github.com/antserran)
 *
 *
 */

"use strict"
var SerialPort = require("serialport");
var Promise = require('bluebird');
var log = require('../utils/logger.js').Logger;
var leftPad = require('left-pad');
var config = require('../config.json');
var async = require('async');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');


module.exports = function Icom9100(sAddress) {

    // --------------------------------------------------
    // Transceiver parameters
    // --------------------------------------------------
    var parameters = {
        freq: null,
        s_meters: null,
        rf_meter: null,
        swr: null,
        alc: null,
        comp: null,
        att: null,
        tone_squelch : null,
        tone_squelch_freq : null,
        repeater_tone : null,
        repeater_tone_freq : null,
        rf_power_position: null,
        af_position : null,
        rf_gain_level : null,
        sat_mode : null,
        sql_status : null,
        sql_position : null,
        nr : null,
        transceiver_status : null,
        operating_mode : null,
        offset_freq : null,


    };

    var serial = new SerialPort(sAddress, {
        baudRate: 19200 // the transceiver must have the same baudRate (changed from MENU)
    });

    serial.on('open', function () {
        log("ICOM 9100 serial port opened");

        // This variable is set again to 0, so when the radio turns off again an e-mail (ONLY ONE) is sent
        // to granasat@ugr.es (in the function below)
        config.email_sent = 0;

    });

    serial.on('error', function () {
        log("Unable to open ICOM 9100 serial port");

        // Sending e-mail when the radio is OFF
        if (config.email_sent == 0) {

            // Indicating that the e-mail has already been sent
            config.email_sent = 1;

            // Sending e-mail
            async.waterfall([

                // Sending e-mail
                function () {

                    var transporter = nodemailer.createTransport(smtpTransport({
                        // host: 'smtp.gmail.com',
                        host: 'smtp.ugr.es',
                        port: 587,
                        secureConnection: true,
                        auth: {
                            user: config.granasat_email,
                            pass: config.granasat_password
                        }
                    }));

                    var mailOptions = {
                        from: config.granasat_email,
                        to: config.granasat_email,
                        subject: 'Transceiver Icom9100 status',
                        html: '<h3>This e-mail is intended to inform you that the transceiver Icom9100 is currently OFF. Please turn it ON as soon as possible.\n\n</h3>'

                    };

                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            res.json({status: "error"});
                        } else {
                            log('E-mail informing about transceiver status sent to' + config.granasat_email);
                        }
                    });

                }
            ])
        }

    });

    // --------------------------------------------------------
    // Functions that implement frequency
    // --------------------------------------------------------

    /**
     * It turns the transceiver's command into readable frequency
     * @param {cmd} transceiver's command (see page 190 of manual)
     */
    function cmd2freq(cmd) {
        return parseInt(leftPad(cmd[4].toString(16), 2, 0) +
            leftPad(cmd[3].toString(16), 2, 0) +
            leftPad(cmd[2].toString(16), 2, 0) +
            leftPad(cmd[1].toString(16), 2, 0) +
            leftPad(cmd[0].toString(16), 2, 0))
    }

    /**
     * It turns the transceiver's frequency into command
     * @param {freq} transceiver's frequency in human-readable format
     */
    function freq2cmd(freq) {
        var f = leftPad(freq, 10, 0)
        var x = f.substring(8, 10) + f.substring(6, 8) + f.substring(4, 6) + f.substring(2, 4) + f.substring(0, 2)
        return x
    }

    /**
     * It reads the answer given from the transceiver
     * @param {p} promise
     */
    function readFreq(p) {
        var serialBuffer = new Buffer("");
        return function (data) {
            serialBuffer = Buffer.concat([serialBuffer, data])
            if (serialBuffer.length >= 17) {
                var freq = {
                    VFOA: cmd2freq(serialBuffer.slice(11, 16))
                }

                p.resolve(freq);
            }
        }
    }

    /**
     * It gets frequency value by using a promise, which will be
     * the frequency or an error
     * @param {cb} callback with the result
     */
    function getFreq() {

        return new Promise(function (fulfill, reject) {

            var p = new Promise.defer();

            var f = readFreq(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE003FD", "hex"))

            setTimeout(function () {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function (data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }

    /**
     * It set the operational frequency of transceiver
     * @param {freq} frequency to be set
     * @cb {callback with result}
     */
    function setFrequency(freq, cb) {
        serial.write(Buffer("FEFE7CE000" + freq2cmd(Math.round(freq.VFOA)) + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {

                parameters.freq = freq.VFOA;
                cb({
                    status: "Done"
                });
            }
        })
    }

    // --------------------------------------------------------
    // Functions that implement operating mode (AM,FM,USB,LSB, etc)
    // --------------------------------------------------------

    /**
     * It turns the transceiver's mode into command
     * @param {mode} transceiver's mode in human-readable format
     */
    function mode2cmd(mode) {

        var result;
        if (mode == "LSB") {
            result = "00"
        } else if (mode == "USB") {
            result = "01"
        } else if (mode == "AM") {
            result = "02"
        } else if (mode == "CW") {
            result = "03"
        } else if (mode == "RTTY") {
            result = "04"
        } else if (mode == "FM") {
            result = "05"
        } else if (mode == "CW-R") {
            result = "07"
        } else if (mode == "RTTY-R") {
            result = "08"
        } else if (mode == "DV") {
            result = "17"
        }

        return result
    }

    /**
     * It turns the transceiver's mode into human-readable format
     * @param {cmd} operating mode in protocol format (see page 190)
     */
    function cmd2mode(cmd) {

        var result;
        if (cmd == "00") {
            result = "LSB"
        } else if (cmd == "01") {
            result = "USB"
        } else if (cmd == "02") {
            result = "AM"
        } else if (cmd == "03") {
            result = "CW"
        } else if (cmd == "04") {
            result = "RTTY"
        } else if (cmd == "05") {
            result = "FM"
        } else if (cmd == "07") {
            result = "CW-R"
        } else if (cmd == "08") {
            result = "RTTY-R"
        } else if (cmd == "17") {
            result = "DV"
        }

        return result
    }

    function readOpMode(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 14) {
                p.resolve(cmd2mode(serialBuffer.slice(11, 12).toString('hex')))
            }
        }
    }

    /**
     * It gets operating mode value by using a promise, which will be
     * the operating mode or an error
     * @return {data} operating mode
     */
    function getOpMode() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readOpMode(p);
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE004FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });
    }

    /**
     * It sets operating mode
     * @param {mode} fm,am,lsb,usb, etc, depending on the option desired
     * @param {cb} callback with result
     */
    function setOperatingMode(mode, cb) {

        serial.write(Buffer("FEFE7CE001" + mode2cmd(mode) + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.operating_mode = mode;
                cb({
                    status: "Done"
                });
            }
        })
    }



    // --------------------------------------------------------
    // Functions that implement attenuator
    // --------------------------------------------------------

    /**
     * It activates/deactivates attenuator
     * @param {status} on/off, depending on the option desired
     * @param {cb} callback with result
     */
    function setAttenuator(status, cb) {

        var option;
        if (status == "on") {
            option = "20";
        } else if (status == "off") {
            option = "00";
        }


        serial.write(Buffer("FEFE7CE011" + option + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.att = status
                cb({
                    status: "Done"
                });
            }
        })
    }

    /**
     * It reads the answer given from the transceiver
     * @param {p} promise
     */
    function readAtt(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])
            //console.log(serialBuffer)
            if (serialBuffer.length >= 13) {
                // data consists of byte 11 (00-20)
                p.resolve((serialBuffer.slice(11, 12).toString('hex')))
            }
        }
    }

    /**
     * It gets attenuator value by using a promise, which will be
     * the attenuator status or an error
     * @return {data} atenuattor on/off (20/00)
     */
    function getAtt() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readAtt(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE011FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }

    // --------------------------------------------------------
    // Functions that implement Noise reduction (NR)
    // --------------------------------------------------------

    /**
     * It activates/deactivates noise reduction
     * @param {status} on/off, depending on the option desired
     * @param {cb} callback with result
     */
    function setNoiseReduction(status, cb) {

        var option;
        if (status == "on") {
            option = "01";
        } else if (status == "off") {
            option = "00";
        }

        serial.write(Buffer("FEFE7CE01640" + option + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.nr = status
                cb({
                    status: "Done"
                });
            }
        })
    }

    /**
     * It reads the answer given from the transceiver
     * @param {p} promise
     */
    function readNR(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])
            //console.log(serialBuffer)
            if (serialBuffer.length >= 15) {
                // data consists of byte 13 (00-01)
                p.resolve((serialBuffer.slice(13, 14).toString('hex')))
            }
        }
    }

    /**
     * It gets NR value by using a promise, which will be
     * the noise reduction status or an error
     * @return {data} on/off (01/00)
     */
    function getNR() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readNR(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE01640FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }


    // --------------------------------------------------------
    // Functions that implement Tone SQL
    // --------------------------------------------------------

    /**
     * It activates/deactivates tone squelch
     * @param {status} on/off, depending on the option desired
     * @param {cb} callback with result
     */
    function setToneSquelch(status, cb) {

        var option;
        if (status == "on") {
            option = "01";
        } else if (status == "off") {
            option = "00";
        }

        serial.write(Buffer("FEFE7CE01643" + option + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.tone_squelch = status;
                cb({
                    status: "Done"
                });
            }
        })
    }

    /**
     * It reads the answer given from the transceiver
     * @param {p} promise
     */
    function readToneSQL(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 15) {
                // data consists of byte 13 (00-01)
                p.resolve((serialBuffer.slice(13, 14).toString('hex')))
            }
        }
    }

    /**
     * It gets tone squelch value by using a promise, which will be
     * the attenuator status or an error
     * @return {data} tone squelch on/off (01/00)
     */
    function getToneSQL() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readToneSQL(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE01643FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }

    /**
     * It activates/deactivates repeater tone
     * @param {status} on/off, depending on the option desired
     * @param {cb} callback with result
     */
    function setRepeaterTone(status, cb) {

        var option;
        if (status == "on") {
            option = "01";
        } else if (status == "off") {
            option = "00";
        }

        serial.write(Buffer("FEFE7CE01642" + option + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.repeater_tone = status;
                cb({
                    status: "Done"
                });
            }
        })
    }


    /**
     * It reads the answer given from the transceiver
     * @param {p} promise
     */
    function readRepeaterTone(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 15) {
                // data consists of byte 13 (00-01)
                p.resolve((serialBuffer.slice(13, 14).toString('hex')))
            }
        }
    }

    /**
     * It gets repeater tone value by using a promise, which will be
     * the attenuator status or an error
     * @return {data} repeater tone status on/off (01/00)
     */
    function getRepTone() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readRepeaterTone(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE01642FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }


    /**
     * It reads the answer given from the transceiver
     * @param {p} promise
     */
    function readSQLToneFreq(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 17) {
                p.resolve(cmd2freqTone(serialBuffer.slice(14, 16).toString('hex')));
            }
        }
    }

    /**
     * It gets repeater tone value by using a promise, which will be
     * the attenuator status or an error
     * @return {data} repeater tone status on/off (01/00)
     */
    function getSQLToneFreq() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readSQLToneFreq(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE01B01FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }

    /**
     * It sets tone squelch frequency
     * @param {freq} desired frequency to be set
     * @param {cb} callback with result
     */
    function setToneSquelchFrequency(freq, cb) {

        serial.write(Buffer("FEFE7CE01B01" + freqRepeater2cmd(freq) + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.tone_squelch_freq = freq
                cb({
                    status: "Done"
                });
            }
        })
    }



    function freqRepeater2cmd(freq) {

        // Removing dot(.) from freq
        var aux = "";

        for (var i = 0; i<freq.length; i++) {
            if (freq[i] != ".") {
                aux += freq[i]
            }
        }

        var f = leftPad(aux, 4, 0)
        var x = f.substring(0, 2) + f.substring(2, 4)
        return x
    }



    function cmd2freqTone(cmd) {

        var aux = ""

        if (cmd[0] != '0') {aux += cmd[0]}
        aux +=  cmd.substring(1,3) + "." + cmd[3]

        return aux;
    }


    /**
     * It reads the answer given from the transceiver
     * @param {p} promise
     */
    function readRepeaterToneFreq(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 17) {
                p.resolve(cmd2freqTone(serialBuffer.slice(14, 16).toString('hex')));
            }
        }
    }

    /**
     * It gets repeater tone value by using a promise, which will be
     * the attenuator status or an error
     * @return {data} repeater tone status on/off (01/00)
     */
    function getRepeaterToneFreq() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readRepeaterToneFreq(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE01B00FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }



    /**
     * It sets repeater tone frequency
     * @param {freq} desired frequency to be set, it needs to be in the format
     * seen in page 193. For example, if the desired frequency is 8.85Hz, "freq"
     * will be "0885", that is, four digits always.
     * @param {cb} callback with result
     */
    function setRepeaterToneFrequency(freq, cb) {

        serial.write(Buffer("FEFE7CE01B00" + freqRepeater2cmd(freq) + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.repeater_tone_freq = freq
                cb({
                    status: "Done"
                });
            }
        })
    }

    /**
     * It reads the answer given from the transceiver
     * @param {p} promise
     */
    function readOffset(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 17) {
                p.resolve(cmd2freqOffset(serialBuffer.slice(17, 20).toString('hex')));
            }
        }
    }

    /**
     * It gets repeater tone value by using a promise, which will be
     * the attenuator status or an error
     * @return {data} repeater tone status on/off (01/00)
     */
    function getOffset() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readOffset(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE01A050017FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }


    /**
     * It parses freq into transceiver command
     * @param {freq} frequency to be changed
     */
    function freqOffset2cmd(freq) {

        // Removing dot(.) from freq
        var aux = "";
        for (var i = 0; i<freq.length; i++) {
            if (freq[i] != ".") {
                aux += freq[i]
            }
        }

        var f = leftPad(aux, 6, 0)
        var x = f.substring(4, 6) + f.substring(2, 4) + f.substring(0, 2)
        return x
    }


    /**
     * It parses transceiver command into readable freq
     * @param {cmd} command to be parsed
     */
    function cmd2freqOffset(cmd) {

        var aux = ""
        aux = cmd[5] + "." + cmd.substring(2,4) + cmd.substring(0,2);
        return aux;
    }


    /**
     * It sets Duplex offset frequency
     * @param {freq} desired frequency to be set, it needs to be in the format
     * @param {cb} callback with result
     */
    function setOffSet(freq, cb) {

        serial.write(Buffer("FEFE7CE00D" + freqOffset2cmd(freq) + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.offset_freq = freq;
                cb({
                    status: "Done"
                });
            }
        })
    }


    // --------------------------------------------------------
    // Functions that implement s-meters, RF, SWR, ALC and COMP commands (METERS)
    // --------------------------------------------------------

    /**
     * It parses the command given from the transceiver, in order
     * to get a number between 0000 and 0255 (see command on icom9100
     * instruction manual, page 185)
     * @param {cmd} data from transceiver to be parsed, it could be:
     * 15 01, 15 02, 15 11, 15 12, 15 13, 15 14
     * @returns {s} data parsed
     */
    function cmd2data(cmd) {

        var s = parseInt((cmd[0]).toString(16) + (cmd[1]).toString(16))
        return s
    }

    /**
     * It reads the answer given from the transceiver
     * @param {p} promise
     */
    function readMeters(p) {

        var serialBuffer = new Buffer("");
        return function (data) {

            serialBuffer = Buffer.concat([serialBuffer, data])
            if (serialBuffer.length >= 16) {
                //console.log(serialBuffer)

                // data consists of bytes 13-14
                var data = cmd2data(serialBuffer.slice(13, 15))
                p.resolve(data); // Resolving promise
            }
        }
    }


    /**
     * It gets meters value by using a promise, which will be
     * data meters value or an error
     * @return {data} meter value (0000-0255)
     */
    function getMeters(meters) {

        return new Promise(function (fulfill, reject) {


            var p = new Promise.defer();

            var f = readMeters(p)
            serial.on('data', f); // opening serial buffer to listen

            // Sending command (see table of commands in icom9100 guide, pag 185)
            var command;
            if (meters == "s_meters") {
                command = "FEFE7CE01502FD"
            } else if (meters == "rf") {
                command = "FEFE7CE01511FD"
            } else if (meters == "swr") {
                command = "FEFE7CE01512FD"
            } else if (meters == "alc") {
                command = "FEFE7CE01513FD"
            } else if (meters == "comp") {
                command = "FEFE7CE01514FD"
            }

            // Sending command to the serial
            serial.write(Buffer(command, "hex"))

            // If there is no answer in 1s, the result will be an error
            setTimeout(function () {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            // Getting promise and sending result with callback
            p.promise.then(function (data) {
                serial.removeListener('data', f); // removing listener

                fulfill(data); // Returning data

            });
        });
    }


    // --------------------------------------------------------
    // Functions that implement RF-power position
    // --------------------------------------------------------

    function readRF_Power(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 16) {
                //console.log(serialBuffer)
                p.resolve(cmd2data(serialBuffer.slice(13, 15)))

            }
        }
    }

    /**
     * It gets rf power output value by using a promise, which will be
     * rf power value or an error
     * @return {data} rf power value (0000-0255)
     */
    function getRF_Power() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readRF_Power(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE0140AFD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }

    /**
     * It set rf power output value
     * @param {value} rf power value (0-100%)
     * @param {cb} callback with result
     */
    function setRF_Power(value, cb) {

        // Adjusting to 0000-0255
        value = Math.round(value * 255 / 100);
        value = leftPad(value, 4, 0);

        serial.write(Buffer("FEFE7CE0140A" + value + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.rf_power_position = value
                cb({
                    status: "Done"
                });
            }
        })
    }

    // --------------------------------------------------------
    // Functions that implement AF-power position
    // --------------------------------------------------------

    function readAF(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 16) {
                //console.log(serialBuffer)
                p.resolve(cmd2data(serialBuffer.slice(13, 15)))

            }
        }
    }

    /**
     * It gets af value by using a promise, which will be
     * af power value or an error
     * @param {value} af value (0-100%)
     * @param {cb} callback with result
     */
    function getAF() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readAF(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE01401FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }

    /**
     * It sets af value
     * @param {value} af value (0-100%)
     * @param {cb} callback with result
     */
    function setAF(value, cb) {

        // Adjusting to 0000-0255
        value = Math.round(value * 255 / 100);
        value = leftPad(value, 4, 0);

        serial.write(Buffer("FEFE7CE01401" + value + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {

                parameters.af_position = value
                cb({
                    status: "Done"
                });
            }
        })
    }


    // --------------------------------------------------------
    // Functions that implement [RF/SQL] position (gain level)
    // --------------------------------------------------------

    /**
     * It sets rf gain level
     * @param {value} rf gain level value (0-100%)
     * @param {cb} callback with result
     */
    function setRFGainLevel(value, cb) {

        // Adjusting to 0000-0255
        value = Math.round(value * 255 / 100);
        value = leftPad(value, 4, 0);

        serial.write(Buffer("FEFE7CE01402" + value + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.rf_sql_position = value

                cb({
                    status: "Done"
                });
            }
        })
    }

    function readRFGainLevel(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 16) {
                //console.log(serialBuffer)
                p.resolve(cmd2data(serialBuffer.slice(13, 15)))

            }
        }
    }

    /**
     * It gets rf gain level value, which will be the rf gain value
     * or an error
     * @return {data} rf gain value
     */
    function get_RFGainLevel() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readRFGainLevel(p);
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE01402FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }

    // --------------------------------------------------------
    // Functions that implement [RF/SQL] position (SQL position)
    // --------------------------------------------------------

    /**
     * It sets squelch position
     * @param {value} squelch position value (0-100%)
     * @param {cb} callback with result
     */
    function setSQLPosition(value, cb) {

        // Adjusting to 0000-0255
        value = Math.round(value * 255 / 100);
        value = leftPad(value, 4, 0);

        serial.write(Buffer("FEFE7CE01403" + value + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.sql_position = value;

                cb({
                    status: "Done"
                });
            }
        })
    }

    function readSQLPost(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 16) {
                //console.log(serialBuffer)
                p.resolve(cmd2data(serialBuffer.slice(13, 15)))

            }
        }
    }

    /**
     * It gets the squelch position or an error, if so
     * @return {data} squelch position
     */
    function getSQLPos() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readSQLPost(p);
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE01403FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }

    // --------------------------------------------------------
    // Functions that implement satellite mode
    // --------------------------------------------------------
    /**
     * It activates/deactivates satellite mode
     * @param {status} on/off, depending on the option desired
     * @param {cb} callback with result
     */
    function setSatelliteMode(status, cb) {

        var option;
        if (status == "on") {
            option = "01";
        } else if (status == "off") {
            option = "00";
        }


        serial.write(Buffer("FEFE7CE0165A" + option + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.sat_mode = status;
                cb({
                    status: "Done"
                });
            }
        })
    }

    /**
     * It reads the answer given from the transceiver
     * @param {p} promise
     */
    function readSatMode(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])
            //console.log(serialBuffer)
            if (serialBuffer.length >= 15) {
                // data consists of byte 13 (00-01)
                p.resolve((serialBuffer.slice(13, 14).toString('hex')))
            }
        }
    }

    /**
     * It gets satellite mode value by using a promise, which will be
     * the satellite mode status or an error
     * @param {cb} callback with the result
     */
    function getSatMode() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readSatMode(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE0165AFD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }

    // --------------------------------------------------------
    // Functions that implement USB Squelch status (command 1A.05.0053 - pag 186)
    // --------------------------------------------------------
    /**
     * It activates/deactivates USB Squelch
     * @param {status} on/off, depending on the option desired
     * @param {cb} callback with result
     */
    function setSQLStatus(status, cb) {

        var option;
        if (status == "on") {
            option = "01";
        } else if (status == "off") {
            option = "00";
        }

        serial.write(Buffer("FEFE7CE01A050053" + option + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.sql_status = status;
                cb({

                    status: "Done"
                });
            }
        })
    }

    function readSQLStatus(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 19) {
                p.resolve((serialBuffer.slice(17, 18).toString('hex')))
            }
        }
    }


    /**
     * It gets USB Squelch status
     * @return {data} usb squelch status (00/01)
     */
    function getSQLStatus() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readSQLStatus(p)
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE01A050053FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }

    // --------------------------------------------------------
    // Functions that implement Rx/Tx
    // --------------------------------------------------------

    /**
     * It sets transceiver status to Tx (transmit) or Rx (receive)
     * @param {status} rx/tx
     * @param {cb} callback with result
     */
    function setTransceiverStatus(status, cb) {

        var option;
        if (status == "rx") {
            option = "00";
        } else if (status == "tx") {
            option = "01";
        }

        serial.write(Buffer("FEFE7CE01C00" + option + "FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {
                parameters.transceiver_status = status;

                cb({
                    status: "Done"
                });
            }
        })
    }

    function readStatus(p) {
        var serialBuffer = new Buffer("");
        return function(data) {
            serialBuffer = Buffer.concat([serialBuffer, data])

            if (serialBuffer.length >= 14) {
                p.resolve((serialBuffer.slice(13, 14).toString('hex')))
            }
        }
    }

    /**
     * It gets transceiver's status (Tx (transmit) or Rx (receive)), or error
     * if so
     * @param {data} transceiver's status (00/01)
     */
    function getStatus() {

        return new Promise(function (fulfill, reject){

            var p = new Promise.defer();

            var f = readStatus(p);
            serial.on('data', f);

            serial.write(new Buffer("FEFE7CE01C00FD", "hex"))

            setTimeout(function() {
                p.resolve({
                    error: "Timeout"
                });
            }, 1000);

            p.promise.then(function(data) {
                serial.removeListener('data', f);

                fulfill(data); // Returning data

            });

        });

    }

    // --------------------------------------------------------
    // Functions that implement MAIN/SUB bands
    // --------------------------------------------------------

    /**
     * It sets the main band
     * @param {cb} callback with result
     */
    function setMainBand(cb) {

        serial.write(Buffer("FEFE7CE007D0FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {

                //parameters.transceiver_status = status;

                cb({
                    status: "Done"
                });
            }
        })
    }

    /**
     * It sets the sub band
     * @param {cb} callback with result
     */
    function setSubBand(cb) {

        serial.write(Buffer("FEFE7CE007D1FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {

                //parameters.transceiver_status = status;

                cb({
                    status: "Done"
                });
            }
        })
    }

    /**
     * It exchanges main and sub bands
     * @param {cb} callback with result
     */
    function exchangeBands(cb) {

        serial.write(Buffer("FEFE7CE007B0FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {

                //parameters.transceiver_status = status;

                cb({
                    status: "Done"
                });
            }
        })
    }


    // --------------------------------------------------------
    // Functions that implement DUP
    // --------------------------------------------------------
    function setSimplexOperation(cb) {

        serial.write(Buffer("FEFE7CE00F10FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {

                cb({
                    status: "Done"
                });
            }
        })
    }

    function setDUPMinusOperation(cb) {

        serial.write(Buffer("FEFE7CE00F11FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {

                cb({
                    status: "Done"
                });
            }
        })
    }

    function setDUPPlusOperation(cb) {

        serial.write(Buffer("FEFE7CE00F12FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {

                cb({
                    status: "Done"
                });
            }
        })
    }

    // --------------------------------------------------------
    // Functions that implement tuning steps
    // --------------------------------------------------------
    function setTuningStep12KHZ(cb) {

        serial.write(Buffer("FEFE7CE01007FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {

                //parameters.transceiver_status = status;

                cb({
                    status: "Done"
                });
            }
        })
    }

    function setTuningStep25KHZ(cb) {

        serial.write(Buffer("FEFE7CE01009FD", "hex"), function (err) {
            if (err) {
                console.log("Error writing to ICOM 9100", "error")
                cb({
                    error: "Serial Write"
                });
            } else {

                //parameters.transceiver_status = status;

                cb({
                    status: "Done"
                });
            }
        })
    }

    // --------------------------------------------------------
    // --------------------------------------------------------

    /**
     * It updates transceiver's parameters every second
     * Notice: promises are used because the serial port must
     * be accessed only once per data required
     */
    setInterval(function () {

        // Calling get functions (one by one)
        getFreq().then(function (data) {
            //console.log('freq =', data);
            parameters.freq = data;
            return getMeters("s_meters");
        }).then(function (data) {
            //console.log('s_meters = ', data);
            parameters.s_meters = data;
            return getMeters("rf");
        }).then(function (data) {
            //console.log('rf_meter =', data);
            parameters.rf_meter = data;
            return getMeters("swr");
        }).then(function (data) {
            //console.log('swr =', data);
            parameters.swr = data;
            return getMeters("alc");
        }).then(function (data) {
            parameters.alc = data;
            //console.log("alc =", data);
            return getMeters("comp");
        }).then(function (data) {
            parameters.comp = data;
            //console.log("comp =", data);
            return getAtt();
        }).then(function (data){
            //console.log("att =", data)
            parameters.att = data;
            return getToneSQL();
        }).then(function (data){
            //console.log("squelch_tone =", data)
            parameters.squelch_tone = data;
            return getAF();
        }).then(function (data) {
            //console.log("af =", data)
            parameters.af_position = data;
            return getRF_Power();
        }).then (function (data) {
            //console.log("rf power =", data)
            parameters.rf_power_position = data;
            return get_RFGainLevel();
        }).then(function (data) {
            //console.log("rf_gain_level =", data)
            parameters.rf_gain_level = data;
            return getSatMode();
        }).then(function (data) {
            //console.log("sat_mode =", data)
            parameters.sat_mode = data;
            return getSQLStatus();
        }).then(function (data) {
            //console.log("sql_status =", data)
            parameters.sql_status = data;
            return getSQLPos();
        }).then(function (data) {
            //console.log("sql_position =", data)
            parameters.sql_position = data;
            return getStatus();
        }).then(function (data) {
            if (data == '00'){
                parameters.transceiver_status = 'rx';
            } else if (data == '01'){
                parameters.transceiver_status = 'tx';
            }

            return getNR();
        }).then(function(data){
            parameters.nr = data;
            return getOpMode();
        }).then(function (data){
            //console.log("op_mode =", data)
            parameters.operating_mode = data;
            return getToneSQL();
        }).then(function (data){
            //console.log("tone_squelch =", data)
            parameters.tone_squelch = data;
            return getRepTone();
        }).then(function(data) {
            //console.log("repeater_tone =", data)
            parameters.repeater_tone = data;
            return getOffset()
        }).then (function (data){
            //console.log("offset_freq = ", data);
            parameters.offset_freq = data;
            return getRepeaterToneFreq();
        }).then (function (data){
            //console.log("repeater freq = ", data);
            parameters.repeater_tone_freq = data;
            return getSQLToneFreq();
        }).then (function (data) {
            //console.log("sql tone freq = ", data);
            parameters.tone_squelch_freq = data;
        });

    }, 1000);


    /**
     * Get methods, they return transceiver's parameters
     */
    function getSMeters(cb) {
        return cb(parameters.s_meters);
    }

    function getRFMeter(cb) {
        return cb(parameters.rf_meter);
    }

    function getSWR(cb) {
        return cb(parameters.swr);
    }

    function getALC(cb) {
        return cb(parameters.alc);
    }

    function getCOMP(cb) {
        return cb(parameters.comp);
    }

    function getFrequency(cb) {
        return cb(parameters.freq);
    }

    function getAttenuator(cb) {
        return cb(parameters.att);
    }

    function getToneSquelch(cb) {
        return cb(parameters.tone_squelch);
    }

    function getRepeaterTone(cb) {
        return cb(parameters.repeater_tone);
    }

    function getNoiseReduction(cb) {
        return cb(parameters.nr);
    }

    function getAFPosition(cb) {
        return cb(parameters.af_position);
    }

    function getRFGainLevel(cb) {
        return cb(parameters.rf_gain_level);
    }

    function getRFPowerPosition(cb) {
        return cb(parameters.rf_power_position);
    }

    function getSatelliteMode(cb) {
        return cb(parameters.sat_mode);
    }

    function getSQL(cb) {
        return cb(parameters.sql_status);
    }

    function getSQLPosition(cb) {
        return cb(parameters.sql_position);
    }

    function getTransceiverStatus(cb) {
        return cb(parameters.transceiver_status);
    }

    function getOperatingMode(cb){
        return cb(parameters.operating_mode);
    }

    function getRepeaterTone(cb){
        return cb(parameters.repeater_tone);
    }

    function getOffSetFrequency(cb){
        return cb(parameters.offset_freq);
    }

    function getRepeaterToneFrequency(cb) {
        return cb(parameters.repeater_tone_freq);
    }

    function getSQLToneFrequency(cb) {
        return cb(parameters.tone_squelch_freq);
    }

    return {
        setTransceiverStatus : setTransceiverStatus,
        getTransceiverStatus : getTransceiverStatus,
        getFrequency: getFrequency,
        setFrequency: setFrequency,
        getOperatingMode : getOperatingMode,
        setOperatingMode : setOperatingMode,
        setAttenuator: setAttenuator,
        getAttenuator: getAttenuator,
        getToneSquelch : getToneSquelch,
        setToneSquelch : setToneSquelch,
        setToneSquelchFrequency : setToneSquelchFrequency,
        getSQLToneFrequency : getSQLToneFrequency,
        setRepeaterToneFrequency : setRepeaterToneFrequency,
        getRepeaterToneFrequency : getRepeaterToneFrequency,
        setRepeaterTone : setRepeaterTone,
        getRepeaterTone : getRepeaterTone,
        setOffSet : setOffSet,
        getOffSetFrequency : getOffSetFrequency,
        getNoiseReduction : getNoiseReduction,
        setNoiseReduction : setNoiseReduction,
        getSQL : getSQL,
        setSQLStatus : setSQLStatus,
        setRFGainLevel : setRFGainLevel,
        setRF_Power : setRF_Power,
        getSQLPosition : getSQLPosition,
        setSQLPosition : setSQLPosition,
        setAF : setAF,
        getSMeters: getSMeters,
        getRFMeter: getRFMeter,
        getSWR : getSWR,
        getALC : getALC,
        getCOMP : getCOMP,
        getAFPosition : getAFPosition,
        getRFGainLevel : getRFGainLevel,
        getRFPowerPosition : getRFPowerPosition,
        getSatelliteMode : getSatelliteMode,
        setSatelliteMode : setSatelliteMode,
        setSimplexOperation : setSimplexOperation,
        setDUPMinusOperation : setDUPMinusOperation,
        setDUPPlusOperation : setDUPPlusOperation,
        setMainBand : setMainBand,
        setSubBand : setSubBand,
        exchangeBands : exchangeBands,
        setTuningStep25KHZ : setTuningStep25KHZ,
        setTuningStep12KHZ : setTuningStep12KHZ
    }

};