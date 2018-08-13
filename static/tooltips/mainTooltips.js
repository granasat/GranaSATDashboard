/*
  Created by Antonio Serrano
*/



/*
  All the tooltips's texts are located in this file

  In case you want to use italics, bold, underlined, etc., just write it as
  though it was html.
  For example:
  tooltip: "<sub> example </sub>"

*/

var mainTooltips = {


    // Tooltips of the main tab (index.html)
    mainMenu: {
        rotorsTab: "<sub>Set</sub> elevation and azimuth ",
        radioTab: "Set the frequency of the radio",
        terminalTab: "Same options via terminal",
        passesTab: "Choose and schedule your passes",
        managementTab: "Users management",
        satellitesTab: "Available satellites",
        recordingsTab: "Available recordings",
        trackingSatellitesTab: "Satellite tracking",
        rotorsYaesu: "Current elevation and azimuth ",
        radioStation: "Current frequency",
        scheduledPasses: "<sub>Cur</sub>rent scheduled passes"
    },


    // Tooltips of the configuration tree(confTree.html)
    confTree: {

        web: {
            host : "Host of the server",
            port : "Port of the server"
        },

        yaesu: {

            ele: "elevation",
            az: "azimuth"

        },

        ic910: {

            radio : "asdf",
            freq : "freq",
            rf_pw : "RF power",
            connection : "Connection",
            from_addr : "From address",
            to_addr : "To address",
            timeout : "timeout",
            delay : "delay",
            repeats : "repeats",
            serial_radio : "Hooray",
            debug_on_send : "Debug",
            debug : "Debug",
            port_name : "port",
            provider : "provider",
            conn : "Connection",
            baud_rate : "Baud rate",
            data_bits : "Data bits",
            stop_bits : "Stop bits",
            disable_on_broken_serial : "Disable on broken serial",
            commands : "commands",
            send : "send",
            send_bits : "send bits",
            send_hex : "send hex"

        },

        ground: {

            location : "Location of the ground station",
            lat : "Ground Station latitude",
            lng : "Ground Station longitude",
            alt : "Ground Station altitude"
        },

        propagator:{

            passes_thr : "Passes thr?",
            passes_step : "Passes step",
            calculator_days : "Calculator days",
            calculator_frequency : "Calculator frequency",
            error : "Error"
        },

        tnc4e:{

        },

        tnc7multi:{

        },

        gs: {

        },

        kenwood: {

        },

        mserver:{

        },

        scheduler:{

        },


        logFile:{
            log_file : "File Path where will be store log file",
            log_size_sent : "Last bytes sent to user"
        },

        mySql:{

        },

        time:{

        },

        scripts:{

            library : "Path of python script",
            dest : "Destination path",
            cache_dir : "Cache directory",
            trsp_file : "Where temporarily trsp's whill be store",
            modes_file : "Where modes will be store",
            satnogs_trsp_url : "Satnogs trsp URL",
            satnogs_modes_url : "Satnogs modes URL",
            baseurl : "Celestrak base URL",
            linesneeded : "Lines needed to split the content of celestrak, do not touch excep celestrak change the format",
            result_file : "Where results will be store",
            files : "Celestrak files",
            run : "Run Python script"
        }


    },


    // Tooltips of the rotors tab (rotorsYaesu.html)
    rotorsTab : {

        eleAndAz: "example",
        goToOriginButton: "example",
        moveButton: "example"

    },

    // Tooltips of the antenna tab (radioicom9100.html)
    radioTab: {

        s_meters: "An S meter (signal strength meter) is an indicator often provided on communications receivers, " +
        "such as amateur radio receivers or shortwave broadcast receivers. The scale markings are derived from a system " +
        "of reporting signal strength from S1 to S9 as part of the R-S-T system. The term S unit can be used to refer to the amount of signal " +
        "strength required to move an S meter indication from one marking to the next.",
        setFrequencyButton: "example",
        sql_button : "Select whether or not to output the audio from the [USB] " +
        "connector on the rear panel, according to the squelch state. ON -The received " +
        "audio is sent when the squelch is open. OFF - The received audio is always sent," +
        "regardless of the squelch state."

    },


    // Tooltips of the terminal tab (terminal.html????)
    terminalTab: {

    },

    // Tooltips of the passes tab (passesRegistration.html)
    passesTab: {

        availabilityText: "example",
        startDate: "example",
        endDate: "example",
        duration: "example",
        maxEle: "example",
        remainTime: "example"

    },

    // Tooltips of the management tab (manageUsers.html)
    managementTab: {

        editButton: "edit",
        confirmButton: "confirm",
        removeButton: "remove"

    },

    // Tooltips of the satellites tab (satellitesMenu.html)
    satellitesTab : {

        editButton: "edit",
        removeButton: "remove",
        addButton: "add satellite"

    },

    // Tooltips of the recordings tab (recordings.html)
    recordingsTab: {

    },


    // Tooltips of tracking tab (tracking.html)
    trackingTab: {



    }


}
