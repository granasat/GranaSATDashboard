/**
 * Created by amil101 on 28/06/17.
 */
app.directive('satellitesMenu', function($http, $document, $uibModal) {
    function link(scope, element, attrs) {
        scope.$watch("logged", function(newValue, oldValue) {           //Execute when the user is logged, call for satellites in db
            if (newValue == true) {
                //scope.updateSatellites();
                scope.importSats();
                scope.importModes();
            }
        });

        /** Update passes from database and return the updated passes
         */
        scope.updateSatellites = function () {
            return $http({
                method: 'GET',
                url: "/updateSatellites"
            }).then(function (res) {
                scope.passes = res.data;
            });
        };

        scope.formatDDMMYYYY = function(date){
            return date.getDate() +
                "/" +  (date.getMonth() + 1) +
                "/" +  date.getFullYear();
        };

        /** Import satellites from a json in Satlibrary, this info is imported from db.satnogs.org and celestrak
         */
        scope.importSats = function () {
            scope.getSatLibrary().then(function (res) {
                scope.importedSats = res.data;
            });
        };

        scope.importModes = function () {
            scope.getModes().then(function (res) {
                scope.satModes = res.data;
            })
        };

        scope.addSatModal = function() {
            scope.items = {};
            scope.items.importedSats = scope.importedSats;       //Show the box to import satellites from SatLibrary
            scope.items.satModes = scope.satModes;          //Import available modes
            var addSatModalInstance = $uibModal.open({
                animation: scope.animationsEnabled,
                templateUrl: 'addSatModal.html',
                controller: 'addSatModalController as c',
                size: "lg",
                resolve: {
                    items: function() {
                        return scope.items;
                    }
                }
            });

            addSatModalInstance.result.then(function(data) {
                scope.addSatellite(data).then(function (res) {      //Send a request to node for adding a new satellite
                    if (res.data.status === "Done") {   //It has been added to DB in node, so we added it locally
                        // Due to calculating passes is a lot of time, we request to the server to add a satellite, if the database callback
                        // is ok we modify in the user app while the server is calculating passes and when it finished we put
                        // the data from the server into the app
                        scope.passes.push(data);        //Add locally

                        scope.updateSatellites();       //Request to node for sending to the user the updated passes
                    }
                    else{
                        window.alert("Database error");
                    }
                });
            });
        };
        
        scope.modSatModal = function (sat_data) {           //Don't show import box
            scope.items = {};
            scope.items.satdata = sat_data;
            scope.items.satModes = scope.satModes;          //Import available modes
            var modSatModalInstance = $uibModal.open({
                animation: scope.animationsEnabled,
                templateUrl: 'addSatModal.html',
                controller: 'addSatModalController as c',
                size: "lg",
                resolve: {
                    items: function() {
                        return scope.items;
                    }
                }
            });

            modSatModalInstance.result.then(function(data) {
                //Check if the data is correct
                if(data.rx < 0 || data.tx < 0)
                    alert("RX or TX freq not correct");
                else {
                    scope.modSatellite(data).then(function (res) {  //Send a request to node for adding a new satellite
                        if (res.data.status === "Done") {        //It has been added to DB in node, so we added it locally
                            // Due to calculating passes is a lot of time, we request to the server to modify a satellite, if the database callback
                            // is ok we modify in the user app while the server is calculating passes and when it finished we put
                            // the data from the server into the app

                            var index = scope.passes.findIndex(function (sat){
                               return data.SAT_CAT === sat.SAT_CAT
                            });

                            if(index !== -1)
                                scope.passes[index] = data;     //Modify locally

                            scope.updateSatellites();           //Request to node for sending to the user the updated passes
                        }
                        else{
                            window.alert("Database error");
                        }
                    });
                }
            });
        };

        scope.delSat = function(sat_data){
            return $http({
                method: 'POST',
                url: "/delSatellites",
                data: {SAT_CAT : sat_data.SAT_CAT}
            }).then(function (res) {
                if(res.data.status === "Done"){
                    // Due to calculating passes is a lot of time, we request to the server to delete a satellite, if the database callback
                    // is ok we modify in the user app while the server is calculating passes and when it finished we put
                    // the data from the server into the app
                    scope.passes = scope.passes.filter(function (sat) {         //Modify locally
                        return sat.SAT_CAT !== sat_data.SAT_CAT;
                    });

                    scope.updateSatellites();       //Request to node for sending to the user the updated passes
                }
                else{
                    window.alert("Database error");
                }
            });
        };

    }
    return {
        link: link,
        templateUrl: 'directives/satellitesMenu/satellitesMenu.html'
    };
});

app.controller('addSatModalController', function($scope, $uibModalInstance, items) {

    $scope.satModes = items.satModes;           //Available modes
    var tLenght = $scope.satModes.length/3;

    //Split the array in 3 for the dropdown menu
    $scope.modes = [$scope.satModes.slice(0, Math.round(tLenght)),
                    $scope.satModes.slice(Math.round(tLenght), Math.round(tLenght) * 2),
                    $scope.satModes.slice(Math.round(tLenght) * 2, 999)];

    if(items.importedSats){     //Show the box to import satellites from satLibrary
        $scope.importedSats = items.importedSats;
    }

    if(items.satdata){          //Edit a satellite, if we edit a satellite the import sat box is not shown
        $scope.sat_name = items.satdata.SAT_NAME;
        $scope.sat_cat = items.satdata.SAT_CAT;
        $scope.sat_desc = items.satdata.SAT_DESC;
        $scope.sat_tle1 = items.satdata.SAT_TLE1;
        $scope.sat_tle2 = items.satdata.SAT_TLE2;
        $scope.sat_url = items.satdata.SAT_TLE_URL;

        $scope.rmt_array = items.satdata.rmt.slice();
        $scope.rmt_array.forEach(function (trsp, index) {
            trsp.index = index;
        });
    }

    $scope.importedSatClick = function(importedSat){
        $scope.rmt_array = [];

        $scope.sat_name = importedSat.name;
        $scope.sat_cat = importedSat.cat;
        $scope.sat_desc = importedSat.group;
        $scope.sat_tle1 = importedSat.tle1;
        $scope.sat_tle2 = importedSat.tle2;
        $scope.sat_url = importedSat.url;

        importedSat.trsp.forEach(function (trsp, index) {
            $scope.rmt_array.push({
                index : index,
                RMT_DESC : trsp.desc,
                RMT_STATUS : (trsp.alive)? "Active" : "Disabled",
                RMT_MODE : trsp.mode,
                RMT_BAUD : (trsp.baud)? importedSat.baud : null,
                RMT_UPLINK_LOW : trsp.uplink_low,
                RMT_UPLINK_HIGH : trsp.uplink_high,
                RMT_DOWNLINK_LOW : trsp.downlink_low,
                RMT_DOWNLINK_HIGH : trsp.downlink_high
            })
        });
    };

    $scope.add = function(){
        $uibModalInstance.close({
            SAT_ID : (items.satdata)? items.satdata.SAT_ID:0,
            SAT_NAME : $scope.sat_name,
            SAT_CAT : $scope.sat_cat,
            SAT_DESC : $scope.sat_desc,
            SAT_TLE1 : $scope.sat_tle1,
            SAT_TLE2 : $scope.sat_tle2,
            SAT_TLE_URL : $scope.sat_url,
            rmt : $scope.rmt_array
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.addRemoteTransceiverButton = function () {
        if($scope.rmt_array && $scope.rmt_array.length > 0){
            $scope.rmt_array.push({
                index : $scope.rmt_array[$scope.rmt_array.length - 1].index + 1
            });
        }
        else{
            var id = 0;
            $scope.rmt_array = [{
                index : id
            }];
        }
    };

    $scope.delRemoteTransceiverButton = function (rmt) {
        $scope.rmt_array = $scope.rmt_array.filter(function (el) {
            return el.index !== rmt.index;
        });
    };

    $scope.findMode = function (reqId) {
        return $scope.satModes.find(function (el) {
            return el.id === reqId
        });
    };
});
