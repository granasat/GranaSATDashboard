/**
 * Created by amil101 on 29/08/17.
 */
app.directive('recordings', function($http, $document, $uibModal) {
    function link(scope, element, attrs) {
        scope.$watch("logged", function(newValue, oldValue) {           //Execute when the user is logged, call for satellites in db
            if (newValue == true) {
                scope.getRecordings().then(function (res) {
                    scope.recordings = res.data;
                });
            }
        });

        scope.getRecordings = function () {
            return $http({
                method: 'GET',
                url: "/getRecordings"
            });
        };
    }


    return {
        link: link,
        templateUrl: 'directives/recordings/recordings.html',
    };
});
