/**
 * Created by amil101 on 9/08/17.
 */

app.directive('confTree', function($http, $document) {
    function link(scope, element, attrs) {
        scope.$watch("logged", function(newValue, oldValue) {           //Execute when the user is logged, call for satellites in db
            if (newValue == true) {
                scope.getConf();
            }
        });

        scope.getConf = function () {
            return $http({
                method: 'GET',
                url: "getConf"
            }).then(function (res){
                scope.config = res.data;

                console.log(scope.config);
            });
        }
    }

    return {
        link: link,
        templateUrl: 'directives/confTree/confTree.html'
    };
});

