app.directive('radioIcom9100', function($http, $document, $uibModal) {
    function link(scope, element, attrs) {

        /**
         * It gets repeaters from data base
         */
        scope.getVHFRepeaters = function() {
            return $http({
                method: 'GET',
                url: "/vhf_repeaters",
            }).then(function (res) {

                scope.vhfRepeaters = res.data;
            });
        };

        scope.getUHFRepeaters = function() {
            return $http({
                method: 'GET',
                url: "/uhf_repeaters",
            }).then(function (res) {

                scope.uhfRepeaters = res.data;
            });
        };

        scope.getVHFRepeaters();
        scope.getUHFRepeaters();


        scope.$watch("UTCTime", function(newValue, oldValue) {})

        // Setting gauges
        setRFPowerGauge() ;
        setAFGauge() ;
        setRFGainGauge();
        setSQLGauge();

        var freqDisplays = {};
        ["A"].forEach(function(e) {
            freqDisplays["VFO" + e] = new SegmentDisplay("VFO" + e);
            var display = freqDisplays["VFO" + e];
            display.pattern = "####: ########### ##";
            display.displayAngle = 5;
            display.digitHeight = 20;
            display.digitWidth = 15;
            display.digitDistance = 2.5;
            display.segmentWidth = 2.5;
            display.segmentDistance = 0.1;
            display.segmentCount = 14;
            display.cornerType = 1;
            display.colorOn = "#2B6908";
            display.colorOff = "#EEEEEE";

            display.draw();
            display.setValue('VF0' + e + ': ----------- Hz');
        });

        // ---------------------------------------------------------
        // Functions that control buttons
        // ---------------------------------------------------------

        /**
         * It sets transceiver to APRS frequency (144.800 and FM mode)
         */
        scope.APRSButton = function () {
            scope.setRadio({VFOA: "144800000", BFreq: null}).then (function (res) {

                // If frequency changed correctly, change mode to FM as well
                if (res.data.status == "Done") {

                    return $http({
                        method: 'POST',
                        url: "radiostation/operating_mode",
                        data: {mode : "FM"}
                    }).then(function(res) {

                        if (res.data.status == "Done") {
                            window.alert("APRS frequency set correctly")
                        } else {
                            window.alert("Error while setting APRS frequency")
                        }
                    });
                }

                else {
                    window.alert("Error while setting APRS frequency")
                }

            });
        };

        /**
         * It sets the main band as the operative band
         */
        scope.mainBandButton = function () {

            return $http({
                method: 'POST',
                url: "radiostation/main_band"
            }).then(function(res) {
                if(res.data.status){
                    window.alert("MAIN band selected");
                    scope.band = "main";
                }else {
                    window.alert("Error while selecting MAIN band");
                }
            });
        };

        /**
         * It sets the sub band as the operative band
         */
        scope.subBandButton = function () {

            return $http({
                method: 'POST',
                url: "radiostation/sub_band"
            }).then(function(res) {
                if(res.data.status){
                    window.alert("SUB band selected");
                    scope.band = "sub";
                }else {
                    window.alert("Error while selecting SUB band");
                }
            });
        };

        /**
         * It exchanges main and sub band
         */
        scope.exchangeBandsButton = function () {

            return $http({
                method: 'POST',
                url: "radiostation/exchange_bands"
            }).then(function(res) {
                if(res.data.status){
                    window.alert("Bands exchanged correctly")
                }else {
                    window.alert("Error while exchanging bands")
                }
            });
        };


        /**
         * It sets DUP+ operation
         */
        scope.setDUPPlus = function() {
            return $http({
                method: 'POST',
                url: "radiostation/dup_plus"
            }).then(function(res){

                if (res.data.status == "Done") {
                    window.alert("DUP+ set correctly")
                }

                else{
                    window.alert("Error while setting DUP+")
                }
            });

        };

        /**
         * It sets DUP- operation
         */
        scope.setDUPMinus = function() {
            return $http({
                method: 'POST',
                url: "radiostation/dup_minus"
            }).then(function(res){

                if (res.data.status == "Done") {
                    window.alert("DUP- set correctly")
                }

                else{
                    window.alert("Error while setting DUP-")
                }
            });

        };

        /**
         * It sets simplex operation
         */
        scope.setSimplexOperation = function() {
            return $http({
                method: 'POST',
                url: "radiostation/simplex_operation"
            }).then(function(res){

                if (res.data.status == "Done") {
                    window.alert("Simplex operation set correctly")
                }

                else{
                    window.alert("Error while setting Simplex operation")
                }
            });
        };


        /**
         * It switches on/off transceiver's tone squelch
         */
        scope.ToneSQLButton = function() {

            // Checking tone SQL botton status
            var elem = document.getElementById("toneSQL");

            if (elem.innerHTML == "TSQL OFF") {
                elem.innerHTML = "TSQL ON";
                elem.style.background = "green"
                scope.setToneSQL("on"); // Sending command

            } else {
                elem.innerHTML = "TSQL OFF";
                elem.style.background = "red"
                scope.setToneSQL("off"); // Sending command
            }
        };

        /**
         * It switches on/off transceiver's repeater tone
         */
        scope.RepeaterToneButton = function() {

            // Checking tone SQL botton status
            var elem = document.getElementById("repeaterTone");

            if (elem.innerHTML == "Repeater OFF") {
                elem.innerHTML = "Repeater ON";
                elem.style.background = "green"
                scope.setRepeaterTone("on"); // Sending command

            } else {
                elem.innerHTML = "Repeater OFF";
                elem.style.background = "red"
                scope.setRepeaterTone("off"); // Sending command
            }
        };


        /**
         * It switches on/off satellite mode
         */
        scope.satelliteButton = function() {

            // Checking satellite mode botton status
            var elem = document.getElementById("satmode");

            if (elem.style.background == "green") {
                elem.style.background = "red";

                scope.setSatMode("off"); // Sending command

            } else {

                elem.style.background = "green";
                scope.setSatMode("on"); // Sending command
            }
        };


        /**
         * It switches on/off the transceiver's attenuator
         */
        scope.attenuatorButton = function() {

            // Checking attenuator botton status
            var elem = document.getElementById("attenuator");

            if (elem.innerHTML == "ATT OFF") {
                elem.innerHTML = "ATT ON";
                elem.style.background = "green"
                scope.setAttenuator("on"); // Sending command

            } else {
                elem.innerHTML = "ATT OFF";
                elem.style.background = "red"
                scope.setAttenuator("off"); // Sending command
            }
        };



        /**
         * It switches on/off noise reduction (NR)
         */
        scope.NRButton = function() {

            // Checking NR botton status
            var elem = document.getElementById("nr");

            if (elem.innerHTML == "NR OFF") {
                elem.innerHTML = "NR ON";
                elem.style.background = "green"
                scope.setNR("on"); // Sending command

            } else {
                elem.innerHTML = "NR OFF";
                elem.style.background = "red"
                scope.setNR("off"); // Sending command
            }
        };


        /**
         * It switches on/off USB SQL (if OFF, the squelch will
         * be close and we will always hear noise in the Dashboard, no matter
         * what the real SQL position is in the transceiver)
         * Recommendation: always ON
         */
        scope.squelchButton = function() {

            // Checking squelch botton status
            var elem = document.getElementById("squelch");

            if (elem.innerHTML == "SQL OFF") {
                elem.innerHTML = "SQL ON";
                elem.style.background = "green"
                scope.setSQL("on"); // Sending command

            } else {
                elem.innerHTML = "SQL OFF";
                elem.style.background = "red"
                scope.setSQL("off"); // Sending command
            }
        };


        /**
         * It switches between transmission/reception (TX/RX) modes
         */
        scope.transmittingButton = function() {

            // Checking transmitting button status
            var elem = document.getElementById("transmit");

            if (elem.style.background == "blue") {
                elem.style.background = "red";
                scope.setTransceiverStatus("tx"); // Sending command

            } else if (elem.style.background == "red"){
                elem.style.background = "blue";
                scope.setTransceiverStatus("rx"); // Sending command
            }
        };


        // ---------------------------------------------------------
        // Functions that control gauges's control inputs
        // ---------------------------------------------------------

        /**
         * It gets AF input value from the front-end
         * and set transceiver's AF, besides updating the gauge
         * back
         */
        scope.AFButton = function() {
            var af = document.getElementById("af");

            if (af.value < 0) { af.value = 0};
            if (af.value > 100) {af. value = 100}

            scope.setAFPosition(af.value); // sending command
            updateAFGauge(parseInt(af.value)) // updating gauge
        };

        /**
         * It gets RF power input value from the front-end
         * and set transceiver's RF power, besides updating the gauge
         * back
         */
        scope.RFPowerButton = function() {
            var rf = document.getElementById("rf_power");

            if (rf.value < 0) { af.value = 2}
            if (rf.value > 100) {af. value = 75}

            scope.setRFPowerPosition(rf.value); // sending command
            updateRFPowerGauge(parseInt(rf.value)) // updating gauge
        };

        /**
         * It gets RF gain input value from the front-end
         * and set transceiver's RF gain, besides updating the gauge
         * back
         */
        scope.RFGainButton = function() {
            var rf = document.getElementById("rf_gain");

            if (rf.value < 0) { af.value = 0}
            if (rf.value > 75) {af. value = 100}

            scope.setRFGainPosition(rf.value); // sending command
            updateRFGainGauge(parseInt(rf.value)) // updating gauge
        };

        /**
         * It gets squelch input value from the front-end
         * and set transceiver's squelch, besides updating the gauge
         * back
         */
        scope.SQLButton = function() {
            var sql = document.getElementById("sql");

            if (sql.value < 0) { sql.value = 0}
            if (sql.value > 100) {sql. value = 100}

            scope.setSQLPosition(sql.value); // sending command
            updateSQLGauge(parseInt(sql.value)) // updating gauge
        };


        /**
         * It sets transceiver's status (RX/TX)
         * @param {status} status to set ("tx"/"rx")
         */
         scope.setTransceiverStatus = function (status) {
                return $http({
                    method: 'POST',
                    url: "radiostation/status",
                    data: {option: status}
                });

            };

        /**
         * It gets transceiver's status, "rx" or "tx"
         */
        scope.getTransceiverStatus = function () {
            return $http({
                method: 'GET',
                url: "radiostation/status"
            }).then(function(res){

                scope.icom9100Status = res.data;

                if (!scope.icom9100Status.error && scope.icom9100Status != null) {

                    var elem = document.getElementById("transmit");
                    if (scope.icom9100Status == "tx") {
                        elem.style.background = "red"

                    } else if (scope.icom9100Status == "rx") {
                        elem.style.background = "blue"
                    }
                }
            });
        };

        /**
         * It sets transceiver's tone SQL status (on/off)
         * @param {status} status to set ("on"/"off")
         */
        scope.setToneSQL = function(status) {
            return $http({
                method: 'POST',
                url: "radiostation/tone_sql",
                data: {option: status}
            });
        };

        /**
         * It sets transceiver's tone SQL status (on/off)
         */
        scope.getToneSQL = function () {
            return $http({
                method: 'GET',
                url: "radiostation/tone_sql"
            }).then(function(res){

                scope.icom9100ToneSQL = res.data;

                if (!scope.icom9100ToneSQL.error && scope.icom9100ToneSQL != null) {

                    var elem = document.getElementById("toneSQL");
                    if (scope.icom9100ToneSQL == "01") {
                        elem.innerHTML = "TSQL ON";
                        elem.style.background = "green"

                    } else if (scope.icom9100ToneSQL == "00") {
                        elem.innerHTML = "TSQL OFF";
                        elem.style.background = "red"
                    }
                }
            });
        };


        /**
         * It sets transceiver's tone SQL status (on/off)
         * @param {status} status to set ("on"/"off")
         */
        scope.setRepeaterTone = function(status) {
            return $http({
                method: 'POST',
                url: "radiostation/repeater_tone",
                data: {option: status}
            });
        };

        /**
         * It gets transceiver's tone SQL status (on/off)
         */
        scope.getRepeaterTone = function () {
            return $http({
                method: 'GET',
                url: "radiostation/repeater_tone"
            }).then(function(res){

                scope.icom9100RepeaterTone = res.data;

                if (!scope.icom9100RepeaterTone.error && scope.icom9100RepeaterTone != null) {

                    var elem = document.getElementById("repeaterTone");
                    if (scope.icom9100RepeaterTone == "01") {
                        elem.innerHTML = "Repeater ON";
                        elem.style.background = "green"

                    } else if (scope.icom9100RepeaterTone == "00") {
                        elem.innerHTML = "Repeater OFF";
                        elem.style.background = "red"
                    }
                }
            });
        };


        /**
         * It sets transceiver's RF power position
         * @param {value} value between 0-100 that will be adjusted
         * to 0000-0255 in the server
         */
        scope.setRFPowerPosition = function (value) {
            return $http({
                method: 'POST',
                url: "radiostation/rf_power",
                data: {option: value}
            });
        };

        /**
         * It gets transceiver's RF power position (0000-0255 value)
         * and updates the proper gauge in the front-end
         */
        scope.getRFPowerPosition = function () {
            return $http({
                method: 'GET',
                url: "radiostation/rf_power"
            }).then(function(res){

                scope.icom9100RFPower = res.data;
                if (!scope.icom9100RFPower.error && scope.icom9100RFPower != null ) {

                    // Adjust from 0000-0255 to 2-75W
                    var value = Math.round(scope.icom9100RFPower * 75 / 255);
                    if (value == 0) {value = 2}

                    // Redrawing gauge
                    updateRFPowerGauge(value)
                }

                else {
                    updateRFPowerGauge(2) // minium value
                }
            });
        };

        /**
         * It sets transceiver's squelch position
         * @param {value} value between 0-100 that will be adjusted
         * to 0000-0255 in the server
         */
        scope.setSQLPosition = function (value) {
            return $http({
                method: 'POST',
                url: "radiostation/sql_position",
                data: {option: value}
            });
        };

        /**
         * It gets transceiver's squelch position (0000-0255 value)
         * and updates the proper gauge in the front-end
         */
        scope.getSQLPosition = function () {
            return $http({
                method: 'GET',
                url: "radiostation/sql_position"
            }).then(function(res){

                scope.icom9100SQLPosition = res.data;

                if (!scope.icom9100SQLPosition.error && scope.icom9100SQLPosition != null) {

                    // Adjust from 0000-0255 to 0-100%
                    var value = Math.round(scope.icom9100SQLPosition * 100 / 255);

                    // Redrawing gauge
                    updateSQLGauge(value)
                }

                else {
                    updateSQLGauge(0) // minimum value
                }
            });
        };

        /**
         * It sets transceiver's AF position
         * @param {value} value between 0-100 that will be adjusted
         * to 0000-0255 in the server
         */
        scope.setAFPosition = function (value) {
            return $http({
                method: 'POST',
                url: "radiostation/af",
                data: {option: value}
            });

        };

        /**
         * It gets transceiver's AF position (0000-0255 value)
         * and updates the proper gauge in the front-end
         */
        scope.getAFPosition = function () {
            return $http({
                method: 'GET',
                url: "radiostation/af"
            }).then(function(res){

                scope.icom9100AFPosition = res.data;

                if (!scope.icom9100AFPosition.error && scope.icom9100AFPosition != null) {

                    // Adjust from 0000-0255 to 0-100%
                    var value = Math.round(scope.icom9100AFPosition * 100 / 255);

                    // Redrawing gauge
                    updateAFGauge(value)
                }

                else {
                    updateAFGauge(0) // minimum value
                }

            });
        };

        /**
         * It sets transceiver's RF gain position
         * @param {value} value between 0-100 that will be adjusted
         * to 0000-0255 in the server
         */
        scope.setRFGainPosition = function (value) {
            return $http({
                method: 'POST',
                url: "radiostation/rf_gain",
                data: {option: value}
            });

        };

        /**
         * It gets transceiver's AF position (0000-0255 value)
         * and updates the proper gauge in the front-end
         */
        scope.getRFGainPosition = function () {
            return $http({
                method: 'GET',
                url: "radiostation/rf_gain"
            }).then(function(res){

                scope.icom9100RFGainPosition = res.data;

                if (!scope.icom9100RFGainPosition.error && scope.icom9100RFGainPosition != null) {

                    // Adjust from 0000-0255 to 0-100%
                    var value = Math.round(scope.icom9100RFGainPosition * 100 / 255);

                    // Redrawing gauge
                    updateRFGainGauge(value)
                }

                else {
                    updateRFGainGauge(0)
                }

            });
        };

        /**
         * It sets satellite mode
         * @param {status} "on"/"off", depending on the status desired
         */
        scope.setSatMode = function(status) {
            return $http({
                method: 'POST',
                url: "radiostation/satmode",
                data: {option: status}
            });
        };

        /**
         * It gets satellite mode status (00/01, depending on status)
         * and updates the button in the front-end
         */
        scope.getSatMode = function () {
            return $http({
                method: 'GET',
                url: "radiostation/satmode"
            }).then(function(res){

                scope.icom9100SatMode = res.data;

                if (!scope.icom9100SatMode.error && scope.icom9100SatMode != null) {

                    // Updating button appearance in front-end
                    var elem = document.getElementById("satmode");
                    if (scope.icom9100SatMode == "00") {
                        elem.style.background = "red"

                    } else if (scope.icom9100SatMode == "01") {
                        elem.style.background = "green"

                    }
                }

            });
        };

        /**
         * It sets noise reduction
         * @param {status} "on"/"off", depending on the status desired
         */
        scope.setNR = function(status) {
            return $http({
                method: 'POST',
                url: "radiostation/nr",
                data: {option: status}
            });
        };

        /**
         * It gets noise reduction status (00/01, depending on status)
         * and updates the button in the front-end
         */
        scope.getNR = function () {
            return $http({
                method: 'GET',
                url: "radiostation/nr"
            }).then(function(res){

                scope.icom9100NR = res.data;
                if (!scope.icom9100NR.error && scope.icom9100NR != null) {

                    // Updating button appearance in the front-end
                    var elem = document.getElementById("nr");
                    if (scope.icom9100NR == "01") {
                        elem.innerHTML = "NR ON";
                        elem.style.background = "green"

                    } else if (scope.icom9100NR == "00") {
                        elem.innerHTML = "NR OFF";
                        elem.style.background = "red"
                    }
                }
            });
        };

        /**
         * It sets attenuator
         * @param {status} "on"/"off", depending on the status desired
         */
        scope.setAttenuator = function(status) {
            return $http({
                method: 'POST',
                url: "radiostation/attenuator",
                data: {option: status}
            });
        };

        /**
         * It gets attenuator status (00/20, depending on status)
         * and updates the button in the front-end
         */
        scope.getAttenuator = function () {
            return $http({
                method: 'GET',
                url: "radiostation/attenuator"
            }).then(function(res){

                scope.icom9100Attenuator = res.data;

                if (!scope.icom9100Attenuator.error && scope.icom9100Attenuator != null) {

                    // Updating button appearance in front-end
                    var elem = document.getElementById("attenuator");
                    if (scope.icom9100Attenuator == "20") {
                        elem.innerHTML = "ATT ON";
                        elem.style.background = "green"

                    } else if (scope.icom9100Attenuator == "00") {
                        elem.innerHTML = "ATT OFF";
                        elem.style.background = "red"
                    }
                }
            });
        };


        /**
         * It sets squelch USB
         * @param {status} "on"/"off", depending on the status desired
         */
        scope.setSQL = function(status) {
            return $http({
                method: 'POST',
                url: "radiostation/squelch",
                data: {option: status}
            });
        };

        /**
         * It gets USB squelch status (00/01, depending on status)
         * and updates the button in the front-end
         */
        scope.getSQL = function () {
            return $http({
                method: 'GET',
                url: "radiostation/squelch"
            }).then(function(res){

                scope.icom9100Squelch = res.data;

                if (!scope.icom9100Squelch.error && scope.icom9100Squelch != null) {

                    // Updating button appearance in front-end
                    var elem = document.getElementById("squelch");
                    if (scope.icom9100Squelch == "01") {
                        elem.innerHTML = "SQL ON";
                        elem.style.background = "green";

                    } else if (scope.icom9100Squelch == "00") {
                        elem.innerHTML = "SQL OFF";
                        elem.style.background = "red";
                    }
                }
            });
        };

        /**
         * It gets s-meters value in 0000-0255 format
         * and updates the bar in the front-end
         */
        scope.getSMeters = function() {
            return $http({
                method: 'GET',
                url: "radiostation/Smeters"
            }).then(function(res){
                scope.icom9100SMeters = res.data;

                // Updating bar
                if (!scope.icom9100SMeters.error && scope.icom9100SMeters != null) {
                    updateSMetersBar(scope.icom9100SMeters); // Updating s-meters graphic bar
                }
                else {
                    updateSMetersBar(0); // minimum value
                }
            });
        };

        /**
         * It gets rf meters value in 0000-0255 format
         * and updates the bar in the front-end
         */
        scope.getRFMeter = function() {
            return $http({
                method: 'GET',
                url: "radiostation/rf_meter"
            }).then(function(res){

                scope.icom9100RF = res.data;

                // Updating bar
                if (!scope.icom9100RF.error && scope.icom9100RF != null) {
                    updateRFBar(scope.icom9100RF); // Updating rf meter graphic bar
                }
                else {
                    updateRFBar(0); // minimu value
                }
            });
        };

        /**
         * It gets SWR value in 0000-0255 format
         * and updates the bar in the front-end
         */
        scope.getSWR = function() {
            return $http({
                method: 'GET',
                url: "radiostation/swr"
            }).then(function(res){
                scope.icom9100SWR = res.data;

                // Updating bar
                if (!scope.icom9100SWR.error  && scope.icom9100SWR != null) {
                    updateSWRBar(scope.icom9100SWR); // Updating swr graphic bar
                }
                else {
                    updateSWRBar(0); // minimum value
                }
            });
        };

        /**
         * It gets ALC value in 0000-0255 format
         * and updates the bar in the front-end
         */
        scope.getALC = function() {
            return $http({
                method: 'GET',
                url: "radiostation/alc"
            }).then(function(res){
                scope.icom9100ALC = res.data;

                // Updating bar
                if (!scope.icom9100ALC.error && scope.icom9100ALC != null) {
                    updateALCBar(scope.icom9100ALC); // Updating alc graphic bar
                }
                else {
                    updateALCBar(0); // minimum value
                }
            });
        };

        /**
         * It gets COMP value in 0000-0255 format
         * and updates the bar in the front-end
         */
        scope.getCOMP = function() {
            return $http({
                method: 'GET',
                url: "radiostation/comp"
            }).then(function(res){
                scope.icom9100COMP = res.data;

                // Updating bar
                if (!scope.icom9100COMP.error && scope.icom9100COMP != null) {
                    updateCOMPBar(scope.icom9100COMP); // Updating comp graphic bar
                }
                else {
                    updateCOMPBar(0); // minimu value
                }
            });

        };


        /**
         * It gets repeater tone (subtone)
         */
        scope.getRepeaterToneFrequency = function() {
            return $http({
                method: 'GET',
                url: "/radiostation/repeater_tone_freq"
            }).then(function(res){

                scope.icom9100RepeaterToneFreq = res.data;
            });
        };

        /**
         * It sets repeater tone (subtone)
         */
        scope.setRepeaterToneFrequency = function(freq) {
            return $http({
                method: 'POST',
                url: "/radiostation/repeater_tone_freq",
                data: {freq: freq}
            }).then(function (res) {

                if (res.data.status == "Done") {
                    window.alert("Subtone set correctly")
                }
                else {
                    window.alert("Error while setting subtone")
                }
            });
        };

        /**
         * It gets duplex offset frequency
         */
        scope.getDuplexOffset = function() {
            return $http({
                method: 'GET',
                url: "/radiostation/duplex_offset"
            }).then(function(res){

                scope.icom9100DuplexOffset = res.data;

            });

        };

        /**
         * It sets duplex offset frequency
         */
        scope.setDuplexOffset = function(freq) {
            return $http({
                method: 'POST',
                url: "/radiostation/duplex_offset",
                data: {freq : freq}
            }).then(function(res){

                scope.icom9100DuplexOffset = res.data;

                if (res.data.status == "Done") {
                    window.alert("Duplex offset set correctly")
                }

                else {
                    window.alert("Error while setting offset")
                }

            });

        };

        /**
         * It gets transceiver's operative mode (USB,LSB,AM,FM,CW,RTTY,RTTY-R,CW-R)
         * and updates the button in the front-end
         */
        scope.getOperatingMode = function () {
            return $http({
                method: 'GET',
                url: "radiostation/operating_mode"
            }).then(function(res){

                scope.icom9100OperatingMode = res.data;

                // Updating button in front-end
                if (!scope.icom9100OperatingMode.error && scope.icom9100OperatingMode != null) {

                    // Changing operating mode
                    var elem = document.getElementById("operating_mode");
                    elem.innerHTML = res.data;
                }

            });
        };

        /**
         * It sets transceiver's operative mode
         * @param {mode} mode to be set (USB,LSB,AM,FM,CW,RTTY,RTTY-R,CW-R)
         */
        scope.setOperatingMode = function (mode) {

                return $http({
                    method: 'POST',
                    url: "radiostation/operating_mode",
                    data: {mode : mode}
                }).then(function(res) {

                    if (res.data.status == "Done") {

                        // Changing operating mode in front-end
                        scope.icom9100OperatingMode = res.data;
                        var elem = document.getElementById("operating_mode");
                        elem.innerHTML = res.data;
                    }

                    else {
                        window.alert("Error while setting operating mode")
                    }

                });
        };

        /**
         * Modal menu that gets frequency
         */
        scope.setFreqModal = function() {
            var setFreqModalInstance = $uibModal.open({
                animation: scope.animationsEnabled,
                templateUrl: 'setFreqModal.html',
                controller: 'setFreqModelController as c',
                size: "sm",
                resolve: {
                    items: function() {
                        return scope.items;
                    }
                }
            });

            // Setting frequency
            setFreqModalInstance.result.then(function(data) {
                scope.setRadio({VFOA: data.VFOA, BFreq: data.BFreq});
            });
        };

        /**
         * Modal menu that gets duplex offset
         */
        scope.setDuplexOffsetModal = function() {
            var setDuplexModalInstance = $uibModal.open({
                animation: scope.animationsEnabled,
                templateUrl: 'setDuplexModal.html',
                controller: 'setDuplexModelController as c',
                size: "sm",
                resolve: {
                    items: function() {
                        return scope.items;
                    }
                }
            });

            // Setting duplex frequency
            setDuplexModalInstance.result.then(function(data) {

                scope.setDuplexOffset(data.DUPLEX_OFFSET);

            });
        };

        /**
         * Modal menu that gets repeater subtone frequency
         */
        scope.setRepeaterSubtoneModal = function() {
            var setRepeaterSubtoneModalInstance = $uibModal.open({
                animation: scope.animationsEnabled,
                templateUrl: 'setRepeaterSubtoneModal.html',
                controller: 'setRepeaterSubtoneModelController as c',
                size: "sm",
                resolve: {
                    items: function() {
                        return scope.items;
                    }
                }
            });

            // Setting duplex frequency
            setRepeaterSubtoneModalInstance.result.then(function(data) {
                scope.setRepeaterToneFrequency(data.REPEATER_SUBTONE);

            });
        };


        /**
         * It sets repeater (frequency, offset duplex, repeater tone are needed)
         */
        scope.setRepeater = function() {

            // Getting and parsing repeater parameters
            var freq = scope.selectedRepeater.FREQ * 1000; // to Hz
            var subtone = scope.selectedRepeater.SUBTONE;
            var duplex = scope.selectedRepeater.DUPLEX


            // Setting parameters

            // 1. Set freq
            scope.setRadio({VFOA: freq, BFreq: null}).then(function (res) {

                // Setting duplex depending on + or -
                var url;
                if (duplex[0] == '-') {url = "radiostation/dup_minus"}
                else {url = "radiostation/dup_plus"}

                // 2. Set duplex
                if (res.data.status == "Done") {
                    return $http({
                        method: 'POST',
                        url: url
                    }).then(function (res) {

                        // 3. set repeater subtone
                        if (res.data.status == "Done") {

                                    return $http({
                                        method: 'POST',
                                        url: "radiostation/repeater_tone_freq",
                                        data: {freq: subtone}
                                    }).then(function (res) {

                                        // set duplex offset
                                        if (res.data.status == "Done") {


                                            // Removing +/- symbol
                                            var offset = duplex.substr(1, 6);

                                            return $http({
                                                method: 'POST',
                                                url: "radiostation/duplex_offset",
                                                data: {freq: offset}
                                            }).then(function (res) {

                                                if (res.data.status == "Done") {
                                                    window.alert("Repetear set correctly")
                                                }
                                                else {
                                                    window.alert("Error")
                                                }
                                            });
                                        }
                                        else {
                                            window.alert("Error")
                                        }
                                    });
                        }
                        else {
                            window.alert("Error")
                        }
                    });
                }
                else {
                    window.alert("Error")
                }
            });

        };


        scope.addRepeaterModal = function() {
            var addRepeaterModalInstance = $uibModal.open({
                animation: scope.animationsEnabled,
                templateUrl: 'addRepeaterModal.html',
                controller: 'addRepeaterModalController as c',
                size: "lg",
                resolve: {
                    items: function () {
                        return scope.items;
                    }
                }
            });


            // Adding repeater
            addRepeaterModalInstance.result.then(function(data) {

                if (data.TYPE == "VHF") {

                    return $http({
                        method: 'POST',
                        url: "/vhf_repeaters",
                        data: {repeater: data}
                    }).then(function (res) {

                        if (res.data.status == "Done") {
                            window.alert("Repeater added correctly")
                        }

                        else {
                            window.alert("Error while adding repeater, please check parameters ")
                        }

                    });

                }

                else if (data.TYPE == "UHF") {
                    return $http({
                        method: 'POST',
                        url: "/uhf_repeaters",
                        data: {repeater: data}
                    }).then(function (res) {
                        if (res.data.status == "Done") {
                            window.alert("Repeater added correctly")
                        }

                        else {
                            window.alert("Error while adding repeater, please check parameters ")
                        }

                    });
                }

                else {
                    window.alert("Please, set band frequency correctly")
                }


            });

        };


        /**
         * It gets transceiver's parameters every second
         */
        setInterval(function() {
            if (scope.selectedTab == 2  || scope.selectedTab == 0) {

                scope.getRadio().then(function(res) {
                    scope.icom9100freq = res.data;
                    if (!scope.icom9100freq.error) {
                        scope.radioON= true;

                        if (scope.band == "main") {
                            freqDisplays["VFOA"].setValue('VF0A: ' + padLeft(scope.icom9100freq.VFOA, 11, " ") + ' Hz');
                        }
                        else if (scope.band == "sub") {
                            freqDisplays["VFOA"].setValue('VF0B: ' + padLeft(scope.icom9100freq.VFOA, 11, " ") + ' Hz');
                        }
                    }
                    else {
                        scope.radioON = false;
                    }
                });

                scope.getAttenuator();
                scope.getSMeters();
                scope.getRFMeter();
                scope.getSWR();
                scope.getALC();
                scope.getCOMP();
                scope.getRFPowerPosition();
                scope.getRFGainPosition();
                scope.getAFPosition();
                scope.getSatMode();
                scope.getSQL();
                scope.getSQLPosition();
                scope.getTransceiverStatus();
                scope.getNR();
                scope.getOperatingMode();
                scope.getRepeaterTone();
                scope.getToneSQL();
                scope.getRepeaterToneFrequency();
                scope.getDuplexOffset();
            }

        }, 1000);


    };

    return {
        link: link,
        templateUrl: 'directives/radioicom9100/radioicom9100.html',
    };
});



app.controller('setDuplexModelController', function($scope, $uibModalInstance, items) {

    $scope.set = function(){
        $uibModalInstance.close({
            DUPLEX_OFFSET: $scope.duplex
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

app.controller('setRepeaterSubtoneModelController', function($scope, $uibModalInstance, items) {

    $scope.set = function(){
        $uibModalInstance.close({
            REPEATER_SUBTONE: $scope.repeater_subtone
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});


app.controller('setFreqModelController', function($scope, $uibModalInstance, items) {

    $scope.set = function(){
        $uibModalInstance.close({
            VFOA: $scope.AFreq,
            BFreq: $scope.BFreq
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});


app.controller('addRepeaterModalController', function($scope, $uibModalInstance, items) {

    $scope.add = function(){
        $uibModalInstance.close({

            TYPE : $scope.type,
            NAME : $scope.name,
            LOCATOR : $scope.locator,
            SUBTONE : $scope.subtone,
            OBSERVATION : $scope.observation,
            FREQ : $scope.freq,
            DUPLEX : $scope.duplex,
            INDICATIVE : $scope.indicative,

        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

});
