/**
 * Created by amil101 on 3/07/17.
 */
app.directive('d3Bars', ['d3', function(d3) {
    function link(scope, element, attrs) {
        var conv = (2 * Math.PI) / 360;
        var subpi = Math.PI / 2;

        var data = new Array();

        scope.satelliteSelected.pass[scope.selectedItem].data.forEach(function (elem) {
            data.push([-(elem.azi * conv + subpi), -0.5 + (elem.ele/180)]);
        });

        var tLenght = (data.length/5);
        var startDate = new Date(Date.parse(scope.satelliteSelected.pass[scope.selectedItem].startDateLocal));
        var selec = [];

        for(var i = 0; i < 5; i++){
            selec.push({
                data : scope.satelliteSelected.pass[scope.selectedItem].data[Math.round(tLenght - 1) * i],
                time : new Date(startDate.getTime() + (Math.round(tLenght - 1) * i * scope.config.propagator_passes_step * 1000))
            })
        }

        var width = 470,
            height = 300,
            radius = Math.min(width, height) / 2 - 30;

        // Circle External line
        var r = d3.scale.linear()
            .domain([0, .5])
            .range([0, radius]);

        var line = d3.svg.line.radial()
            .radius(function (d) {
                return r(d[1]);
            })
            .angle(function (d) {
                return -d[0] + Math.PI / 2;
            });

        var svg = d3.select(element[0]).append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        var gr = svg.append("g")
            .attr("class", "r axis")
            .selectAll("g")
            .data(r.ticks(5).slice(1))
            .enter().append("g");

        gr.append("circle")
            .attr("r", r);

        //Elevation text
        gr.append("text")
            .attr("y", function (d) {
                return -r(d) - 4;
            })
            .attr("transform", "rotate(15)")
            .style("text-anchor", "middle")
            .text(function (d) {
                return d;
            });

        svg.append("g")
            .selectAll("text")
            .data(selec)
            .enter()
            .append("text")
            .attr("x", function (d) {
                return Math.sin(d.data.azi * conv) * radius * ((-d.data.ele + 90)/ 90)
            })
            .attr("y", function (d) {
                return - (Math.cos(d.data.azi * conv) * radius * ((-d.data.ele + 90)/ 90))
            })
            .text(function (d) {
                return d.time.getUTCHours() + ":" + ((d.time.getUTCMinutes() < 10)? "0" + d.time.getUTCMinutes(): d.time.getUTCMinutes());
            });


        svg.append("text")
            .attr("id", "azi")
            .attr("x", -radius)
            .attr("y", radius - 15);

        svg.append("text")
            .attr("id", "ele")
            .attr("x", -radius)
            .attr("y", radius);

        scope.coordsMove = function ($event) {

            var x = ($event.offsetX - width / 2);
            var y = (-$event.offsetY + height / 2);

            var hip = Math.sqrt(Math.pow(x, 2) + Math.pow(- y, 2));
            var ele = Math.round((-0.75 * hip) + 90);


            var azi = Math.atan(x / y) * Math.pow(conv, -1);

            var fAzi = Math.round((y > 0 && x > 0)? (azi) : (y < 0)? (180 + azi) : (360 + azi));

            svg.select("#azi")
                .text((ele > 0)? "AZ " + fAzi + "º" : "");

            svg.select("#ele")
                .text((ele > 0)? "EL " + ele + "º" : "");
        };

        var ga = svg.append("g")
            .attr("class", "a axis")
            .selectAll("g")
            .data(d3.range(0, 360, 30))
            .enter().append("g")
            .attr("transform", function (d) {
                return "rotate(" + -d + ")";
            });

        ga.append("line")
            .attr("x2", radius);

        ga.append("text")
            .attr("x", radius + 6)
            .attr("dy", ".35em")
            //.style("text-anchor", function(d) { return d < 270 && d > 90 ? "end" : null; })
            .attr("transform", function(d) { return d == 90 || d == 270 ? "rotate(90 " + (radius + 6) + ",0)" : null; })
            .text(function(d) { return (d == 0)? 'E':(d == 90)? 'N':(d == 180)? 'O':(d == '270')? 'S': null;});


        svg.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("d", line);

    }

    return {
        restrict: 'EA',
        link: link
    }
}]);