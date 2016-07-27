app.directive('rotorsYaesu', function($http, $document) {
    function link(scope, element, attrs) {

        setInterval(function() {
            if (scope.selectedTab == 1 || scope.selectedTab == 0) {
                scope.getRotors().then(function(res) {
                    scope.rotors = res.data
                });
            }
        }, 1000);

    }
    return {
        link: link,
        templateUrl: 'directives/rotorsYaesu/rotorsYaesu.html',
    };
});
