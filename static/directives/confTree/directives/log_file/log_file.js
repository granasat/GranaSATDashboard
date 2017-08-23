/**
 * Created by amil101 on 23/08/17.
 */
app.directive('logFile', function() {
    function link(scope, element, attrs) {


    }

    return {
        restrict: 'A',
        link: link,
        templateUrl: 'directives/confTree/directives/log_file/log_file.html'
    };
});