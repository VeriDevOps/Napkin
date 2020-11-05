
import Vue from 'vue';
import bus from '../js/EventBus.vue';
import * as operators from '../js/Operators.js';

describe('Logical (TEARS) operators on intervals', function() {
  var intervals1 = [[1, 3], [5, 10]];
  var intervals2 = [[2, 2.5], [4, 7], [12, 25], [30, 300]];

  it('Simple "and"', function() {
    expect(operators.and([[1, 3], [5, 10]], [[2, 2.5], [4, 7]])).toEqual([[2, 2.5], [5, 7]]);
  });
  it('Disjoint "and"', function() {
    expect(operators.and([[1, 3]], [[4, 7]])).toEqual([]);
  });
  it('Single list "and"', function() {
    expect(operators.and([[1, 3]], [])).toEqual([]);
  });
  it('Very slightly overlapping "and"', function() {
    expect(operators.and([[1, 5]], [[5, 10]])).toEqual([]);
  });

  it('Simple "or"', function() {
    expect(operators.or(intervals1, intervals2)).toEqual([[1, 3], [4, 10], [12, 25], [30, 300]]);
  });
  it('Disjoint "or"', function() {
    expect(operators.or([[1, 3]], [[4, 7]])).toEqual([[1, 3], [4, 7]]);
  });
  it('Single list "or"', function() {
    expect(operators.or([[1, 3]], [])).toEqual([[1, 3]]);
  });

  it('"and" does not mutate the original intervals', function() {
    operators.and(intervals1, intervals2);
    expect(intervals1).toEqual([[1, 3], [5, 10]]);
    expect(intervals2).toEqual([[2, 2.5], [4, 7], [12, 25], [30, 300]]);
  });
  it('"or" does not mutate the original intervals', function() {
    operators.or(intervals1, intervals2);
    expect(intervals1).toEqual([[1, 3], [5, 10]]);
    expect(intervals2).toEqual([[2, 2.5], [4, 7], [12, 25], [30, 300]]);
  });

  it('Simple "complement", start and end outside the intervals list', function() {
    expect(operators.complement(intervals2, 0, 500)).toEqual([[0, 2], [2.5, 4], [7, 12], [25, 30], [300, 500]]);
  });
  it('Simple "complement", start within an interval', function() {
    expect(operators.complement(intervals2, 5, 500)).toEqual([[7, 12], [25, 30], [300, 500]]);
  });
  it('Simple "complement", end within an interval', function() {
    expect(operators.complement(intervals2, 0, 14)).toEqual([[0, 2], [2.5, 4], [7, 12]]);
  });
  it('Simple "complement" client/js/Plot.vue, start between intervals', function() {
    expect(operators.complement(intervals2, 10, 500)).toEqual([[10, 12], [25, 30], [300, 500]]);
  });
  it('Simple "complement", end between intervals', function() {
    expect(operators.complement(intervals2, 0, 28)).toEqual([[0, 2], [2.5, 4], [7, 12], [25, 28]]);
  });
  it('Simple "complement", start on interval limit', function() {
    expect(operators.complement(intervals2, 4, 500)).toEqual([[7, 12], [25, 30], [300, 500]]);
  });
  it('Simple "complement", end on interval limit', function() {
    expect(operators.complement(intervals2, 0, 12)).toEqual([[0, 2], [2.5, 4], [7, 12]]);
  });
  it('Simple "complement", empty input', function() {
    expect(operators.complement([], 0, 100)).toEqual([[0, 100]]);
  });
});

describe('Logical (TEARS) operators on events + intervals.', function() {
  var intervals1 = [[1, 3], [5, 10]];
  var intervals2 = [[2, 2.5], [4, 7], [12, 25], [30, 300]];
  var events1 = [0.5, 4, 15, 57, 112, 300, 434];
  var events2 = [0.5, 4, 57, 110, 305, 434];

  it('Disjoint "events and intervals"', function() {
    expect(operators.and(events1, intervals1)).toEqual([]);
  });
  it('Disjoint "intervals and events"', function() {
    expect(operators.and(intervals1, events1)).toEqual([]);
  });
  it('Simple "events and intervals"', function() {
    expect(operators.and(events1, intervals2)).toEqual([4, 15, 57, 112, 300]);
  });
  it('Simple "intervals and events"', function() {
    expect(operators.and(intervals2, events1)).toEqual([4, 15, 57, 112, 300]);
  });
  it('Simple "events and events"', function() {
    expect(operators.and(events1, events2)).toEqual([0.5, 4, 57, 434]);
  });

  it('Simple "events or intervals" are not defined', function() {
    expect(function() { operators.or(events1, intervals2); }).toThrow();
  });
  it('Simple "intervals or events" are not defined', function() {
    expect(function() { operators.or(intervals2, events1); }).toThrow();
  });
  it('Simple "events or events"', function() {
    expect(operators.or(events1, events2)).toEqual([0.5, 4, 15, 57, 110, 112, 300, 305, 434]);
  });

  it('Simple "complement(events)"', function() {
    expect(operators.complement(events1, 0, 20)).toEqual([[0, 0.5], [0.5, 4], [4, 15], [15, 20]]);
  });

  it('Sequence (->) of events', function() {
    expect(operators.sequence([3, 7, 19], [3, 9, 9.5, 16])).toEqual([9, 9.5, 16]);
  });
  it('Timed sequence (->) of events, v1', function() {
    expect(operators.sequence([3, 7, 10], [3, 9, 9.5, 16], 5)).toEqual([9, 9.5]);
  });
  it('Timed sequence (->) of events, v2', function() {
    expect(operators.sequence([3, 7, 19], [3, 9, 9.5, 16], 5)).toEqual([9, 9.5]);
  });
});

describe('Functional perators.', function() {
  const XMAX = 265.53;
  const eventData = {
    "xAxis": [-0.01000000001,5.55,5.57,10.49,11.75,17.02,58.76,62.82,261.98],
    "values": [1,2,1,2,1,2,1,2,1]
  };
  const intervalData = [[66.71, 69.57], [70.31, 70.43], [70.67, 73.21],
                        [74.49, 125.55], [132.57, 133.07], [133.13, 133.33]];

  // beforeAll(function() {
  //   // const testSignals = readJSON('test/json/SimpleLogWithGear.jsondiff');
  //   // bus.$emit('signal-list-updated', {
  //   //   'SelectorLever_Mode': { 'shortName': 'SelectorLever_Mode',
  //   //                           'data': testSignals.Signal_112 },
  //   //   'EngineSpeed': { 'shortName': 'EngineSpeed',
  //   //                    'data': testSignals.Signal_163 }
  //   // });
  // });

  beforeAll(function() {
    bus.$emit('xmax', XMAX);
  });

  it('Rising edges, discrete signal', function() {
    expect(operators.rising_edge(eventData)).toEqual([5.55, 10.49, 17.02, 62.82]);
  });

  it('Falling edges, discrete signal', function() {
    expect(operators.falling_edge(eventData)).toEqual([5.57, 11.75, 58.76, 261.98]);
  });

  it('Edges, discrete signal', function() {
    expect(operators.edge(eventData)).toEqual([5.55, 5.57, 10.49, 11.75,
                                          17.02, 58.76, 62.82, 261.98]);
  });

  it('Rising edges, expression with continuous signal', function() {
    expect(operators.rising_edge(intervalData)).toEqual([66.71, 70.31, 70.67, 74.49, 132.57, 133.13]);
  });

  it('Between', function() {
    expect(operators.between([1, 2, 3, 4, 5], [1.5, 2.5, 5.5])).toEqual([[1, 1.5], [2, 2.5], [3, 5.5]]);
    expect(operators.between([1, 2, 3, 4, 5], [1.5, 2.5])).toEqual([[1, 1.5], [2, 2.5], [3, bus.getXmax()]]);
    expect(operators.between([0.5, 1, 2], [1.5, 2.5])).toEqual([[0.5, 1.5], [2, 2.5]]);
    expect(operators.between([2, 3, 4, 5], [1.5, 2.5, 5.5])).toEqual([[2, 2.5], [3, 5.5]]);
    expect(operators.between([1, 2, 3], [2, 2.5, 3.5, 4.5])).toEqual([[1, 2], [2, 2.5], [3, 3.5]]);
  });
});
 
