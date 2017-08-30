/**
 * Created by amil101 on 29/08/17.
 */
app.directive('web', function($http) {
    function link(scope, element, attrs) {

    }

    return {
        restrict: 'A',
        link: link,
        templateUrl: 'directives/confTree/directives/Web/web.html'
    };
});