app.directive('rotorsYaesu', function($http, $document) {
    function link(scope, element, attrs) {
        var mobileAzi = 0;
        var mobileEle = 0;

        scope.goToOrigin = function() {
            alert("Moviendo hacia el origen de cordenadas");
            scope.setRotors({
                ele: 90,
                azi: 0
            })
        }

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
