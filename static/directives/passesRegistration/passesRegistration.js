app.directive('passesRegistration', function($http, $document) {
    // Polar diagram
    // http://bl.ocks.org/mbostock/4583749

    //Suncalc
    // https://www.npmjs.com/package/suncalc


    function link(scope, element, attrs) {
        scope.satelliteSelected = ""

        scope.$watch("logged", function(newValue, oldValue) {
            if (newValue == true) {
                scope.getSatellites().then(function(res) {
                    scope.availableSatellites = res.data
                    scope.satelliteSelected = scope.availableSatellites[0]
                        // scope.$watch("satelliteSelected", function() {})
                    scope.getPasses(scope.satelliteSelected)
                })
            }
        });

        scope.getPasses = function(satellite) {
            scope.satelliteSelected = satellite
            scope.satellitePasses = []
            $http({
                method: 'GET',
                url: "satellites/passes",
                params: {
                    satellite: scope.satelliteSelected.RMT_NAME
                }
            }).then(function(res) {
                res.data.forEach(function(e) {
                    e.collapse = true
                })
                scope.satellitePasses = res.data
            });
        }

        scope.setPass = function(pass) {
            $http({
                method: 'POST',
                url: "satellites/passes",
                data: {
                    satellite: scope.satelliteSelected,
                    pass: pass
                }
            }).then(function(res) {
                // console.log(res);
            });
        }

        setInterval(function() {
            //Update remainTime for calculated passes
            if (scope.satellitePasses) {
                scope.satellitePasses.forEach(function(e) {
                    e.startDateUTC = new Date(e.startDateUTC)
                    e.remainTime = e.startDateUTC - new Date();
                })
            }

            //Retrieve scheduled passes
            scope.getScheduledPasses().then(function(res) {
                res.data.forEach(function(e) {
                    e.remainTime = new Date(e.startDateUTC) - new Date()
                })
                scope.scheduledPasses = res.data
            });
        }, 1000);
    }
    return {
        link: link,
        templateUrl: 'directives/passesRegistration/passesRegistration.html',
    };
});
