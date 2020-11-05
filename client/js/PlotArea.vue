EvalContext<template>
<div id="plotarea" style=" ">
  <table style=" width:100%;display: block">
    <thead><tr><th></th></tr></thead>
    <tbody style="width: 100%; display: block;">
      <tr style="width: 100%; display: block;" v-for="(plotData, index) in plotSpecificData">
        <td style="width: 100%; display: block;">
          <plot ref="plots"
            :plotData = "plotData"
            :commonData = "commonData"
            :numericId = "index"
            :zoomLimits.sync = "zoomLimits"
            :selection.sync = "selection"
            :timeline="commonTimeline">
          </plot>
        </td>
      </tr>
    </tbody>
  </table>
</div>
</template>

<script>
import bus from './EventBus.vue';
import plot from './Plot.vue';
import {PLOT_TYPE, isNumeric} from './Util.js';
import * as EvalContext from "./EvalContext.js"

/**
 * Creates plots in response to either manual signal selection or GAEditor-updates.
 *
 * Each plot is described by its plotSpecificData:
 *  Manually created plots correspond directly to signals and thus contain
 *    only appropriate signal data.
 *  GAEditor-related plots correspond to GA-expressions and can be of two types:
 *    either guard and assertion plots. In addition to signal data, they contain
 *    valid data (intervals or timestamps) for an expression.
 *
 * In addition, the plots share some commonData, consisting of:
 *  valid guard intervals/timestamps
 *  assertion pass intervals/timestamps
 *  assertion fail intervals/timestamps
 *
 * Each plot has a unique id.
 * The plots share a common x-axis (timeline).
 *
 * Zoom, pan, and selection (value highlighting) are synchronized between the plots.
 * (This could be done using the built-in synchronized()-function of Dygraphs.
 *  However, that would lead to 3-4 times longer time for repainting each plot.)
 */
export default {
    name: 'plotarea',
    components: {
        plot
    },
    data() {
    return {
            plotSpecificData: [],
            commonData: {valid: [], pass: [], fail: []},
            zoomLimits: [],
            selection: -1,
            commonTimeline: [],
            manuallySelectedPlotSignals: {}
        };
    },
    methods: {
        joinTimelines() {
            var timeline = [];
            var nrPlottedSignals = this.plotSpecificData.length;
            if (nrPlottedSignals > 0)
            {
                for(var i = 0; i < nrPlottedSignals; i++)
                {
                    let storedSignal = findStoredSignalInPlotData(this.plotSpecificData[i]);
                    if (storedSignal !== undefined) {
                        timeline = EvalContext.joinTimelines(timeline, storedSignal.xAxis);
                    }
                }
            }
            //BUGFIX
            if (timeline === undefined || timeline.length === 0) {
                timeline = [0, bus.getEvalContext().getXmax()];
            }
            this.commonTimeline = timeline;
        },
        createGuardPlot(evalData) {
            this.createPlot(evalData, PLOT_TYPE.GUARD);
        },
        createAssertionPlot(evalData) {
            this.createPlot(evalData, PLOT_TYPE.ASSERTION);
        },
        createPlot(evalData, type) {
            var self = this;
            var signals = [];
            var plotName = evalData.exprStr;

            for (var i = 0; i < evalData.numPlots; i++) {
		            signals.push({name: evalData.shortnames[i],
                              shortName: evalData.shortnames[i],
                              xAxis: evalData.timelines[i],
                              values: evalData.values[i]});
            }

            var plotData = {
                "name": plotName,
                "type": type,
                "signals": signals,
                "valid": evalData.valid
            };
             this.plotSpecificData.push(plotData);

            this.joinTimelines();
        },
        /**
        *   Wait for the plottedSignals[]-array to initialize before adding an element.
        *   This is important when the page is loaded, otherwise the order might be reversed
        *   and the graph table v-for-loop thinks that there are no plots to show.
        */
        createManuallySelectedPlot(signal) {
            var plotData = {
                "signals": [signal]
            };
            this.$nextTick(function() {
                this.plotSpecificData.push(plotData);

            });
        },
        removePlot(signalName) {
            for (let i=0; i < this.plotSpecificData.length; i++) {
                let plottedSignal = findStoredSignalInPlotData(this.plotSpecificData[i]);
                if (plottedSignal.name === signalName ||
                    plottedSignal.shortName === signalName) {
                    this.plotSpecificData.splice(i, 1);
                    break;
                }
            }
        },
        clearPlots() {
            this.plotSpecificData = [];
        }
    },
    watch: {
        plotSpecificData(newVal, oldVal) {
            this.joinTimelines();
        },
    },
    created() {
         var self = this;
         bus.$on('newplot', function(name) {
             let signal = bus.getEvalContext().getSignal(name);
             self.manuallySelectedPlotSignals[name] = signal;
             self.createManuallySelectedPlot(signal);

         });
         bus.$on('removeplot', function(name) {
             delete self.manuallySelectedPlotSignals[name];
             self.removePlot(name);
         });
         bus.$on('clear-plots', function() {
             self.clearPlots();
         });
         bus.$on('new-eval-context-avaliable', function(_data) {
             console.log("PlotArea.vue::on new-eval-context-avaliable, now we should remove all plots");
             self.clearPlots();
         });
         bus.$on('ga-evaluated', function(evalDataStr) {
             self.clearPlots();

             var evalData = JSON.parse(evalDataStr);
             self.commonData = evalData.times;
             evalData.guards.forEach(data => self.createGuardPlot(data));
             evalData.assertions.forEach(data => self.createAssertionPlot(data));
             Object.values(self.manuallySelectedPlotSignals).forEach(signal => self.createManuallySelectedPlot(signal));

         });
    }
}

function findStoredSignalInPlotData(plotData) {
    for (let i=0; i<plotData.signals.length; i++) {
        let signal = plotData.signals[i];
        console.log("PlotArea.vue::findStoredSignalInPlotData looking up ",i,signal.name);
        if (signal !== undefined && bus.getEvalContext().getSignal(signal.name) != undefined) {

            return signal;
        }
    }
}
</script>

<style>
table {
    width: 100%;
}
</style>
