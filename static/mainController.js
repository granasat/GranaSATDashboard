var app = angular.module('myApp', ['ui.bootstrap']);
app.controller('appController', function($scope, $http, $uibModal) {
    $scope.selectedTab = 0
    $scope.logged = false
    $scope.user = ""
    $scope.videoShow = false;

    setInterval(function() {
        $scope.UTCTime = new Date().toUTCString();
        $scope.localTime = new Date().toString();
        if ($scope.satellitePasses) {
            $scope.satellitePasses.forEach(function(e) {
                e.remainTime = new Date(e.startDate).getTime() - new Date($scope.UTCTime).getTime()
            })
        }
        if ($scope.scheduledPasses) {
            $scope.scheduledPasses.forEach(function(e) {
                e.remainTime = new Date(e.startDate).getTime() - new Date($scope.UTCTime).getTime()
            })
        }
    }, 1000)

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

        loginModalInstance.result.then(function(loginData) {
            $scope.login(loginData.username, loginData.password).then(function(res) {
                if (res.data.status == "Done") {
                    $scope.logged = true
                }
            }, function(err) {
                console.log(err);
            })
        });
    }

    $scope.login = function(username, password) {
        return $http({
            method: 'POST',
            url: "login",
            data: "username=" + username + "&password=" + password,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
    }

    $scope.logout = function() {
        return $http({
            method: 'GET',
            url: "logout",
        }).then(function(res) {
            var data = res.data
            if (data.status == "Done") {
                $scope.user = "";
                $scope.logged = false;
                $scope.selectedTab = 0;
            }
        });
    }

    $scope.getRotors = function() {
        return $http({
            method: 'GET',
            url: "rotors/position",
        })
    }

    $scope.getRadio = function() {
        return $http({
            method: 'GET',
            url: "radiostation/freq",
        })
    }

    $scope.setRotors = function(pos) {
        return $http({
            method: 'POST',
            url: "rotors/position",
            data: pos,
        })
    }

    $scope.setRadio = function(freq) {
        return $http({
            method: 'POST',
            url: "radiostation/freq",
            data: freq,
        })
    }

    $scope.signup = function(user) {
        return $http({
            method: 'POST',
            url: "signup",
            data: user,
        })
    }

    $scope.getScheduledPasses = function() {
        return $http({
            method: 'GET',
            url: "/satellites/scheduled",
        })
    }
});

app.controller('loginModelController', function($scope, $uibModalInstance, items) {

    $scope.ok = function() {
        $uibModalInstance.close({
            username: $scope.username,
            password: $scope.password
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

app.filter('millSecondsToTimeString', function() {
  return function(millseconds) {
    var days = Math.floor(millseconds/(1000*60*60*24))
    millseconds -= days*(1000*60*60*24)

    var hours = Math.floor(millseconds/(1000*60*60))
    millseconds -= hours*(1000*60*60)

    var minutes = Math.floor(millseconds/(1000*60))
    millseconds -= minutes*(1000*60)

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
