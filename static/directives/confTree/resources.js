/**
 * Created by amil101 on 16/08/17.
 */

app.controller('ic910', function($scope) {
    $scope.R = {
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
    };
});

app.controller('ground', function($scope) {
    $scope.R = {
        location : "Location of the ground station",
        lat : "Ground Station latitude",
        lng : "Ground Station longitude",
        alt : "Ground Station altitude"
    };
});

app.controller('propagator', function($scope){
   $scope.R = {
       passes_thr : "Passes thr?",
       passes_step : "Passes step",
       calculator_days : "Calculator days",
       calculator_frequency : "Calculator frequency",
       error : "Error"
   }
});

app.controller('log_file', function($scope){
    $scope.R = {
        log_file : "File Path where will be store log file",
        log_size_sent : "Last bytes sent to user"
    }
});

app.controller('scripts', function($scope){
    $scope.R = {
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
});

app.controller('web', function($scope){
    $scope.R = {
        web_host : "Host of the server",
        web_port : "Port of the server"
    }
});