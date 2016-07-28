app.directive('passesRegistration', function($http, $document) {
    function link(scope, element, attrs) {
        scope.satelliteSelected = ""

        scope.$watch("logged", function(newValue, oldValue) {
            if (newValue == true) {
                $http({
                    method: 'GET',
                    url: "tle/noaa.txt",
                }).then(function(res) {
                    var data = res.data.toString().replace(/(\s)*\r/g, "").split("\n")
                    data = data.filter(function(e) {
                        return !(e[0] == "1" || e[0] == "2") && e != ""
                    })
                    scope.availableSatellites = data
                    scope.satelliteSelected = scope.availableSatellites[0]
                    scope.$watch("satelliteSelected", function() {})
                    scope.getPasses(scope.satelliteSelected)
                });
            }
        });

        scope.getPasses = function(satellite) {
            scope.satelliteSelected = satellite
            scope.satellitePasses = []
            $http({
                method: 'GET',
                url: "satellites/passes",
                params: {
                    satellite: scope.satelliteSelected
                }
            }).then(function(res) {
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
                console.log(res);
            });
        }

        setInterval(function() {
            scope.getScheduledPasses().then(function(res) {
                scope.scheduledPasses = res.data
            });
        }, 1000);
    }
    return {
        link: link,
        templateUrl: 'directives/passesRegistration/passesRegistration.html',
    };
});
