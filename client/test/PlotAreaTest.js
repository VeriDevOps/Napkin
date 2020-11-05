
import Vue from 'vue'
import bus from '../js/EventBus.vue'
import signalListVue from '../js/SignalList.vue'
import plotAreaVue from '../js/PlotArea.vue'
import * as EvalContext from '../js/EvalContext.js';


describe('PlotArea\'s', function() {
    var plotArea;

    beforeEach(function() {
	     plotArea = new Vue(plotAreaVue);
    });

    describe('timeline calculation tests.', function() {
  	var timeline1 = [0, 1, 2, 3];
  	var timeline2 = [0, 0.2, 2.5, 5, 10, 20];
  	var values1   = [0, 1, 4, 9];
  	var values2   = [0, 0.5, 14, 39, 150, 200];
  	var refTimeline = [0, 0.2, 1, 2, 2.5, 3, 5, 10, 20];
  	var refGraphPoints1 = [[0, 0], [0.2, 0], [1, 1], [2, 4], [2.5, 4], [3, 9], [5, 9], [10, 9], [20, 9]];
  	var refGraphPoints2 = [[0, 0], [0.2, 0.5], [1, 0.5], [2, 0.5], [2.5, 14], [3, 14], [5, 39], [10, 150], [20, 200]];
  	var signal1 = {shortName: 'Signal 1', name: 'Signal 1',timestamps: [],newName: 'Signal 1', xAxis: timeline1, values: values1};
  	var signal2 = {shortName: 'Signal 2', name: 'Signal 1',timestamps: [],newName: 'Signal 2', xAxis: timeline2, values: values2};

    var signal1Data = {
                      "exprStr": signal1.shortName,
                      "shortnames": [
                        signal1.shortName,

                      ],
                      "numPlots": 1,
                      "timelines": [
                         timeline1
                      ],
                      "values": [
                      values1
                      ],
                      "valid": []
                    }
    var signal2Data = {
                    "exprStr": signal2.shortName,
                    "shortnames": [
                      signal2.shortName,

                    ],
                    "numPlots": 1,
                    "timelines": [
                       timeline2
                    ],
                    "values": [
                    values2
                    ],
                    "valid": []
                  }

	beforeAll(function() {
    console.log("PlotAreaTest.js::beforeAll");
     EvalContext.getInstance().forceUnitTestSignals([
         signal1,
         signal2
     ])
	    bus.$emit('signal-list-updated');
    //  EvalContext.getInstance().dumpToConsole();

	});

	it('Timeline is empty if no plots', function() {
	    expect(plotArea.commonTimeline.length).toBe(0);
	});

	it('Join one timeline', function() {
      //EvalContext.getInstance().dumpToConsole(true);
	    plotArea.createGuardPlot(signal1Data);
	    expect(plotArea.commonTimeline).toEqual([0, 1, 2, 3, EvalContext.getInstance().getXmax()]);
	});

	it('Join two timelines', function() {
	    plotArea.createGuardPlot(signal1Data);
	    plotArea.createAssertionPlot(signal2Data);
	    //bus.$emit('newplot', signal1Data);
	    //bus.$emit('newplot', signal2Data);
      //console.log("'Join two timelines' Expected timeline ", JSON.stringify(refTimeline));
      //console.log("'Join two timelines' got      timeline ", JSON.stringify(plotArea.commonTimeline));
      //console.log("plotArea.plotSpecificData[0].signals[0].xAxis ",JSON.stringify(plotArea.plotSpecificData[0]))
	    expect(plotArea.commonTimeline).toEqual(refTimeline);
	    expect(plotArea.plotSpecificData[0].signals[0].xAxis).toEqual(timeline1);
	    expect(plotArea.plotSpecificData[1].signals[0].xAxis).toEqual(timeline2);
	});

	//TODO: Move to PlotTest.js
	xit('Adapt graph points to a new timeline', function() {
	    plotArea.createGuardPlot(signal1Data);
	    plotArea.createAssertionPlot(signal2Data);
	    expect(plotArea.$refs.plots[0].graphPoints).toEqual(refGraphPoints1);
	    expect(plotArea.$refs.plots[1].graphPoints).toEqual(refGraphPoints2);
	});

	// function addPlot(signal) {
	// 	return new Promise(function(resolve, reject) {
	// 		plotArea.addPlot(signal);
	// 		plotArea.$forceUpdate();
	// 		resolve();
	// 	});
	// }
    });

    xdescribe('plot update/creation.', function() {
	var engSpeedIntervalData = {
	    "shortName": "EngineSpeed",
	    "highlightIntervals": {
		"validIntervals": '[[66.71, 69.57], [70.31, 70.43], [70.67, 73.21], ' +
		    '[74.49, 125.55], [132.57, 133.07], [133.13, 133.33]]'
	    }
	};
	var tcoVehSpeedIntervalData = {
	    "shortName": "TCOVehSpeed",
	    "highlightIntervals": {
		"passIntervals": '[[75.76, 80.19], [87.29, 107.44], [112.29, 118.29], ' +
		    '[120.34, 125.55], [132.66, 132.98]]',
		"failIntervals": '[[66.71, 69.57], [70.31, 70.43], [70.67, 73.21], ' +
		    '[74.49, 75.76], [132.57, 132.66], [132.98, 133.07], [133.13, 133.29]]'
	    }
	};
	var gaEvalData = {
	    "guardEvaluationData": [ engSpeedIntervalData ],
	    "assertionEvaluationData": [ tcoVehSpeedIntervalData ]
	};

	beforeAll(function() {
            console.group("PlotAreaTest.js::beforeAll")
            var testSignals = readJSON('test/json/SimpleLogWithGear.jsondiff');
            // const gearSignal = { 'shortName': 'Gear', 'data': testSignals.Signal_104 };
            EvalContext.getInstance().setSignalsFromSagaJSONDIFF(testSignals);
            bus.$emit('signal-list-updated');
            EvalContext.getInstance().dumpToConsole();
            console.groupEnd();
        });

	it('Intercepts GA-evaluation update', function() {
	    spyOn(plotArea, 'createGuardPlot');
	    bus.$emit('ga-evaluated', gaEvalData);
	    expect(plotArea.createGuardPlot).toHaveBeenCalledWith(engSpeedIntervalData);
	});

	it('Creates a new guard plot', function() {
	    plotArea.createGuardPlot(engSpeedIntervalData);
	    expect(plotArea.plotSpecificData.length).toEqual(1);
	    expect(plotArea.plotSpecificData[0].validIntervals).toEqual(engSpeedIntervalData.validIntervals);
	});
	xit('Creates exactly one new guard plot', function() {
	    plotArea.createGuardPlot(engSpeedIntervalData);
	    plotArea.createGuardPlot(engSpeedIntervalData);
	    expect(plotArea.plotSpecificData.length).toEqual(1);
	    expect(plotArea.plotSpecificData[0].validIntervals).toEqual(engSpeedIntervalData.validIntervals);
	});
	it('Updates existing guard plot data', function() {
	    var newEngSpeedIntervalData = {
		"shortName": "EngineSpeed",
		"highlightIntervals": {
		    "validIntervals": '[[100, 200], [300, 400]]'
		}
	    };
	    plotArea.createGuardPlot(engSpeedIntervalData);
	    plotArea.createGuardPlot(newEngSpeedIntervalData);
	    expect(plotArea.plotSpecificData[0].validIntervals).toEqual(newEngSpeedIntervalData.validIntervals);
	});

	it('Creates a new assertion plot', function() {
	    plotArea.createAssertionPlot(tcoVehSpeedIntervalData);
	    expect(plotArea.plotSpecificData.length).toEqual(1);
	    expect(plotArea.plotSpecificData[0].passIntervals).toEqual(tcoVehSpeedIntervalData.passIntervals);
	    expect(plotArea.plotSpecificData[0].failIntervals).toEqual(tcoVehSpeedIntervalData.failIntervals);
	});
	xit('Creates exactly one new assertion plot', function() {
	    plotArea.createAssertionPlot(tcoVehSpeedIntervalData);
	    plotArea.createAssertionPlot(tcoVehSpeedIntervalData);
	    expect(plotArea.plotSpecificData.length).toEqual(1);
	    expect(plotArea.plotSpecificData[0].passIntervals).toEqual(tcoVehSpeedIntervalData.passIntervals);
	    expect(plotArea.plotSpecificData[0].failIntervals).toEqual(tcoVehSpeedIntervalData.failIntervals);
	});
	it('Updates existing assertion plot data', function() {
	    var newTcoVehSpeedIntervalData = {
		"shortName": "TCOVehSpeed",
		"highlightIntervals": {
		    "passIntervals": '[[100, 200], [300, 400]]',
		    "failIntervals": '[[1000, 2000], [3000, 4000]]',
		}
	    };
	    plotArea.createAssertionPlot(tcoVehSpeedIntervalData);
	    plotArea.createAssertionPlot(newTcoVehSpeedIntervalData);
	    expect(plotArea.plotSpecificData[0].passIntervals).toEqual(newTcoVehSpeedIntervalData.passIntervals);
	    expect(plotArea.plotSpecificData[0].failIntervals).toEqual(newTcoVehSpeedIntervalData.failIntervals);
	});

	it('Removes a single plot using a function call', function() {
	    plotArea.createGuardPlot(engSpeedIntervalData);
	    plotArea.createAssertionPlot(tcoVehSpeedIntervalData);
	    plotArea.removePlot(engSpeedIntervalData.shortName);
	    expect(plotArea.plotSpecificData.length).toEqual(1);
	    expect(plotArea.plotSpecificData[0].signals[0].shortName).toEqual(tcoVehSpeedIntervalData.shortName);
	});

	xit('Removes plots for signals that are no longer in gaEvaluationData', function() {
	    // spyOn(plotArea, 'removePlot');
	    plotArea.createGuardPlot(engSpeedIntervalData);
 	    plotArea.createAssertionPlot(tcoVehSpeedIntervalData);
	    bus.$emit('ga-evaluated', {
		"guardEvaluationData": [],
		"assertionEvaluationData": [ tcoVehSpeedIntervalData ]
	    });
	    // expect(plotArea.removePlot).toHaveBeenCalledWith(engSpeedIntervalData.shortName);
	    expect(plotArea.plotSpecificData.length).toEqual(1);
	    expect(plotArea.plotSpecificData[0].signals[0].shortName).toEqual(tcoVehSpeedIntervalData.shortName);
	});

	// it('Removes graph when a signal is no longer in the ga-editor', function() {
	// 	var gaEvaluationData = {
	// 		"shortName": "EngineSpeed"
	// 	}
	// });
    });
});
