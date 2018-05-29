app.directive('rotorsYaesu', function($http, $document, $uibModal) {

    function link(scope, element, attrs) {
        var mobileAzi = 0;
        var mobileEle = 0;

        var gauges = initializeGauges(); // get gauges

        // It updates the value of azimuth and elevation within the gauges
        scope.updateGauges = function () {

            // Retrieving values of azimuth and elevation
            var value_elevation = scope.yaesuPosition.ele;
            var value_azimuth = scope.yaesuPosition.azi;

            // In case values are lower than 1 or null, we set it to 0 (otherwise the
            // gauge will be corrupted
            if (value_elevation < 0 | value_elevation == null) {value_elevation = 0}
            if (value_azimuth < 0 | value_azimuth == null) {value_azimuth = 0}

            // Redrawing gauges
            gauges["elevation"].redraw(value_elevation); // Gauge for elevation
            gauges["azimuth"].redraw(value_azimuth); // Gauge for azimuth

            // gauges["elevation"].redraw(value_elevation); // Gauge for elevation
            // gauges["azimuth"].redraw(value_azimuth); // Gauge for elevation

        };



        scope.goToOrigin = function() {
            alert("Moviendo hacia el origen de cordenadas");
            scope.setRotors({
                ele: 90,
                azi: 0
            })
        };


        scope.setPositionModal = function() {
            var setPositionModalInstance = $uibModal.open({
                animation: scope.animationsEnabled,
                templateUrl: 'setPositionModal.html',
                controller: 'setPositionModelController as c',
                size: "sm",
                resolve: {
                    items: function() {
                        return scope.items;
                    }
                }
            });

            setPositionModalInstance.result.then(function(data) {
                scope.setRotors({ele: data.azimuth, azi :data.elevation});
            });
        };

        // scope.$watch("UTCTime", function(newValue, oldValue) {})

        //Refresh rotors's position every second
        setInterval(function() {
            if (scope.selectedTab == 1 || scope.selectedTab == 0 || scope.selectedTab == 7) {
                scope.getRotors().then(function(res) {
                    scope.yaesuPosition = res.data;
                    scope.updateGauges();

                });
            }
            // if (scope.mobileEnabled){
            //
            //
            //
            //     if (scope.mobileEnabled) {
            //         scope.setRotors({
            //             azi: mobileAzi,
            //             ele: mobileEle
            //         });
            //     }
            // }
        }, 1000);

        window.addEventListener('deviceorientation', function(event) {
            mobileAzi = event.alpha; //azimuth
            mobileEle = event.beta; //elevation
            // var gamma = event.gamma;
        });

    }


    return {
        link: link,
        templateUrl: 'directives/rotorsYaesu/rotorsYaesu.html',
    };
});


app.controller('setPositionModelController', function($scope, $uibModalInstance, items) {

    $scope.move = function(){
        $uibModalInstance.close({
            azimuth: $scope.azimuth,
            elevation: $scope.elevation
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };


});
