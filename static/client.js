var con = new SimpleConsole({
    handleCommand: handle_command,
    placeholder: "",
    storageID: "GranaSAT console",
    autofocus: true
});

var user = "";
var turnCurrentStatus = false;

document.body.appendChild(con.element);

con.logHTML(
    "<h1>GranaSAT Dashboard Testing terminal</h1>  <p id='currentStatus'></p>"
);

setInterval(function() {
    if (turnCurrentStatus) {
        $.getJSON("/rotors", function(data) {
            if (data.status == "Done") {
                $("#currentStatus").text("Elevation: " + data.ele + "º Azimuth: " + data.azi + "º")
            }
        });
    } else {
        $("#currentStatus").text("")
    }
}, 1000)


var f = {
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
        s += "</br>logout"
        con.logHTML(s)
    },
    "getRotors": function(c) {
        $.getJSON("/rotors", function(data) {
            if (data.status == "Done") {
                con.log("Elevation: " + data.ele + "º Azimuth: " + data.azi + "º")
            } else {
                con.log("Reading error")
            }
        });
    },
    "turnCurrentStatus": function(c) {
        if (c[1] == "on") {
            turnCurrentStatus = true;
        } else {
            turnCurrentStatus = false;
        }
    },
    "setRotors": function(c) {
        $.post("rotors", {
            ele: c[1],
            azi: c[2]
        }, function(data) {
            if (data.status == "Done") {
                con.log("Starting movement as " + user)
            } else if (data.status == "No auth") {
                con.log("Please, log in.")
            } else {
                con.log("Error")
            }
        });
    },
    "login": function(c) {
        $.post("login", {
            username: c[1],
            password: c[2]
        }, function(data) {
            if (data.status == "Done") {
                con.log("Logged as " + c[1])
                user = c[1];
            } else if (data.status == "No auth") {
                con.log("Please, log in.")
            } else {
                con.log("Error")
            }
        });
    },
    "logout": function(c) {
        $.get("logout", function(data) {
            if (data.status == "Done") {
                con.log("Logged out")
                user = ""
            } else if (data.status == "No auth") {
                con.log("Please, log in.")
            } else {
                con.log("Error")
            }
        });
    }
}

function handle_command(command) {
    f[command.split(" ")[0]](command.split(" "))
        // con.log(command)
        // con.warn(command)
        // con.err(command)
};
