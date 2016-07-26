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
            storageID: "GranaSAT console",
            autofocus: true
        });
        element.append(con.element)

        var turnCurrentStatus = false;
        con.logHTML(
            "<div class='page-header'><h1>GranaSAT Terminal</h1></div>"
        );
        var f = {
            "clear": function(c) {
                con.clear()
                con.logHTML(
                    "<div class='page-header'><h1>GranaSAT Terminal</h1></div>"
                );
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
                    ele: c[1],
                    azi: c[2]
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
                        scope.user = "";
                        scope.logged = false;
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
            }
        }
    }
    return {
        link: link,
        // templateUrl: 'directives/granaSATterminal/granaSATterminal.html',
    };
});
