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
            //TODO
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
            sat_name: $scope.sat_name,
            sat_desc: $scope.sat_desc,
            sat_rx : $scope.sat_rx,
            sat_tx : $scope.sat_tx,
            sat_status : $scope.sat_status,
            sat_tle1 : $scope.sat_tle1,
            sat_tle2 : $scope.sat_tle2,
            sat_url : $scope.sat_url
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});
