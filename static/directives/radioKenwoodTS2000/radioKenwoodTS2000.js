app.directive('radioKenwoodts2000', function($http, $document) {
    function link(scope, element, attrs) {

        var freqDisplays = {};
        ["A", "B", "C"].forEach(function(e) {
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
            if (scope.selectedTab == 2) {
                scope.getRadio().then(function(res) {
                    var data = res.data
                    if (!data.error) {
                        freqDisplays["VFOA"].setValue('VF0A: ' + padLeft(data.VFOA, 11, " ") + ' Hz');
                        freqDisplays["VFOB"].setValue('VF0B: ' + padLeft(data.VFOB, 11, " ") + ' Hz');
                        freqDisplays["VFOC"].setValue('VF0C: ' + padLeft(data.VFOC, 11, " ") + ' Hz');
                    }
                });
            }
        }, 1000);

    }
    return {
        link: link,
        templateUrl: 'directives/radioKenwoodTS2000/radioKenwoodTS2000.html',
    };
});
