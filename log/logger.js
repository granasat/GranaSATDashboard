var config = require('../config.js').config
var colors = require('colors')
var dateFormat = require('dateformat')
var fs = require('fs')


exports.Logger = function(msg, type) {

    var d = dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss");
    var s = d + " -> " + msg;

    fs.writeFile(config.log_file, s, function(err) {
        if (err) {
            console.log(d.grey + " Error: ".red + "Log file not working".red.bold);

        }
    });

    if (type == "warn") {
        console.log(d.grey + " Warn: ".yellow + msg.yellow.italic);
    } else if (type == "error") {
        console.log(d.grey + " Error: ".red + msg.red.bold);
    } else {
        console.log(d.grey + " Info: ".green + msg.green);
    }
}
