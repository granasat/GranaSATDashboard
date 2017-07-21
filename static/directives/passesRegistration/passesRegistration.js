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
            var problematicPasses = scope.scheduledPasses.filter(function (scheduledPass) {
                return (new Date(scheduledPass.startDateLocal).getTime() <= new Date(pass.endDateLocal).getTime() && new Date(scheduledPass.endDateLocal).getTime() >= new Date(pass.endDateLocal).getTime()) ||
                       (new Date(scheduledPass.startDateLocal).getTime() <= new Date(pass.startDateLocal).getTime() && new Date(scheduledPass.endDateLocal).getTime() >= new Date(pass.startDateLocal).getTime()) ||
                       (new Date(scheduledPass.startDateLocal).getTime() >= new Date(pass.startDateLocal).getTime() && new Date(scheduledPass.endDateLocal).getTime() <= new Date(pass.endDateLocal).getTime());
            });

            if(problematicPasses.length > 0){           //The pass that the user is trying to schedule have conflict with a pass that is already scheduled
                window.alert("That pass is troubled due to another scheduled pass that occurs in the same space of time");
            }else{
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
            }
        };

    }
    return {
        link: link,
        templateUrl: 'directives/passesRegistration/passesRegistration.html',
    };
});
