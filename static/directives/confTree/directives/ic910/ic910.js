/**
 * Created by amil101 on 31/07/17.
 */
app.directive('ic910', function() {
    function link(scope, element, attrs) {


        scope.showManual = function () {
            window.open("../images/pdf/IC-9100-Manual.pdf");
        };


    }

    return {
        restrict: 'A',
        link: link,
        templateUrl: 'directives/confTree/directives/ic910/ic910.html'
    };
});