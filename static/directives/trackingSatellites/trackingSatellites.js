/**
 Created by Antonio Serrano (github: antserran)

 */

app.directive('polar', ['d3', function(d3) {
    function link(scope, element, attrs) {


        var conv = (2 * Math.PI) / 360;
        var subpi = Math.PI / 2;

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

        svg.append("text")
            .attr("id", "ele")
            .attr("x", -radius - 30)
            .attr("y", radius-30);

        svg.append("text")
            .attr("id", "azi")
            .attr("x", -radius - 30)
            .attr("y", radius - 15);

        svg.append("text")
            .attr("id", "dopler")
            .attr("x", -radius - 30)
            .attr("y", radius + 15);

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

        setInterval(scope.updatePolarGraph = function () {

            // Removing for next iteration
            // supposing 10 satellites which is quite difficult overGround at the same time
            for (var i =0; i<10; i++) {
                d3.select("#satellite" + i).remove();
                d3.select("#name" + i).remove();
                d3.select("#sat_legend" + i).remove();
            }


            if (scope.satellitesOverGround != null) {

                for (var i = 0; i < scope.satellitesOverGround.length; i++) {




                    // Setting parameters
                    var name = scope.satellitesOverGround[i].name
                    var elevation = scope.satellitesOverGround[i].ele;
                    var azimuth = scope.satellitesOverGround[i].azi;
                    var colors = ["red", "blue", "purple", "black", "orange", "brown"]

                    var data = [];
                    data.push({ele: elevation, azi: azimuth})

                    // Drawing satellites as a circle if elevation>0
                    svg.append("circle")
                        .attr("id", "satellite" + i)
                        .data(data)
                        .attr("r", 4)
                        .attr("fill", colors[i])
                        .attr("cx", function (d) {
                            return Math.sin(d.azi * conv) * radius * ((-d.ele + 90) / 90)
                        })
                        .attr("cy", function (d) {
                            return -(Math.cos(d.azi * conv) * radius * ((-d.ele + 90) / 90))
                        });

                    // Satellite name
                    svg.append("text")
                        .attr("id", "name" + i)
                        .attr("x", +radius - 340 )
                        .attr("y", -radius - 10 + (15*i)); // 15*i allows to set more than one legend correctly, one under another

                    svg.select("#name" + i)
                        .text(name);

                    // Satellite red circle in legend
                    svg.append("circle")
                        .attr("id", "sat_legend" + i)
                        .attr("r", 4)
                        .attr("fill", colors[i])
                        .attr("cx", +radius - 345 )
                        .attr("cy", -radius - 15 + (15*i));  // 15*i allows to set more than one legend correctly, one under another



                }
            }

        }, 1000)

    }

    return {
        restrict: 'EA',
        link: link
    }
}]);

app.directive('trackingSatellites', function($http, $document, $uibModal) {
    function link(scope, element, attrs) {

        // Map elements
        var mymap = null; // map
        var marker = null; // satellite marker
        var path = []; // satellite orbit
        var foot = null; // satellite footprint
        var terminator = null; // terminator
        var myIcon = null; // satellite icon

        /**
         * It sets up the Leaflet map
         */
        scope.setUpMap = function () {

            // token MapBox: pk.eyJ1IjoiYW50c2VycmFubyIsImEiOiJjamU4ZXF6bm0wYTM5MnlwZTF0NWNhbWprIn0.iscZVwbCjSmzZD1GDV6zYg

            // Setting map limits
            var southWest = L.latLng(-90, -180),
                northEast = L.latLng(180, 180),
                bounds = L.latLngBounds(southWest, northEast);

            // satellite icon
            myIcon = L.icon({
                iconUrl: 'images/satellite.png',
                iconSize: [32, 32],
                iconAnchor: [16,32]
            });


            // Setting up map
            mymap = L.map('mapid', {

                center: [0,0],
                minZoom: 0,
                maxBounds : bounds,
                worldCopyJump :false,
                noWrap:true,
                continuousWorld:false,


            }).setView([0, 0], 1);


            // Adding Groundstation marker
            L.marker ([37.179640,-3.6095], { title : "Groundstation"}).addTo(mymap);

            // Adding map layer (satellite layer)
            L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYW50c2VycmFubyIsImEiOiJjamU4ZXF6bm0wYTM5MnlwZTF0NWNhbWprIn0.iscZVwbCjSmzZD1GDV6zYg', {
                maxZoom: 8,
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="http://mapbox.com">Mapbox</a>',
                id: 'mapbox.satellite',
            }).addTo(mymap);

            // Adding terminator
            terminator = L.terminator().addTo(mymap)
        };


        /**
         * It updates map with current coordinates and footprint (coverage area)
         * @param {coord} array with orbit's coordinates
         * @param {footprint} diameter (in Km) of coverage area
         */
        scope.updateMap = function (coord, footprint) {

            var coordinates = coord.data["coordinates"];
            var current_position = coord.data["now"];

            // Removing what it was before
            if (marker != null) {
                mymap.removeLayer(marker);
            }

            if (path != null) {

                var total_path = path.length;
                for (var i=0; i<total_path; i++) {
                    mymap.removeLayer(path[i]);
                }
            }

            if (foot != null) {
                mymap.removeLayer(foot);
            }

            // Adding marker and satellite path
            marker = L.marker (current_position, {icon: myIcon}).addTo(mymap);

            // Drawing footprint (coverage area)
            foot = L.circle(current_position,  {radius: footprint*1000/2}).addTo(mymap);

            // Drawing satellite path
            var totalMarkers = coordinates.length;
            for(var i = 0; i<totalMarkers; i++){
                var datos = (coordinates[i]);

                var x = L.circle([datos[0],datos[1]], {radius: 0.1, color:"red"}).addTo(mymap);
                path.push(x)
            }

            // Updating terminator
            terminator.setLatLngs(terminator.getLatLngs());
            terminator.redraw();
        };

        // Setting up map
        scope.setUpMap();

        scope.disabled = false; // It controls behavior of the button that updates TLE
        scope.following = false; // It controls behaviour of the button that follows satellite


        /**
         * It updates TLEs
         */
        scope.updateTLE = function () {
            scope.disabled = true;
            return $http({
                method: 'GET',
                url: "/updateLibrary"
            }).then(function (res) {

                if(res.data.error){
                    window.alert("Something went wrong with python script");
                    scope.disabled = false;
                }
                else{
                    scope.updateSatellites();           //Request to node for sending to the user the updated passes
                    // change button to "updated"
                    scope.disabled = false;
                }
            });


        };


        /**
         * It gets satellite orbit
         * @param {sat_name} satellite name
         * @param {tle1} line 1 of TLE
         * @param {tle2} line 2 of TLE
         */
        scope.getSatellitesOrbit = function(sat_name, tle1, tle2) {
            return $http({
                method: 'GET',
                url: "/getSatellitesOrbit",
                params: {sat_name : sat_name, tle1 : tle1, tle2 : tle2}
            }).then(function(res){

                if (!res.data.error) {
                    scope.updateMap(res, scope.footprint)
                }

            });

        };

        /**
         * It gets satellite data (az, ele, footprint, speed, etc)
         * @param {sat_name} satellite name
         * @param {tle1} line 1 of TLE
         * @param {tle2} line 2 of TLE
         */
        scope.getSatellitesData = function (sat_name, tle1, tle2) {
            return $http({
                method: 'GET',
                url: "/getSatellitesData",
                params: {sat_name : sat_name, tle1 : tle1 , tle2 : tle2}
            }).then(function(res){

                if (!res.data.error) {

                    // Retrieving satellite data
                    scope.elevation = res.data["ele"].toFixed(4);
                    scope.altitude = res.data["height"].toFixed(4);
                    scope.azimuth = res.data["azi"].toFixed(4);
                    scope.longitude = res.data["longitude"].toFixed(4);
                    if (res.data["light"] == 1) {
                        scope.light = "Yes"
                    } else {
                        scope.light = "No"
                    }
                    scope.footprint = res.data["footprint"].toFixed(4);
                    scope.latitude = res.data["latitude"].toFixed(4);
                    if (scope.elevation > 0) {
                        scope.over_groundstation = "Yes"
                    } else {
                        scope.over_groundstation = "No"
                    }
                    scope.velocity = res.data["velocity"].toFixed(4);

                }

            });
        };


        /**
         * It gets satellites over Groundstation
         */
         scope.getSatellitesOverGround = function() {
             return $http({
                 method: 'GET',
                 url: "satellites_groundstation"
             }).then(function(data){
                 scope.satellitesOverGround = data.data;
                 console.log(scope.satellitesOverGround);
             });
         };


        /**
         * It follows a satellite by changing elevation and azimuth
         * according to tracking parameters
         */
         scope.followSatellite = function() {

             scope.setRotors({
                 ele: Math.trunc(scope.elevation), // quedarse con parte entera
                 azi: Math.trunc(scope.azimuth)
             })

         };


        /**
         * It gets satellite's information every 2 second in order to redraw the map with
         * this information
         */
        setInterval(function() {

            // Getting information of selected satellite
            if (scope.selectedSat != null) {
                scope.getSatellitesOrbit(scope.selectedSat.SAT_NAME, scope.selectedSat.SAT_TLE1, scope.selectedSat.SAT_TLE2);
                scope.getSatellitesData(scope.selectedSat.SAT_NAME, scope.selectedSat.SAT_TLE1, scope.selectedSat.SAT_TLE2);
            }


            // If selected, follow satellite (it must be over Ground)
            if (scope.following && scope.elevation > 0) {
                scope.followSatellite();
            }


        }, 2000);


        // Calculating satellites over Groundstation every 3 seconds
        setInterval(function() {
            scope.getSatellitesOverGround();

        },3000)


    }

    return {
        link: link,
        templateUrl: 'directives/trackingSatellites/trackingSatellites.html'
    };

});