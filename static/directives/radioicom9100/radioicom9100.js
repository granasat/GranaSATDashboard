app.directive('radioIcom9100', function($http, $document) {
    function link(scope, element, attrs) {

        var freqDisplays = {};
        ["A"].forEach(function(e) {
            freqDisplays["VFO" + e] = new SegmentDisplay("VFO" + e);
            var display = freqDisplays["VFO" + e];
            display.pattern = "####: ########### ##";
            display.displayAngle = 5;
            display.digitHeight = 20;
            display.digitWidth = 15;
            display.digitDistance = 2.5;
            display.segmentWidth = 2;
            display.segmentDistance = 0.1;
            display.segmentCount = 14;
            display.cornerType = 1;
            display.colorOn = "#090909";
            display.colorOff = "#e7e7e7";

            display.draw();
            display.setValue('VF0' + e + ': ----------- Hz');
        })

        setInterval(function() {
            if (scope.selectedTab == 2  || scope.selectedTab == 0) {
                scope.getRadio().then(function(res) {
                    scope.icom9100freq = res.data
                    if (!scope.icom9100freq.error) {
                        freqDisplays["VFOA"].setValue('VF0A: ' + padLeft(scope.icom9100freq.VFOA, 11, " ") + ' Hz');
                    }
                });
            }
        }, 1000);



    }
    return {
        link: link,
        templateUrl: 'directives/radioicom9100/radioicom9100.html',
    };
});
