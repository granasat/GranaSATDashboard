/**
 * Created by amil101 on 5/07/17.
 */
"use strict"

var fs = require('fs');
var readline = require('readline');


/**
 * Create and fill data store models.
 *
 * this fuinction scan for satellite data and stores them in tree models
 * that can be displayed in a tree view. The scan is performed in two iterations:
 *
 * (1) First, all .sat files are scanned, read and added to a pseudo-group called
 *     "all" satellites.
 * (2) After the first scane, the function scans and reads .cat files and creates
 *     the groups accordingly.
 *
 * For each group (including the "all" group) and entry is added to the
 * selector->groups GtkComboBox, where the index of the entry corresponds to
 * the index of the group model in selector->models.
 */

module.exports = function create_and_fill_models(){
    function getSatInfo() {
        return new Promise(function(resolve, reject){
            var all = [];
            fs.readdirSync("sat_library/satdata").forEach(function (elem) {
                if(elem.indexOf(".sat") !== -1){
                    //Now read the name of the satelite inside .sat
                    var data = {};

                    var rl = readline.createInterface({
                        input: fs.createReadStream("sat_library/satdata/" + elem),
                        output: process.stdout
                    });

                    var i = 0;
                    rl.on('line', function (line) {
                        if(i == 0)
                            data.cat = elem.split(".")[0];
                        else if(i == 1)
                            data.version = line.split("=")[1];
                        else if(i == 2)
                            data.name = line.split("=")[1];
                        else if(i == 3)
                            data.nick = line.split("=")[1];
                        else if(i == 4)
                            data.tle1 = line.split("=")[1];
                        else if(i == 5)
                            data.tle2 = line.split("=")[1];
                        i++
                    });

                    all.push(data);

                    rl.on('close', function () {
                        resolve(all);
                    });
                }
            })
        });
    };

    function genCatInfo(cat, group){
        return new Promise(function(resolve, reject){
            var data = {};

            data.group = group;     //Add the group to the sat

            var rl = readline.createInterface({
                input: fs.createReadStream("sat_library/satdata/" + cat + ".sat")
            });

            var i = 0;
            rl.on('line', function (line) {
                if(i == 0)
                    data.cat = cat;
                else if(i == 1)
                    data.version = line.split("=")[1];
                else if(i == 2)
                    data.name = line.split("=")[1];
                else if(i == 3)
                    data.nick = line.split("=")[1];
                else if(i == 4)
                    data.tle1 = line.split("=")[1];
                else if(i == 5)
                    data.tle2 = line.split("=")[1];
                i++
            });

            rl.on('close', function () {
                resolve(data);
            })
        });
    };

    var getGroups = new Promise(function(resolve, reject){
        var groups = [];
        //Leo los .cat
        fs.readdirSync("sat_library/satdata").forEach(function (elem) {
            if (elem.indexOf(".cat") !== -1) {
                var rl = readline.createInterface({
                    input: fs.createReadStream("sat_library/satdata/" + elem),
                    output: process.stdout
                });

                var data = {};
                data.cat = [];

                rl.on('line', function (line) {
                    if (isNaN(line)) {
                        data.group = line;
                    }
                    else{
                        data.cat.push(line);
                    }
                });

                groups.push(data);

                rl.on('close', function () {
                    resolve(groups);
                })
            }
        });
    });

    /** Get sat info with the group name, first of all we take the .cat files
     * and for every category name we search it (catname.sat) and generate her
     * data with the group name.
     */

    function getSatInfoWithDesc(cb){
        var all = [];

        getGroups.then(function (groups) {
            groups.forEach(function (catGroup) {
                catGroup.cat.forEach(function (cat) {
                    genCatInfo(cat, catGroup.group).then(function (satInfo) {
                        all.push(satInfo);
                    });
                });
            });
        });

        cb(all);
    }

    //Public methods
    return {
        getSatInfo: getSatInfo,
        getSatInfoWithDesc: getSatInfoWithDesc
    }
};