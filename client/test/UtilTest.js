import * as Util from '../js/Util.js';
//import bus from '../js/EventBus.vue';
import * as EvalContext from '../js/EvalContext.js';
describe('Util', function() {
  it('interpolates variable data to timeline', function() {
    var data = {
      "xAxis": [0,3.65,3.67,3.69,3.71,3.73,3.75,3.77,3.79,3.81,3.83,3.85,3.87,3.89,3.91,3.93,3.95,3.97,3.99,4.01],
      "values": [0,187,184.5,183.125,186.625,190.25,192.25,194.5,196.5,198,199.25,200.375,201.5,202.5,203.25,203.875,205,205.5,211,238.375]
    }
    var timeline = [-1,0,1,2,3,3.65,3.66,3.67,3.69,3.70,3.71,3.73,3.75,3.77,3.79,3.81,3.83,3.85,3.87,3.89,3.91,3.93,3.95,3.97,3.99,4.01];
    var expectedInterpolatedValues = [0,0,0,0,0,187,187,184.5,183.125,183.125,186.625,190.25,192.25,194.5,196.5,198,199.25,200.375,201.5,202.5,203.25,203.875,205,205.5,211,238.375];
    expect(EvalContext.getInstance().interpolateDataToTimeline(data, timeline)).toEqual(expectedInterpolatedValues);
  });

  it('interpolates constant valued data to timeline', function() {
    var data = {
      "xAxis": 0,
      "values": 3
    }
    var timeline = [-1,0,1,2,3,3.65,3.66,3.67,3.69,3.70,3.71,3.73,3.75,3.77,3.79,3.81,3.83,3.85,3.87,3.89,3.91,3.93,3.95,3.97,3.99,4.01];
    var expectedInterpolatedValues = [];
    for (let i=0; i<timeline.length; i++) {
      expectedInterpolatedValues.push(data.values);
    }
    expect(EvalContext.getInstance().interpolateDataToTimeline(data, timeline)).toEqual(expectedInterpolatedValues);
  });

  it('joins timelines, one of them is empty', function() {
    var t1 = [];
    var t2 = [1, 2, 3, 4];
    EvalContext.getInstance().forceUnitTestMinMax(0,10);
    EvalContext.getInstance().dumpToConsole();
    var res = [EvalContext.getInstance().getXmin(), 1, 2, 3, 4, EvalContext.getInstance().getXmax()];
    expect(EvalContext.joinTimelines(t1, t2)).toEqual(res);
    expect(EvalContext.joinTimelines(t2, t1)).toEqual(res);
  });
});
