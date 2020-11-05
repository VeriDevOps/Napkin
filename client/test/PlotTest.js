/***** This test does not make any sense at all.


import Vue from 'vue'
import bus from '../js/EventBus.vue'
import PlotComponent from '../js/Plot.vue'
import * as EvalContext from '../js/EvalContext.js';
describe('Plot', function() {
  const Constructor = Vue.extend(PlotComponent);
  var plot, engineSpeedPlotData;

  beforeAll(function() {
    //console.log(" PLOT running before all function")
    const testSignals = readJSON('test/json/SimpleLogWithGear.jsondiff');


    var signals = [];
    var sig163 = testSignals.Signal_163;
    sig163.name = 'central1_can1\/BusSystems\/CAN\/Red_Main\/EEC1_E\/RX\/EngineSpeed';
    sig163.shortName = 'EngineSpeed';
    sig163.selected = false;
    sig163.filter = true;
    sig163.dirty = false;
    sig163.timestamps =  [];
    signals.push(sig163);

    //console.log("PlotTest created signals set as: " + JSON.stringify(signals));
    bus.$emit('signal-list-updated',signals);
    engineSpeedPlotData = {
      'signals': [bus.getSignal('EngineSpeed'), bus.getSignal('EngineSpeed')],
      'highlightIntervals': {
        'validIntervals': []
      }
    };
      console.log("Trying to get signal from bus", EvalContext.getInstance().getSignal('EngineSpeed'))
    //console.log("PLOT Receiving bus.getSignal" + JSON.stringify(bus.getSignal('EngineSpeed')))
    //console.log(" PLOT running all but the plot")
    plot = new Constructor({
                propsData: {
                  plotData: engineSpeedPlotData,
                  numericId: 1,
                  zoomLimits: [],
                  selection: -1,
                  timeline: engineSpeedPlotData.signals[0].data.xAxis
                }
            }); //constructor
    //console.log(" PLOT running created the plot")
    //console.log("beforeAll Created plot: ", JSON.stringify(plot));
  }); // beforeAll

  it('correctly initialized', function() {
    expect(plot.id).toEqual("plot_1");

    expect(plot.plotData).toEqual(engineSpeedPlotData);
  });
});
*/
