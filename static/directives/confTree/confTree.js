/**
 * Created by amil101 on 9/08/17.
 */

app.directive('confTree', function($http, $document) {
    function link(scope, element, attrs) {
    }

    return {
        link: link,
        templateUrl: 'directives/confTree/confTree.html'
    };
});

