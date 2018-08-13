/*
 * Created by Antonio Serrano (github:antserran)
 */

app.directive('userAccount', function($http, $document, $uibModal) {
    function link(scope, element, attrs) {


        /**
         * It gets current user information and displays it in the
         * front-end
         */
        scope.getLoggedUserInfo = function () {

            return $http({
                method: 'GET',
                url: "/getUserInfo",
            }).then(function (res) {

                // If you use SQLite, remove "[0]"
                scope.userID = res.data[0].USR_ID; // not allowed to be changed
                scope.currentName = res.data[0].USR_NAME;
                scope.currentOrganization = res.data[0].USR_ORGANIZATION;
                scope.userType = res.data[0].USR_TYPE; // not allowed to be changed
                scope.userBlocked = res.data[0].USR_BLOCKED; // not allowed to be changed
                scope.userMail = res.data[0].USR_MAIL; // not allowed to be changed
                scope.userImg = res.data[0].USR_IMG;

            });
        };


        scope.getLoggedUserInfo();


        /**
         * It updates user information
         */
        scope.updateUserButton = function () {

            var accept_changes = true;
            var new_user = scope.username_changed;
            var new_org = scope.organization_changed;
            var new_password = scope.pwd_changed;

            // Validating username
            if (scope.username_changed == null || scope.username_changed == "") {
                new_user = scope.currentName
            } else if (!length_validation(scope.username_changed, 5, 12)) {
                scope.username_changed = "";
                window.alert("Username length must be between " + 5 + " to " + 12);
                accept_changes = false;
            }

            // Validating organization
            if (scope.organization_changed == null) {
                new_org = scope.currentOrganization
            }

            // Validating new password
            if (scope.pwd_changed_repeated != null && (scope.pwd_changed == null || scope.pwd_changed == "")) {
                window.alert("Please, enter and confirm new password");
                accept_changes = false;
            } else if (scope.pwd_changed == null  || scope.pwd_changed == "") {
                new_password = null
            } else if (!password_validation(scope.pwd_changed)) {
                scope.pwd_changed = "";
                scope.pwd_changed_repeated = "";
                window.alert("Password must have at least one digit");
                accept_changes = false;
            } else if (!length_validation(scope.pwd_changed, 7, 12)) {
                scope.pwd_changed = "";
                scope.pwd_changed_repeated = "";
                window.alert("Password length must be between " + 7 + " to " + 12);
                accept_changes = false;
            } else if (scope.pwd_changed != scope.pwd_changed_repeated) {
                scope.pwd_changed = "";
                scope.pwd_changed_repeated = "";
                window.alert("Passwords don't match");
                accept_changes = false;
            }

            // If all the parameters are correct
            if (accept_changes) {

                // Modifying user in the data base
                return $http({
                    method: 'POST',
                    url: "modOwnUser",
                    data: {
                        USR_ID: scope.userID,
                        USR_NAME: new_user,
                        USR_ORGANIZATION: new_org,
                        USR_PASSWORD: new_password,
                        USR_TYPE: scope.userType,
                        USR_BLOCKED: scope.userBlocked,
                        USR_MAIL : scope.userMail,
                        USR_IMG : scope.userImg
                    },

                }).then(function (res) {

                    if (res.data.status == "Done") {
                        window.alert("User information updated");
                        location.reload(); // Reloading page
                    } else {
                        window.alert("There was some error while modifying your information");
                    }
                });
            }

        };

        // ------------------------------------------------
        // Validation functions
        // ------------------------------------------------
        function length_validation(input, mx, my){

            var inputLength = input.length;
            return !(inputLength < mx || inputLength >= my);
        }

        function password_validation(input){
            var validate = /^.*(?=.*\d)(?=.*[a-zA-Z]).*$/;     //Password must have a digit

            return input.match(validate);
        }

        function mail_validation(mail){
            var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

            return mail.match(mailformat);
        }

    };


    return {
        link: link,
        templateUrl: 'directives/userAccount/userAccount.html'
    };
});

app.controller('changePhotoController', function($scope, $http, $uibModalInstance, items) {


    $scope.updateImage = function () {

        $uibModalInstance.close();

        // This needs to be done so the '/user_image' route is called again and displays
        // the new user image
        setTimeout(function() { location.reload() }, 1000);

    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

});
