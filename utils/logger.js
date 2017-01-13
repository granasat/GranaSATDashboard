var config = require('../config.js').config
var colors = require('colors')
var dateFormat = require('dateformat')
var fs = require('fs')


exports.Logger = function(msg, type) {

    var d = dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss");
    var s = d + " -> " + msg + "\n";

    fs.appendFile(config.log_file, s, function (err) {
      if (err){
          console.log(d.grey + " Log file Error: ".red + err.red);
      }
    });

    if (type == "warn") {
        console.log(d.grey + " Warn: ".yellow + msg.yellow.italic);
    } else if (type == "error") {
        console.log(d.grey + " Error: ".red + msg.red);
    } else {
        console.log(d.grey + " Info: ".green + msg.green);
    }
}

exports.APRSLogger = function(msg) {

    var d = dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss");
    var s = d + " -> " + msg + "\n";

    fs.appendFile(config.aprs_log_file, s, function (err) {
      if (err) throw err;
    });

}
