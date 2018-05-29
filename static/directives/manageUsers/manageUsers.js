/**
 * Created by amil101 on 3/07/17.
 */
app.directive('manageUsers', function($http, $document) {
    function link(scope, element, attrs) {
        scope.$watch("logged", function(newValue, oldValue) {

            scope.$watch("type", function(newValue1, oldValue1) {

                if (newValue1 == 1) {

                    //Execute when the user is logged and type 1, call for users in db
                    if (newValue == true) {
                        scope.getUsers().then(function (res) {
                            scope.users = res.data;
                            scope.users.forEach(function (elem) {
                                elem.edit = false;
                            })
                        });
                    }

                }
        });
        });

        scope.refreshUsers = function(){
            scope.getUsers().then(function (res) {
                scope.users = res.data;
                scope.users.forEach(function (elem) {
                    elem.edit = false;
                })
            });
        };

        scope.modUser = function (user) {
            return $http({
                method: 'POST',
                url: "/modUser",
                data: user
            });
        };

        scope.delUser = function (user) {
            if(user.USR_NAME != scope.user){
                return $http({
                    method: 'POST',
                    url: "/delUser",
                    data: user
                }).then(function (res) {
                    if(res.data.status == "Done")
                        scope.refreshUsers();
                });
            }
            else{
                window.alert("Are you sure you want to delete yourself?");
            }
        };
    }

    return {
        link: link,
        templateUrl: 'directives/manageUsers/manageUsers.html'
    };
});

