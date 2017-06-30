app.directive('rotorsYaesu', function($http, $document, $uibModal) {
    function link(scope, element, attrs) {
        var mobileAzi = 0;
        var mobileEle = 0;

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

        setInterval(function() {                                           //Refresh rotors's position every second
            if (scope.selectedTab == 1 || scope.selectedTab == 0) {
                scope.getRotors().then(function(res) {
                    scope.yaesuPosition = res.data
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
