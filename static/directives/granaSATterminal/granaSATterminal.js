app.directive('granasatTerminal', function($http, $document) {
    function link(scope, element, attrs) {

        var con = new SimpleConsole({
            handleCommand: function(cmd) {
                try {
                    f[cmd.split(" ")[0]](cmd.split(" "));
                } catch (e) {
                    con.log("Unknown command")
                } finally {
                    window.scrollTo(0,document.body.scrollHeight);
                }
            },
            placeholder: "",
            storageID: "GranaSAT terminal",
            autofocus: true
        });

        document.getElementById("term").append(con.element);

        // It controls when to show direwolf output
        var direwolfEnabled = false;

        // It controls when telemetry is available for showing
        var telemetryAvailable = false;

        // websockets for direwolf output
        const ws = new WebSocket('wss://granasat2.ugr.es:8003'); // server
        //const ws = new WebSocket('ws://localhost:8003'); // local


        // Reading web socket content
        ws.binaryType = 'arraybuffer';
        ws.onmessage = function (e) {

            // If direwolf is enabled:
            // Showing AX25/APRS message decoded
            if (direwolfEnabled) {
                con.logHTML(
                    "<p style='color:blue'>" + e.data + "</p>"
                );
            }

            // Extracting 'information field' from AX25 message
            // (from Luis's Arduino device)
            // This will need to be changed in the future
            var lines = e.data.split('\n');

            var info = (lines[2]);

            if (info != null) {
                var data = info.split('/');

                // Parsing data
                var rotation_x = data[3];
                var rotation_y = data[4];
                var rotation_z = data[5];
                var acelerometer_x = data[6];
                var acelerometer_y = data[7];
                var acelerometer_z = data[8];
                var magnometer_x = data[9];
                var magnometer_y = data[10];
                var magnometer_z = data[11];
                var temperature = data[12];
                var pressure = data[13];
            }

            if (rotation_x != null && rotation_y != null && rotation_z != null &&
                acelerometer_x != null && acelerometer_y != null && acelerometer_z != null
                && magnometer_x != null && magnometer_y != null && magnometer_z != null &&
                temperature != null && pressure != null) {

                telemetryAvailable = true;

                // Getting data (telemetry)
                scope.rotation_x = rotation_x.slice(4);
                scope.rotation_y = rotation_y.slice(4);
                scope.rotation_z = rotation_z.slice(4);

                scope.acelerometer_x = acelerometer_x.slice(4);
                scope.acelerometer_y = acelerometer_y.slice(4);
                scope.acelerometer_z = acelerometer_z.slice(4);

                scope.magnometer_x = magnometer_x.slice(4);
                scope.magnometer_y = magnometer_y.slice(4);
                scope.magnometer_z = magnometer_z.slice(4);

                scope.temperature = temperature.slice(2);
                scope.pressure = pressure.slice(2);

            }
        };

        var turnCurrentStatus = false;
        con.logHTML(
            "<div class='page-header'><h1>GranaSAT Terminal</h1></div>"
        );

        con.log("Type help for available commands")

        var f = {
            "clear": function(c) {
                con.clear()
                con.logHTML(
                    "<div class='page-header'><h1>GranaSAT Terminal</h1></div>"
                );
                con.log("Type help for available commands")

            },
            "help": function(c) {
                var s = "Available commands:"
                for (var key in f) {
                    s += "</br>" + key
                }
                con.logHTML(s)
            },
            "usage": function(c) {
                var s = "Usage:"
                s += "</br>getRotors NO AUTH REQUIRED"
                s += "</br>turnCurrentStatus on/off"
                s += "</br>login [username] [password]"
                s += "</br>setRotors [azimuth] [elevation]"
                s += "</br>signup [username] [organization] [mail] [password] [usertype]"
                s += "</br>direwolf [on/off]"
                s += "</br>sendCommand [command]"
                s += "</br>logout"
                con.logHTML(s)
            },
            "getRotors": function(c) {
                scope.getRotors().then(function(res) {
                    var data = res.data
                    if (data.status == "Done") {
                        con.log("Elevation: " + data.ele + "º Azimuth: " + data.azi + "º")
                    } else {
                        con.log("Reading error")
                    }
                });
            },
            "getRadio": function(c) {
                scope.getRadio().then(function(res) {
                    var data = res.data
                    if (!data.error) {
                        con.log("VFO A: " + data.VFOA + " VFO B: " + data.VFOB + " VFO C:" + data.VFOC)
                    } else {
                        con.log("Reading error: " + data.error)
                    }
                });
            },
            "setRotors": function(c) {
                scope.setRotors({
                    azi: c[1],
                    ele: c[2]
                }).then(function(res) {
                    var data = res.data
                    if (data.status == "Done") {
                        con.log("Setting azimuth to " + c[1] + "º and elevation: " + c[2] + "º as " + scope.user)
                    } else if (data.status == "No auth") {
                        con.log("Please, log in.")
                    } else {
                        con.log("Error")
                    }
                });
            },
            "reposeRotors": function(c) {
                scope.setRotors({
                    ele: 0,
                    azi: 155
                }).then(function(res) {
                    var data = res.data
                    if (data.status == "Done") {
                        con.log("Starting movement as " + scope.user)
                    } else if (data.status == "No auth") {
                        con.log("Please, log in.")
                    } else {
                        con.log("Error")
                    }
                });
            },
            "setRadio": function(c) {
                scope.setRadio({
                    VFOA: c[1],
                    VFOB: c[2],
                    VFOC: c[3]
                }).then(function(res) {
                    var data = res.data
                    if (data.status == "Done") {
                        con.log("Frequencies changed as " + scope.user)
                    } else if (data.status == "No auth") {
                        con.log("Please, log in.")
                    } else {
                        con.log("Error")
                    }
                });
            },
            "login": function(c) {
                scope.login(c[1], c[2]).then(function(res) {
                    var data = res.data
                    if (data.status == "Done") {
                        con.log("Logged as " + c[1])
                        scope.logged = true;
                        scope.user = c[1];
                    } else if (data.status == "No auth") {
                        con.log("Please, log in.")
                        scope.logged = false;
                    } else {
                        con.log("Loggin error")
                        scope.logged = false;
                    }
                }, function(data) {
                    con.log("Loggin error")
                });
            },
            "logout": function(c) {
                scope.logout().then(function(res) {
                    var data = res.data
                    if (data.status == "Done") {
                        con.log("Logged out ")
                    } else if (data.status == "No auth") {
                        con.log("Please, log in.")
                    } else {
                        con.log("Logout error")
                    }
                }, function(data) {
                    con.log("Logout error")
                });
            },
            "signup": function(c) {
                scope.signup({
                    username: c[1],
                    organization: c[2],
                    mail: c[3],
                    password: c[4],
                    usertype: c[5]
                }).then(function(res) {
                    var data = res.data
                    if (data.status == "Done") {
                        con.log("User created: " + c[1])
                    } else if (data.status == "No auth") {
                        con.log("Please, log in.")
                    } else {
                        con.log("Error")
                    }
                });
            },

            // This command will show the direwolf output (APRS messages decoded)
            "direwolf": function(c) {
                var status = c[1];

                if (status == "on") {
                    direwolfEnabled = true
                } else if (status == "off") {
                    direwolfEnabled = false
                } else {
                    con.log("Error: use direwolf on/off")
                }
            },

            // This command will show Arduino telemetry when available
            "getTelemmetry": function(c) {

                if (telemetryAvailable) {

                    con.log("Pressure: " + scope.pressure + "mbar");
                    con.log("Temperature: " + scope.temperature + "ºC");
                    con.log("Rotation x: " + scope.rotation_x + "º/s");
                    con.log("Rotation y: " + scope.rotation_y+ "º/s");
                    con.log("Rotation z: " + scope.rotation_z+ "º/s");
                    con.log("Acelerometer x: " + scope.acelerometer_x+ "m/s^2");
                    con.log("Acelerometer y: " + scope.acelerometer_y+ "m/s^2");
                    con.log("Acelerometer z: " + scope.acelerometer_z+ "m/s^2");
                    con.log("Magnometer x: " + scope.magnometer_x+ "T");
                    con.log("Magnometer y: " + scope.magnometer_y+ "T");
                    con.log("Magnometer z: " + scope.magnometer_z+ "T");
                }

                else {
                    con.log("Telemmetry is not available")
                }
            },

            // This command will create an AX25 frame and it will send it
            // making use of Direwolf
            "sendCommand" : function(c) {

                var cmd = c[1]; // Extracting command

                // HTTP request for sending packet
                return $http({
                    method: 'POST',
                    url: "radiostation/send_packet",
                    data: {command : cmd}
                }).then(function(res) {

                    if (res.data.status == "Done") {
                        con.log("Packet sent through the radio over AX25 correctly")
                    } else {
                        con.log("Error while sending AX25 packet")
                    }

                });

            }

        }
    }
    return {
        link: link,
        templateUrl: 'directives/granaSATterminal/granaSATterminal.html',
    };
});
