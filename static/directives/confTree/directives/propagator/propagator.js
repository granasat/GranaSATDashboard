/**
 * Created by amil101 on 18/08/17.
 */
app.directive('propagator', function() {
    function link(scope, element, attrs) {


    }

    return {
        restrict: 'A',
        link: link,
        templateUrl: 'directives/confTree/directives/propagator/propagator.html'
    };
});