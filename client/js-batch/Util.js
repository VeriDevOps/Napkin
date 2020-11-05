//import bus from './EventBus.vue';
//var operators = require('./Operators.js');

var operators = {"and":true,
		 "or":true,
		 "between":true,
		 "complement":true,
		 "sequence":true,
		 "falling_edge":true,
		 "edge":true,
		 "rising_edge":true};

const PLOT_TYPE = Object.freeze({
  "GUARD": 0,
  "ASSERTION": 1
});

function areIntervals(times) {
  // if (!Array.isArray(times))
  //   throw "InvalidArgumentException: Util.areIntervals()"
  // return times.length > 0 && Array.isArray(times[0]);
  return Array.isArray(times) &&
         times.length > 0 &&
         Array.isArray(times[0]);
}

function areEvents(times) {
  // return !areIntervals(times) && times.length > 0;
  return Array.isArray(times) &&
         times.length > 0 &&
         !Array.isArray(times[0]);
}

function isNumeric(str) {
  return !(Number.isNaN(Number.parseFloat(str)));
}

function isFunctionDefined(name) {
    //console.log("isFunctionDefined " + name);
  return operators[name] !== undefined;
}

//TODO: The implementation of this function should be moved here from the EventBus
function getXmax() {
  return bus.getXmax();
}

/**
* Get all short signal names ("pretty_print") and extract the actual signal name
* (it is typically either the last substring in /x/y/z/signal (or x.y.z.signal)
* or the one containing a bracket part, e.g. signal[0|1].
*
* @param name Typically a signals (pretty_print) name
* @return The short name of this signal.
*/
function getShortName(name) {
  var nameParts = name.split(/\/|\./);
  for (var i=0; i < nameParts.length; i++) {
    if (nameParts[i].indexOf("[") !== -1) {
      return nameParts[i].substring(0, nameParts[i].indexOf("["));
    }
  }
  return nameParts.slice(-1)[0];
}

function joinTimelines(tLine1, tLine2) {
  let timeline = tLine1.concat(tLine2);
  timeline.sort(function(a, b) {
    return a - b;
	});

  // Remove duplicates
	for (var i = 1; i < timeline.length; i++)
	{
		if (timeline[i-1] === timeline[i]) {
			timeline.splice(i, 1);
		}
	}
	return timeline;
}

/**
 * Interpolates a signals data values to a given xAxis (timeline).
 *
 * This is done by providing a signal value for each tick on the timeline. The
 * signal follows its own x-axis, but if there are x-ticks on the timeline that
 * are not in the signals x-axis (i.e. the signal doesn't change then), the
 * previous signal value is kept.
 *
 * @param data - Signal data containing {xAxis: [], values: []}
 * @param timeline - The xAxis that is used as a target for interpolation
 *
 * @return interpolated values (suitable for storage in e.g. data.values)
 */
function interpolateDataToTimeline(data, timeline) {
  var lastMatchIndex = 0;
  var interpolatedValues = [];
  var time = data.xAxis;
  var values = data.values;
  if (!Array.isArray(time))
    time = [time];
  if (!Array.isArray(values))
    values = [values];

  var i=0;
  while (timeline[i] < time[0]) {
    interpolatedValues.push(values[0]);
    i++;
  }
  for (; i<timeline.length; i++) {
    if (lastMatchIndex < time.length &&
          timeline[i] === time[lastMatchIndex]) {
      lastMatchIndex++;
    }
    interpolatedValues.push(values[lastMatchIndex-1]);
  }
  return interpolatedValues;
}

module.exports = {
    isNumeric: isNumeric,
    getShortName: getShortName,
    joinTimelines: joinTimelines,
    interpolateDataToTimeline: interpolateDataToTimeline,
    areIntervals: areIntervals,
    areEvents: areEvents,
    isFunctionDefined: isFunctionDefined,
}
