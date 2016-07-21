// module.exports = function Config() {
//     return {
//         database_user: "adminboard",
//         database_password: "granada2016",
//         web_host: "0.0.0.0",
//         web_port: 8002,
//         aprsfi_apikey: "90046.jYiAu5Cp1P7svY",
//         serial_rotors: "/dev/ttyUSB0",
//         serial_transceiver: "",
//         log_file: "log.txt"
//     }
// }
exports.config = {
    database_user: "adminboard",
    database_password: "granada2016",
    web_host: "0.0.0.0",
    web_port: 8002,
    aprsfi_apikey: "90046.jYiAu5Cp1P7svY",
    serial_rotors: "/dev/ttyUSB0",
    serial_transceiver: "/dev/ttyS0",
    log_file: "utils/log.txt",
    aprs_log_file: "utils/aprs.txt"
}
