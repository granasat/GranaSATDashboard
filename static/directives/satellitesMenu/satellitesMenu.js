/**
 * Created by amil101 on 28/06/17.
 */
app.directive('satellitesMenu', function($http, $document, $uibModal) {
    function link(scope, element, attrs) {
        scope.$watch("logged", function(newValue, oldValue) {           //Execute when the user is logged, call for satellites in db
            if (newValue == true) {
                scope.getSatellites().then(function(res) {
                    console.log(res.data);
                    scope.availableSatellites = res.data;
                });
            }
        });

        scope.addSatModal = function() {
            scope.items = null;
            var addSatModalInstance = $uibModal.open({
                animation: scope.animationsEnabled,
                templateUrl: 'addSatModal.html',
                controller: 'addSatModalController as c',
                size: "sm",
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
                else
                    scope.addSatellite(data);
            });
        };
        
        scope.modSatModal = function (sat_data) {
            scope.items = sat_data;
            var modSatModalInstance = $uibModal.open({
                animation: scope.animationsEnabled,
                templateUrl: 'addSatModal.html',
                controller: 'addSatModalController as c',
                size: "sm",
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
                else
                    scope.modSatellite(data);
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
    if(items != null){
        id = items.RMT_ID;
        $scope.sat_name = items.RMT_NAME;
        $scope.sat_desc = items.RMT_DESC;
        $scope.sat_rx = items.RMT_RX_FREQ;
        $scope.sat_tx = items.RMT_TX_FREQ;
        $scope.sat_status = items.RMT_STATUS;
        $scope.sat_tle1 = items.SAT_TLE1;
        $scope.sat_tle2 = items.SAT_TLE2;
        $scope.sat_url = items.SAT_TLE_URL;
    }
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
