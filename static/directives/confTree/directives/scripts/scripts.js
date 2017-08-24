/**
 * Created by amil101 on 24/08/17.
 */
app.directive('scripts', function($http) {
    function link(scope, element, attrs) {

        scope.updateLibrary = function () {
            return $http({
                method: 'GET',
                url: "/updateLibrary"
            });
        }

    }

    return {
        restrict: 'A',
        link: link,
        templateUrl: 'directives/confTree/directives/scripts/scripts.html'
    };
});