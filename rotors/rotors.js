"use strict"

/*function Rotors(set, get, stream) {
    var setPosition = set;
    var getPosition = get;

    function move(elevation, azimuth) {
        stream.write(setPosition + elevation + azimuth)
    }

    function query() {
        var defered
        stream.write(getPosition)
        stream.read(promise)
        return promise
    }

    return {
        move: move,
        query: query
    }
}*/

module.exports = function Rotors(set, get) {

    var setPosition = set;
    var getPosition = get;
    var posEle = 0;
    var posAzi = 0;

    function move(elevation, azimuth) {
        posEle += elevation;
        posAzi += azimuth;
    }

    function query() {
        return posEle + ',' + posAzi;
    }

    return {
        move: move,
        query: query
    }
}