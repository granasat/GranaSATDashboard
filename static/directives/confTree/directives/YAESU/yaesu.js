/**
 * Created by amil101 on 25/08/17.
 */
app.directive('yaesu', function($http) {
    function link(scope, element, attrs) {
        scope.tempEle = 0;
        scope.tempAzi = 0;

        scope.moveEle = function () {
            console.log(scope.tempEle);
            console.log(scope.yaesuPosition.azi);

            return $http({
                method: 'POST',
                url: "/rotors/position",
                data: {
                    ele : scope.tempEle,
                    azi : scope.yaesuPosition.azi
                }
            });
        }

        scope.moveAzi = function () {
            console.log(scope.yaesuPosition.ele);
            console.log(scope.tempAzi);

            return $http({
                method: 'POST',
                url: "/rotors/position",
                data: {
                        ele : scope.yaesuPosition.ele,
                        azi : scope.tempAzi
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