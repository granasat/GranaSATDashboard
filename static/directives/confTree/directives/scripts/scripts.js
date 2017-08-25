/**
 * Created by amil101 on 24/08/17.
 */
app.directive('scripts', function($http) {
    function link(scope, element, attrs) {

        scope.updateLibrary = function () {
            scope.root.scripts.update_library.runnning = true;

            return $http({
                method: 'GET',
                url: "/updateLibrary"
            }).then(function (res) {
                scope.root.scripts.update_library.runnning = false;

                if(res.data.error){
                    window.alert("Something goes wrong with python script");
                }
                else{
                    scope.updateSatellites();           //Request to node for sending to the user the updated passes
                }
            });
        }

    }

    return {
        restrict: 'A',
        link: link,
        templateUrl: 'directives/confTree/directives/scripts/scripts.html'
    };
});