var app = angular.module('myApp', ['ui.bootstrap', 'luegg.directives']);
app.controller('appController', function($scope, $http, $uibModal) {
    $scope.selectedTab = 0;
    $scope.logged = false;
    $scope.user = "";
    $scope.userInfo = {};
    $scope.type = 3;
    $scope.videoShow = false;
    $scope.mobileEnabled = false;
    $scope.localTimeMode = false;
    $scope.scheduledPasses = [];


    setInterval(function() {
        $scope.UTCTime = new Date().toUTCString();
        $scope.localTime = new Date().toString();
    }, 1000);

    setInterval(function() {
        //Update remainTime for calculated passes
        if ($scope.passes) {
            $scope.passes.forEach(function (sat) {
                sat.pass.forEach(function (e) {
                    e.remainTime = new Date(new Date(e.startDateUTC).getTime() - new Date().getTime());
                })
            });
            $scope.$apply();
        }
    }, 1000);


    /**
     * When the app starts the server sends a response with all the satellite data. $scope.passes will be the
     * most important variable in the app, it will handle the information of passes, transceivers, satellites,
     * scheduled satellites
     */
    $scope.setupPasses = function () {
        $scope.getAllPasses().then(function (res) {
            $scope.passes = res.data;

            $scope.passes.forEach(function (sat) {
               var filtered = sat.pass.filter(function (pass) {
                   return pass.scheduled === true;
               });

               if(filtered.length > 0)
                   filtered.forEach(function (pass) {
                       $scope.scheduledPasses.push(pass);
                   });
            });

            $scope.sortScheduledPasses();
        });
    };

    $scope.loginModal = function() {
        var loginModalInstance = $uibModal.open({
            animation: $scope.animationsEnabled,
            templateUrl: 'loginModal.html',
            controller: 'loginModelController as c',
            size: "sm",
            resolve: {
                items: function() {
                    return $scope.items;
                }
            }
        });

        loginModalInstance.result.then(function(res) {
            if(res.status == "Done"){
                if(res.type == "signIn"){
                    $scope.logged = true;
                    $scope.user = res.user;
                    $scope.type = res.userType;

                    $scope.getUserInfo().then(function (res) {
                        $scope.userInfo = res.data;
                    });
                }
                else{
                    window.alert("Account created successfully");
                }
            }
        });
    };

    $scope.logout = function() {
        return $http({
            method: 'GET',
            url: "logout"
        }).then(function(res) {
            var data = res.data;
            if (data.status == "Done") {
                $scope.user = "";
                $scope.logged = false;
                $scope.selectedTab = 0;
            }
        });
    };

    $scope.getUsers = function () {
        return $http({
            method: 'GET',
            url: "/getUsers"
        });
    };

    $scope.getUserInfo = function () {
        return $http({
            method: 'GET',
            url: "/getUserInfo"
        });
    };

    $scope.getRotors = function() {
        return $http({
            method: 'GET',
            url: "rotors/position"
        });
    };

    $scope.getRadio = function() {
        return $http({
            method: 'GET',
            url: "radiostation/freq"
        });
    };

    /**
     *   Send to server the position to move the rotors
     * @param {Object} pos - Where you want to rotate the antennas.
     * @param {number} pos.ele - Elevation.
     * @param {number} pos.azi - Azimuth.
     */
    $scope.setRotors = function(pos) {
        console.log(pos);
        return $http({
            method: 'POST',
            url: "rotors/position",
            data: pos
        });
    };

    $scope.setRadio = function(freq) {
        return $http({
            method: 'POST',
            url: "radiostation/freq",
            data: freq
        });
    };

    $scope.getScheduledPasses = function() {
        return $http({
            method: 'GET',
            url: "/satellites/scheduled"
        });
    };

    $scope.getSatellites = function() {
        return $http({
            method: 'GET',
            url: "/satellites"
        });
    };

    $scope.addSatellite = function (data) {
        console.log(data);
        return $http({
            method: 'POST',
            url: "/satellites",
            data: data
        });
    };

    $scope.modSatellite = function(data){
        return $http({
            method: 'POST',
            url: "/modSatellites",
            data: data
        });
    };

    $scope.getSatLibrary = function(){
        return $http({
            method: 'GET',
            url: "/getSatLibrary"
        });
    };

    $scope.getModes = function(){
        return $http({
            method: 'GET',
            url: "/getModes"
        });
    };

    $scope.getAllPasses = function() {
        return $http({
            method: 'GET',
            url: "satellites/passes"
        });
    };

    $scope.undoSchedule = function(scheduledPass){
        return $http({
            method: 'POST',
            url: "/satellites/undoSchedule",
            data: {id : scheduledPass.id}
        }).then(function (res) {
            if(res.data.status === "Done"){
                //Change schedule attribute of the pass with the same id in passes
                scheduledPass.scheduled = false;

                $scope.scheduledPasses = $scope.scheduledPasses.filter(function (el) {
                    return el.id !== scheduledPass.id;
                });
            }
        });
    };
    
    $scope.sortScheduledPasses = function () {
        $scope.scheduledPasses.sort(function (a, b) {
            return a.remainTime - b.remainTime;
        })
    };

    $scope.formatDDMMYYYY = function(date){
        return date.getDate() +
            "/" +  (date.getMonth() + 1) +
            "/" +  date.getFullYear();
    };
});

app.controller('loginModelController', function($scope, $http, $uibModalInstance, items) {

    $scope.loginButton = function() {
        $scope.login($scope.username, $scope.password).then(function(res) {
            if (res.data.status == "Done") {
                $uibModalInstance.close({
                    type: "signIn",
                    status: "Done",
                    user : $scope.username,
                    userType: res.data.type
                });
            }
        }, function (err) {
            console.log(err);

            if(err.data == "Unauthorized"){
                invalidSignInUsername();
            }
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.signupButton = function () {
        if(!length_validation($scope.new_username, 5, 12)){
            $scope.new_username = "";
            window.alert("Username should not be empty / length be between "+ 5 +" to "+ 12);
        }
        else if(!password_validation($scope.new_password)){
            $scope.new_password = "";
            $scope.new_repetedpassword = "";
            window.alert("Password must have at least one digit");
        }
        else if(!length_validation($scope.new_password, 7, 12)){
            $scope.new_password = "";
            $scope.new_repetedpassword = "";
            window.alert("Password should not be empty / length be between "+ 7 +" to "+ 12);
        }
        else if($scope.new_password != $scope.new_repetedpassword){
            $scope.new_password = "";
            $scope.new_repetedpassword = "";
            window.alert("Passwords don't match");
        }
        else if(!mail_validation($scope.new_mail)){
            $scope.new_mail = "";

            window.alert("Invalid mail format");
        }
        else{
            $scope.signup($scope.new_username, $scope.new_password, $scope.new_organization, $scope.new_mail).then(function(res) {
                if (res.data.status == "Done") {
                    $uibModalInstance.close({
                        type: "signUp",
                        status: "Done"
                    });
                }
                else if(res.data.error.errno == 19 || res.data.error.errno == 1062){
                    invalidSignUpUsername();
                }
            }, function (err) {
                console.log(err);
            });
        }
    };

    function length_validation(input, mx, my){
        var inputLength = input.length;

        return !(inputLength == 0 || inputLength < mx || inputLength >= my);
    }

    function password_validation(input){
        var validate = /^.*(?=.*\d)(?=.*[a-zA-Z]).*$/;     //Password must have a digit

        return input.match(validate);
    }

    function mail_validation(mail){
        var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

        return mail.match(mailformat);
    }

    function invalidSignUpUsername() {
        $scope.new_username = "";
        $scope.new_password = "";
        window.alert("Invalid username");
    }

    function invalidSignInUsername(){
        $scope.username = "";
        $scope.password = "";
        window.alert("Invalid username");
    }

    $scope.login = function(username, password) {
        return $http({
            method: 'POST',
            url: "login",
            data: "username=" + username + "&password=" + password,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    };

    $scope.signup = function(username, password, org, mail) {
        return $http({
            method: 'POST',
            url: "signup",
            data: "username=" + username + "&password=" + password + "&org=" + org + "&mail=" + mail,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    };
});


app.filter('millSecondsToTimeString', function() {
  return function(millseconds) {
    var days = Math.floor(millseconds/(1000*60*60*24));
    millseconds -= days*(1000*60*60*24);

    var hours = Math.floor(millseconds/(1000*60*60));
    millseconds -= hours*(1000*60*60);

    var minutes = Math.floor(millseconds/(1000*60));
    millseconds -= minutes*(1000*60);

    var seconds = Math.floor(millseconds / 1000);

    var timeString = '';
    if(days > 0) timeString += days + "d ";
    if(hours > 0) timeString +=  hours + "h ";
    if(minutes >= 0) timeString += minutes + "m ";
    if(seconds >= 0) timeString += seconds + "s";
    return timeString;
}
});

function padLeft(nr, n, str) {
    return Array(n - String(nr).length + 1).join(str || '0') + nr;
}
