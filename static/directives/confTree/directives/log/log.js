/**
 * Created by amil101 on 23/08/17.
 */
app.directive('log', function($http) {
    function link(scope, element, attrs) {
        setInterval(function() {                                           //Refresh rotors's position every second
            if (scope.selectedTab === 7) {
                scope.getLog().then(function(res) {
                    if(!res.error){
                        scope.logText = res.data.data;
                    }
                });
            }
        }, 1000);

        scope.getLog = function () {
            return $http({
                method: 'GET',
                url: "/getLog"
            });
        }
    }

    return {
        restrict: 'A',
        link: link,
        templateUrl: 'directives/confTree/directives/log/log.html'
    };
});