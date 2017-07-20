app.directive('passesRegistration', function($http, $document) {
    // Polar diagram
    // http://bl.ocks.org/mbostock/4583749

    //Suncalc
    // https://www.npmjs.com/package/suncalc


    function link(scope, element, attrs) {
        scope.$watch("logged", function(newValue, oldValue) {
            if (newValue == true) {
                scope.getSatellites().then(function(satellites) {
                    scope.passes.forEach(function (sat) {
                        sat.pass.forEach(function (pass) {
                            pass.collapse = true;
                        })
                    });

                    scope.availableSatellites = satellites.data;
                    scope.satelliteSelected = scope.availableSatellites[0]
                    scope.getPasses(scope.satelliteSelected)
                });
            }
        });

        scope.getPasses = function(sat){
            scope.satelliteSelected = sat;
            scope.satellitePasses = scope.passes.find(function (satellite) {
                return satellite.name === sat.RMT_NAME;
            }).pass;
        };

        scope.setPass = function(pass) {
            $http({
                method: 'POST',
                url: "satellites/passes",
                data: {
                    sat : scope.satelliteSelected.RMT_NAME,
                    id : pass.id
                }
            }).then(function(res) {
                if(res.data.status === "Done")
                    scope.scheduledPasses.push(pass);
                    pass.scheduled = true;
            });
        };

    }
    return {
        link: link,
        templateUrl: 'directives/passesRegistration/passesRegistration.html',
    };
});
