/**
 * Created by amil101 on 31/08/17.
 */

/**
 * Recordings will handle the information of the recordings. It will be accessing to a json that handle this data.
 * If the json is missing, it will be create. If the data in jsonPath is corrupt, it will delete the json a create it
 * another time.
 *
 * @param jsonPath {String} - Path of the json with the info of the passes in recordings folder
 * @param recDir {String} - Directory path of recordings directory
 */

var log = require('../utils/logger.js').Logger;
var fs = require('fs');
var path = require('path');

module.exports = function Recordings(jsonName, recDir){

    var jsonPath = path.join(recDir, jsonName);
    var json;

    if(!fs.existsSync(jsonPath)){
        createJson();
    }
    else{
        log("[Recordings.js] Loading previous json file");
        json = require(jsonPath);
    }

    /**
     * Create the json in jsonName with the information in recDir
     */
    function createJson(){
        log("[Recordings.js] Creating JSON of recordings", "warn");

        json = [];

        fs.readdir(recDir, function (err, files) {
            if(!err){
                files.forEach(function (el, index, array) {
                    var spName = el.split(".");

                    if(spName[1] === 'wav'){
                        var record = {};

                        record.name = spName[0];
                        record.fullName = el;
                        record.id = Math.random() * (10000);

                        log("[Recordings.js] Adding " + el + " to " + jsonName);

                        json.push(record);
                    }

                    if(index === array.length - 1){
                        var resultJSON = JSON.stringify(json, undefined, 2);

                        fs.writeFile(jsonPath, resultJSON, function (err) {
                            if (err){
                                log(err.toString(), "error");
                            }
                            else{
                                log("[Recordings.js] data.json created");
                            }

                        })
                    }
                });
            }
        })
    }

    /**
     * Add a new recording to jsonName
     */
    function addRecording(file, data) {
        if(data){
            var spName = file.split(".");

            var record = {};

            record.name = spName[0];
            record.fullName = file;
            record.id = data.id;
            record.satellite = data.satellite;
            record.startDateUTC = data.info.startDateUTC;
            record.startDateLocal = data.info.startDateLocal;
            record.duration = data.info.duration;

            log("[Recordings.js] Adding " + file + " to " + jsonName);

            json.push(record);

            var resultJSON = JSON.stringify(json, undefined, 2);

            fs.writeFile(jsonPath, resultJSON, function (err) {
                if (err){
                    log(err.toString(), "error");
                }
                else{
                    log("[Recordings.js] data.json created");
                }
            });
        }
    }

    /**
     * Delete a recorgin in jsonName and in recDir
     */
    function delRecording(){

    }

    /**
     * Get the info of a recording: id, Name, path, Duration, etc.
     */
    function getRecording(id){
        var record = json.find(function (el) {
            return el.id.toString() === id.toString();
        });

        return path.join(recDir, record.fullName);
    }


    /**
     * Get all recordings info: id, Name, path, Duration, etc.
     */
    function getRecordings(){

        console.log(json);

        return json;
    }

    //Public methods
    return {
        addRecording : addRecording,
        getRecordings : getRecordings,
        getRecording : getRecording
    }
};