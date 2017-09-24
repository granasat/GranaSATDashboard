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

        scope.updateConf = function () {
            console.log("Updating");

            return $http({
                method: 'POST',
                url: "/updateConf",
                data: {conf : scope.config}
            }).then(function (res) {
                if(res.data.status === "Done"){
                    console.log("DONE");

                    scope.updateSatellites();           //Request to node for sending to the user the updated passes
                }
                else{
                    window.alert("Error");
                }
            });
        }
    }

    return {
        link: link,
        templateUrl: 'directives/confTree/confTree.html'
    };
});

