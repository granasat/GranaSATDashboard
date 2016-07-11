"use strict"

function Rotors(set, get, stream) {
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
}
