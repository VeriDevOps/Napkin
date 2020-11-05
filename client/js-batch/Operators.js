var Util = require('./Util.js');

/**
 * Derives the 'and' of two lists of time intervals
 *
 * * Arg 1
 * |
 * |         ----------------            ----------------
 * |         |              |            |              |
 * |         |              |            |              |
 * |----------              --------------              ------------------
 * |
 * --------------------------------------------------------------------------->
 *
 * Arg 2
 * |
 * |                 ----------------            ----------------
 * |                 |              |            |              |
 * |                 |              |            |              |
 * |------------------              --------------              -------------
 * |
 * --------------------------------------------------------------------------->
 *
 * Result
 * |
 * |                 --------                    ---------
 * |                 |      |                    |       |
 * |                 |      |                    |       |
 * |-----------------       ----------------------       --------------------
 * |
 * --------------------------------------------------------------------------->
 *
 * @param intervals1 List 1 of time intervals [[start1, end1], [start2, end2], ...]
 * @param intervals2 List 2 of time intervals [[start1, end1], [start2, end2], ...]
 *
 * @return [[start1, end1], [start2, end2], ...]
 */
function and(intervalsOrEvents1, intervalsOrEvents2) {
  if (intervalsOrEvents1 === undefined || intervalsOrEvents1.length == 0 ||
          intervalsOrEvents2 === undefined || intervalsOrEvents2.length == 0)
    return [];

  if (Util.areEvents(intervalsOrEvents1) && Util.areEvents(intervalsOrEvents2)) {
    return eventsAnd(intervalsOrEvents1, intervalsOrEvents2);
  }
  else if (Util.areEvents(intervalsOrEvents1) || Util.areEvents(intervalsOrEvents2)) {
    return mixedIntervalsEventsAnd(intervalsOrEvents1, intervalsOrEvents2);
  }
  else {
    return intervalsAnd(intervalsOrEvents1, intervalsOrEvents2);
  }
}

/**
 * Derives the 'or' of two lists of time intervals
 *
 * @param intervals1 List 1 of time intervals [[start1, end1], [start2, end2], ...]
 * @param intervals2 List 2 of time intervals [[start1, end1], [start2, end2], ...]
 *
 * @return [[start1, end1], [start2, end2], ...]
 */
function or(intervalsOrEvents1, intervalsOrEvents2) {
  if ((intervalsOrEvents1.length + intervalsOrEvents2.length) == 0)
    return [];
  else if (intervalsOrEvents1.length == 0)
    return intervalsOrEvents2;
  else if (intervalsOrEvents2.length == 0)
    return intervalsOrEvents1;

  if (Util.areEvents(intervalsOrEvents1) && Util.areEvents(intervalsOrEvents2)) {
    return eventsOr(intervalsOrEvents1, intervalsOrEvents2);
  }
  else if (Util.areEvents(intervalsOrEvents1) || Util.areEvents(intervalsOrEvents2)) {
    throw "IllegalArgumentException: events and intervals cannot be mixed in an OR-expression";
  }
  else {
    return intervalsOr(intervalsOrEvents1, intervalsOrEvents2);
  }
}

/**
 * Derives the comlement of a list of intervals, delimited by a start and end value.
 *
 * @param intervals [[start1, end1], [start2, end2], ...]
 * @param startValue - the start of interval of interest
 * @param endValue - the end of interval of interest
 *
 * @return complementIntervals [[start1, end1], [start2, end2], ...]
 */
function complement(intervalsOrEvents, startValue, endValue) {
  if (intervalsOrEvents === undefined || intervalsOrEvents.length == 0)
    return [[startValue, endValue]];

  var intervals = [];
  if (Util.areIntervals(intervalsOrEvents)) {
    intervals = intervalsOrEvents;
  }
  else {
    intervalsOrEvents.forEach(event => intervals.push([event, event]));
  }

  var complementIntervals = [];
  var complementStart = startValue;
  for (let i=0; i<intervals.length; i++) {
    let thisIntervalStart = intervals[i][0];
    let thisIntervalEnd = intervals[i][1];

    // Cut short calculations if the end value is smaller
    // than the end of the intervals list
    if (complementStart > endValue) {
      break;
    }
    else if (thisIntervalStart > endValue) {
      thisIntervalStart = endValue;
    }

    if (complementStart >= thisIntervalEnd) {
      // The start value is higher than the whole interval, skip it
    }
    else {
      if (complementStart < thisIntervalStart) {
        // Since there is a gap between the presumed complement interval
        // start and this interval, add a new complement interval
        complementIntervals.push([complementStart, thisIntervalStart]);
      }

      if (complementStart < thisIntervalEnd) {
        // Jump to end of this interval and continue from there
        complementStart = thisIntervalEnd;
      }
    }
  }
  // Complement up to the end value, if needed
  if (complementStart < endValue) {
    complementIntervals.push([complementStart, endValue]);
  }
  return complementIntervals;
}

/**
 * Returns rising edges of a collection of intervals or a binary signal.
 *
 * @param data -
 *  intervals - [[start1, end1], [start2, end2], ...] or
 *  binary signal data - {xAxis: [x1, x2, ...], values: [y1, y2, ...]}
 *
 * @return rising_edges [edge1, edge2, ...]
 */
function rising_edge(data) {
  if (!Array.isArray(data)) {
    return genericEdgeOnSignalData(data, '>');
  }
  else if (Util.areIntervals(data)) {
    return genericEdgeOnIntervals(data, 0);
  }
  else {
    return data;
  }
}

/**
 * Returns falling edges of a collection of intervals or a binary signal.
 *
 * @param data -
 *  intervals - [[start1, end1], [start2, end2], ...] or
 *  binary signal data - {xAxis: [x1, x2, ...], values: [y1, y2, ...]}
 *
 * @return falling_edges [edge1, edge2, ...]
 */
function falling_edge(data) {
  if (!Array.isArray(data)) {
    return genericEdgeOnSignalData(data, '<');
  }
  else if (Util.areIntervals(data)) {
    return genericEdgeOnIntervals(data, 1);
  }
  else {
    return data;
  }
}

/**
 * Returns all edges (both falling and rising) of a collection of intervals or
 * a binary signal.
 *
 * @param data -
 *  intervals - [[start1, end1], [start2, end2], ...] or
 *  binary signal data - {xAxis: [x1, x2, ...], values: [y1, y2, ...]}
 *
 * @return edges [edge1, edge2, ...]
 */
function edge(data) {
  if (!Array.isArray(data)) {
    return genericEdgeOnSignalData(data, '!=');
  }
  else if (Util.areIntervals(data)) {
    let flatData = [];
    data.forEach(interval => {
      flatData = flatData.concat(interval);
    });
    return flatData;
  }
  else {
    return data;
  }
}

/**
 * Returns intervals between collections of starting and finishing events.
 *
 * @param startTimestamps - [start1, start2, ...]
 * @param endTimestamps - [end1, end2, ...]
 *
 * @return between_intervals [[start1, end2], [start2, end 45], ...]
 */
function between(startTimestamps, endTimestamps) {
  if (Util.areIntervals(startTimestamps) ||
      Util.areIntervals(endTimestamps)) {
    throw "Not implemented: between() works only with events (and not intervals)";
  }

  var intervals = [];
  var nextEndIndex = 0;
  var lastEndTime = endTimestamps.slice(-1)[0];
  for (let i=0; i<startTimestamps.length; i++) {
    let startTime = startTimestamps[i];
    while (nextEndIndex < endTimestamps.length &&
           endTimestamps[nextEndIndex] <= startTime) {
      nextEndIndex++;
    }

    if (nextEndIndex === endTimestamps.length) {
      intervals.push([startTime, Util.getXmax()]);
      break;
    }
    else {
      let nextEndTime = endTimestamps[nextEndIndex];
      let prevInterval = intervals.slice(-1)[0];
      if (prevInterval === undefined || nextEndTime !== prevInterval[1]) {
        intervals.push([startTime, nextEndTime]);
      }
    }
  }
	return intervals;
}

/**
 * Returns event times for an event sequence.
 *
 * For example sequence([2, 3, 4], [1, 2, 3, 5]) should return [3, 5].
 *
 * @param precTimestamps - the preceding event times [prec1, prec2, ...]
 * @param followTimestamps - the following event times [follow1, follow2, ...]
 * @param maxDistance - max time after precTimestamp to look for followTimestamps
 *
 * @return sequenceTimestamps - [follow 2, follow5, ...]
 */
function sequence(precTimestamps, followTimestamps, maxDistance) {
  if (!Util.areEvents(precTimestamps) ||
      !Util.areEvents(followTimestamps))
    throw "Not implemented: sequence() works only with events";
  if (maxDistance === undefined)
    maxDistance = followTimestamps.slice(-1);

  var seqEvents = [];
  var p_ind = 0;
  for (let f_ind=0; f_ind<followTimestamps.length; f_ind++) {
    let timeBetweenEvents = followTimestamps[f_ind] - precTimestamps[p_ind];
    while (timeBetweenEvents > maxDistance &&
           p_ind < precTimestamps.length) {
      timeBetweenEvents = followTimestamps[f_ind] - precTimestamps[++p_ind];
    }

    if (0 < timeBetweenEvents &&
        timeBetweenEvents <= maxDistance) {
      seqEvents.push(followTimestamps[f_ind]);
    }
  }
  return seqEvents;
}

/******************************************************************************/
/* Private methods                                                            */
/******************************************************************************/
var compare = {
  '<': function(left, right) { return left < right; },
  '>': function(left, right) { return left > right; },
  '==': function(left, right) { return left == right; },
  '<=': function(left, right) { return left <= right; },
  '>=': function(left, right) { return left >= right; },
  '!=': function(left, right) { return left != right; },
};
function intervalsAnd(intervals1, intervals2) {
  var andIntervals = [];
  var i1_index = 0;
  var i2_index = 0;
  while (i1_index < intervals1.length &&
         i2_index < intervals2.length) {
    var overlap = intersection(intervals1[i1_index], intervals2[i2_index]);
    if (overlap.length > 0) {
      andIntervals.push(overlap);
    }

    if (intervals1[i1_index][1] < intervals2[i2_index][1]) {
      i1_index++;
    }
    else {
      i2_index++;
    }
  }
  return andIntervals;
}
/**
 * Derives the intersection of two intervals.
 *
 * The intervals are open to the right, i.e. their endpoints are not included.
 *
 * @param interval1 [start, end[
 * @param interval1 [start, end[
 *
 * @return [start, end]
 */
function intersection(interval1, interval2) {
  var intersectionIntervals = [];
  if (interval1[1] > interval2[0] &&
        interval2[1] > interval1[0])
  {
    intersectionIntervals = [Math.max(interval1[0], interval2[0]),
                             Math.min(interval1[1], interval2[1])];
  }
  return intersectionIntervals;
}
function mixedIntervalsEventsAnd(intervalsOrEvents1, intervalsOrEvents2) {
  var andTimestamps = [];
  var events, intervals;
  if (Util.areEvents(intervalsOrEvents1)) {
    events = intervalsOrEvents1;
    intervals = intervalsOrEvents2;
  }
  else {
    events = intervalsOrEvents2;
    intervals = intervalsOrEvents1;
  }

  var iInd = 0;
  for (let eInd=0; eInd<events.length; eInd++) {
    let event = events[eInd];
    while (iInd < intervals.length && event > intervals[iInd][1]) {
      iInd++;
    }
    if (iInd < intervals.length && event >= intervals[iInd][0]) {
      andTimestamps.push(event);
    }
  }
  return andTimestamps;
}
function eventsAnd(events1, events2) {
  var andTimestamps = [];
  var eInd2 = 0;
  for (let eInd1=0; eInd1<events1.length; eInd1++) {
    let event1 = events1[eInd1];
    while (eInd2 < events2.length && event1 > events2[eInd2]) {
      eInd2++;
    }
    if (eInd2 < events2.length && event1 === events2[eInd2]) {
      andTimestamps.push(event1);
    }
  }
  return andTimestamps;
}
function intervalsOr(intervals1, intervals2) {
  var orIntervals = [];

  // _Sort all intervals according to their start values
  var joinedIntervals = intervals1.concat(intervals2);
  joinedIntervals.sort(function(a, b) {
      return a[0] - b[0];
  });

  // Loop through the original intervals and merge them into connected
  // and disjoint or-intervals
  var orInterval = joinedIntervals[0].slice(0); // Copy the interval to avoid fiddling with the original values
  for (let i=1; i<joinedIntervals.length; i++) {
    let nextInterval = joinedIntervals[i];
    if (orInterval[1] >= nextInterval[1]) {
      // The or-interval completely overlaps the next one,
      // skip the next interval
    }
    else if (orInterval[1] >= nextInterval[0]) {
      // The current or-interval partly overlaps the next one,
      // merge intervals by moving or's endpoint
      orInterval[1] = nextInterval[1];
    }
    else {
      // The or-interval finishes before the next one begins,
      // close the interval by adding it to the output
      orIntervals.push(orInterval);
      orInterval = nextInterval.slice(0);
    }
  }
  orIntervals.push(orInterval);
  return orIntervals;
}
function eventsOr(events1, events2) {
  var joinedEvents = events1.concat(events2);
  joinedEvents.sort(function(a, b) {
      return a - b;
  });
  var uniqueJoinedEvents = joinedEvents.filter(function(event, index) {
    return joinedEvents.indexOf(event) === index;
  });
  return uniqueJoinedEvents;
}
function genericEdgeOnSignalData(data, comparisonOperator) {
  var timestamps = [];
  for (let i=1; i<data.values.length; i++) {
    if (compare[comparisonOperator](data.values[i], data.values[i-1])) {
      timestamps.push(data.xAxis[i]);
    }
  }
  return timestamps;
}
function genericEdgeOnIntervals(intervals, edgeIndex) {
  var timestamps = [];
  for (let i=0; i<intervals.length; i++) {
    timestamps.push(intervals[i][edgeIndex]);
  }
  return timestamps;
}
// function areEvents(presumedIntervals) {
//   if (presumedIntervals[0].length === undefined)
//     return true;
//   return false;
// }
function convertToIntervals(events) {
  var intervals = [];
  for (let i=0; i<events.length; i++) {
    intervals.push([events[i], events[i]]);
  }
  return intervals;
}
module.exports = {
    and: and,
    or: or,
    complement: complement,
    rising_edge: rising_edge,
    falling_edge: falling_edge,
    edge: edge,
    sequence: sequence,
    between: between,
}
