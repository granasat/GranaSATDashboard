
// Dictionary with all the gauges that will be created
var gauges = [];


// Constructor:
// name and label of the gauge
// min and max value of the circle (if not defined, 0 and 100)
function createGauge(name, label, min, max)
{

    // Setting configuration of the gauge
    var config =
        {
            size: 120, // size of the gauge
            label: label,
            min: undefined != min ? min : 0, // min value
            max: undefined != max ? max : 100, // max value
            minorTicks: 5 // number of small black lines
        }

    var range = config.max - config.min;
    //config.yellowZones = [{ from: config.min + range*0.75, to: config.min + range*0.9 }]; // define yellow zones
    //config.redZones = [{ from: config.min + range*0.9, to: config.max }]; // define red zones

    gauges[name] = new Gaugee(name + "GaugeContainer", config);
    gauges[name].render();
}

// All the gauges that will be used in the application must be defined here
// Afterwards, within the html, the gauge is displayed as follows:
// <span id="<name_of_gauge> + GaugeContainer"></span>, for example:
// <span id="elevationGaugeContainer"></span>
function createGauges()
{
    createGauge("azimuth", "Azimuth", min=0, max=450); // azimuth gauge
    createGauge("elevation", "Elevation", min=0, max=180); // elevation gauge

    //createGauge("example", "Example", min=1, max=180); // another example
}

// Update gauge with the desired values
// here we will get the values of the controller (current azimuth and current elevation)
function updateGauges(x, y)
{

    // var value = getRandomValue(gauges["azimuth"]);

    gauges["azimuth"].redraw(x); // Gauge for azimuth
    gauges["elevation"].redraw(y); // Gauge for elevation


    // For random values
    /*
    for (var key in gauges)
    {
        var value = getRandomValue(gauges[key])
        gauges[key].redraw(value);
    }
    */

}

// Get a random value according to the values in the gauge
function getRandomValue(gauge)
{
    var overflow = 0; //10;
    return gauge.config.min - overflow + (gauge.config.max - gauge.config.min + overflow*2) *  Math.random();
}

// initialize gauges, updating with certain interval time
// this function must be called using the event "onload", within the
// index.html
function initializeGauges()
{
    createGauges();
    //setInterval(updateGauges, 1000); // Update gauge every second

    return gauges;
}