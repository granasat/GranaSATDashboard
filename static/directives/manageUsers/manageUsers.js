/**
 * Created by amil101 on 3/07/17.
 */
app.directive('manageUsers', function($http, $document) {
    function link(scope, element, attrs) {
        scope.$watch("logged", function(newValue, oldValue) {           //Execute when the user is logged, call for satellites in db
            if (newValue == true) {
                scope.getUsers().then(function (res) {
                    scope.users = res.data;
                    scope.users.forEach(function (elem) {
                      elem.edit = false;
                    })
                });
            }
        });

        scope.modUser = function (user) {
            return $http({
                method: 'POST',
                url: "/modUser",
                data: user
            });
        };

        scope.delUser = function (user) {
            return $http({
                method: 'POST',
                url: "/delUser",
                data: user
            });
        };
    }

    return {
        link: link,
        templateUrl: 'directives/manageUsers/manageUsers.html'
    };
});

