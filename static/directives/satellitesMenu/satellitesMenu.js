/**
 * Created by amil101 on 28/06/17.
 */
app.directive('satellitesMenu', function($http, $document) {
    function link(scope, element, attrs) {
    }


    return {
        link: link,
        templateUrl: 'directives/satellitesMenu/satellitesMenu.html',
    };
});