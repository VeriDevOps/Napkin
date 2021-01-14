//import bus from './EventBus.vue';
const operators = require( './Operators.js')
//import * as operators from './Operators.js';

const PLOT_TYPE = Object.freeze({
  "GUARD": 0,
  "ASSERTION": 1
});

function isIn(s, arr){
  for(let i = 0 ; i < arr.length;i++){
    if (s === arr[i]) return true;
  }
  return false;
}
exports.isIn = isIn;
function isNumber(value) {
    if ((undefined === value) || (null === value)) {
        return false;
    }
    if (typeof value == 'number') {
        return true;
    }
    return !isNaN(value - 0);
}
exports.isNumber = isNumber;


function areIntervals(times) {
  // if (!Array.isArray(times))
  //   throw "InvalidArgumentException: Util.areIntervals()"
  // return times.length > 0 && Array.isArray(times[0]);
  return Array.isArray(times) &&
         times.length > 0 &&
         Array.isArray(times[0]);
}
exports.areIntervals = areIntervals;
function areEvents(times) {
  // TODO empty times should also be a valid event series (times = [] )
  // return !areIntervals(times) && times.length > 0;
  return Array.isArray(times) &&
         times.length > 0 &&
         !Array.isArray(times[0]);
}
exports.areEvents = areEvents;

function isNumeric(str) {
  return !(Number.isNaN(Number.parseFloat(str)));
}
exports.isNumeric = isNumeric;
function isFunctionDefined(name) {
  return operators[name] !== undefined;
}
exports.isFunctionDefined = isFunctionDefined;
/**
* Get all short signal names ("pretty_print") and extract the actual signal name
* (it is typically either the last substring in /x/y/z/signal (or x.y.z.signal)
* or the one containing a bracket part, e.g. signal[0|1].
*
* @param name Typically a signals (pretty_print) name
* @return The short name of this signal.
*/
/*
export function getShortName(name) {
  var nameParts = name.split(/\/|\./);
  for (var i=0; i < nameParts.length; i++) {
    if (nameParts[i].indexOf("[") !== -1) {
      return nameParts[i].substring(0, nameParts[i].indexOf("["));
    }
  }
  return nameParts.slice(-1)[0];
}
*/
