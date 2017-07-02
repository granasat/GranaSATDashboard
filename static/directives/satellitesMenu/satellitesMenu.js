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
    }
    return {
        link: link,
        templateUrl: 'directives/satellitesMenu/satellitesMenu.html',
    };
});


app.controller('addSatModalController', function($scope, $uibModalInstance, items) {

    $scope.add = function(){
        $uibModalInstance.close({
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
