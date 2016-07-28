app.directive('rotorsYaesu', function($http, $document) {
    function link(scope, element, attrs) {
        var mobileAzi = 0;
        var mobileEle = 0;

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
            var mobileAzi = event.alpha; //azimuth
            var beta = event.beta; //elevation
            var gamma = event.gamma;
        });

    }


    return {
        link: link,
        templateUrl: 'directives/rotorsYaesu/rotorsYaesu.html',
    };
});
