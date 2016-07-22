var app = angular.module('myApp', ['ui.bootstrap']);
app.controller('appController', function($scope, $http) {
    $scope.selectedTab = 2
    $scope.logged = true
    $scope.user = ""

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

    $scope.logout = function(){
        return $http({
            method: 'GET',
            url: "logout",
        })
    }

    $scope.getRotors = function(){
        return $http({
            method: 'GET',
            url: "rotors",
        })
    }

    $scope.getRadio = function(){
        return $http({
            method: 'GET',
            url: "radiostation/freq",
        })
    }

    $scope.setRotors = function(pos){
        return $http({
            method: 'POST',
            url: "rotors",
            data: pos,
        })
    }

    $scope.setRadio = function(freq){
        return $http({
            method: 'POST',
            url: "radiostation/freq",
            data: freq,
        })
    }

    $scope.signup = function(user){
        return $http({
            method: 'POST',
            url: "signup",
            data: user,
        })
    }
});

function padLeft(nr, n, str){
    return Array(n-String(nr).length+1).join(str||'0')+nr;
}
