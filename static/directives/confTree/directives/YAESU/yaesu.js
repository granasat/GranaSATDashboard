/**
 * Created by amil101 on 25/08/17.
 */
app.directive('yaesu', function($http) {
    function link(scope, element, attrs) {

        scope.moveEle = function () {
            return $http({
                method: 'POST',
                url: "/rotors/position",
                data: {
                    ele : scope.root.yaesu.tempEle,
                    azi : scope.yaesuPosition.azi,
                }
            });
        }

        scope.moveAzi = function () {
            return $http({
                method: 'POST',
                url: "/rotors/position",
                data: {
                        ele : scope.yaesuPosition.ele,
                        azi : scope.root.yaesu.tempAzi,
                      }
            });
        }
    }

    return {
        restrict: 'A',
        link: link,
        templateUrl: 'directives/confTree/directives/YAESU/yaesu.html'
    };
});