app.directive('rotorsYaesu', function($http, $document) {
    function link(scope, element, attrs) {
        var mobileAzi = 0;
        var mobileEle = 0;

        // scope.$watch("UTCTime", function(newValue, oldValue) {})

        setInterval(function() {
            if (scope.selectedTab == 4 || scope.selectedTab == 0) {
                scope.getRotors().then(function(res) {
                    scope.yaesuPosition = res.data
                });
            }
            if (scope.mobileEnabled) {
                if (scope.mobileEnabled) {
                    scope.setRotors({
                        azi: mobileAzi,
                        ele: mobileEle
                    });
                }
            }
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
