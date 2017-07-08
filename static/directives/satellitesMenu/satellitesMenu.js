/**
 * Created by amil101 on 28/06/17.
 */
app.directive('satellitesMenu', function($http, $document, $uibModal) {
    function link(scope, element, attrs) {
        scope.$watch("logged", function(newValue, oldValue) {           //Execute when the user is logged, call for satellites in db
            if (newValue == true) {
                scope.refreshSats();
                scope.importSats();
            }
        });

        scope.refreshSats = function () {
            scope.getSatellites().then(function(res) {
                scope.availableSatellites = res.data;

                //Change the date to a short one (DDMMYYYY)
                scope.availableSatellites.forEach(function (elem) {
                    elem.SAT_TLE_DATE = scope.formatDDMMYYYY(new Date(elem.SAT_TLE_DATE))
                });
            });
        };

        scope.formatDDMMYYYY = function(date){
            return date.getDate() +
                "/" +  (date.getMonth() + 1) +
                "/" +  date.getFullYear();
        };

        scope.importSats = function () {
            scope.getSatLibrary().then(function (res) {
                scope.importedSats = res.data;
            });
        };

        scope.addSatModal = function() {
            scope.items = {};
            scope.items.importSatBox = true;
            scope.items.importedSats = scope.importedSats;
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
                //Check if the data is correct
                if(data.rx < 0 || data.tx < 0)
                    alert("RX or TX freq not correct");
                else {
                    scope.addSatellite(data).then(function (res) {
                        if (res.data.status == "Done") {
                            scope.refreshSats();
                        }
                    });
                }
            });
        };
        
        scope.modSatModal = function (sat_data) {
            scope.items = {};
            scope.items.importSatBox = false;     //Not show the box of import
            scope.items.satdata = sat_data;
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
                    scope.modSatellite(data).then(function (res) {
                        if (res.data.status == "Done") {
                            scope.refreshSats();
                        }
                    });
                }
            });
        }
    }
    return {
        link: link,
        templateUrl: 'directives/satellitesMenu/satellitesMenu.html',
    };
});


app.controller('addSatModalController', function($scope, $uibModalInstance, items) {
    var id = 0;

    $scope.importSatBox = items.importSatBox;

    if(items.importSatBox == false){
        id = items.satdata.RMT_ID;
        $scope.sat_name = items.satdata.RMT_NAME;
        $scope.sat_desc = items.satdata.RMT_DESC;
        $scope.sat_rx = items.satdata.RMT_RX_FREQ;
        $scope.sat_tx = items.satdata.RMT_TX_FREQ;
        $scope.sat_status = items.satdata.RMT_STATUS;
        $scope.sat_tle1 = items.satdata.SAT_TLE1;
        $scope.sat_tle2 = items.satdata.SAT_TLE2;
        $scope.sat_url = items.satdata.SAT_TLE_URL;
    }
    else{
        $scope.importedSats = items.importedSats;
    }

    $scope.importedSatClick = function(importedSat){
      $scope.sat_name = importedSat.name;
      $scope.sat_tle1 = importedSat.tle1;
      $scope.sat_tle2 = importedSat.tle2;
    };

    $scope.add = function(){
        $uibModalInstance.close({
            id : id,
            satname: $scope.sat_name,
            description: $scope.sat_desc,
            rx_freq : $scope.sat_rx,
            tx_freq : $scope.sat_tx,
            status : $scope.sat_status,
            tle1 : $scope.sat_tle1,
            tle2 : $scope.sat_tle2,
            url : $scope.sat_url
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});
