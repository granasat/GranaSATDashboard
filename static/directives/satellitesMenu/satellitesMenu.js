/**
 * Created by amil101 on 28/06/17.
 */
app.directive('satellitesMenu', function($http, $document) {
    function link(scope, element, attrs) {
        scope.$watch("logged", function(newValue, oldValue) {           //Execute when the user is logged, call for satellites in db
            if (newValue == true) {
                scope.getSatellites().then(function(res) {
                    console.log(res.data);
                    scope.availableSatellites = res.data;
                });
            }
        });
    }
    return {
        link: link,
        templateUrl: 'directives/satellitesMenu/satellitesMenu.html',
    };
});