<template>
<div id="plotarea" style=" ">
  <table style=" width:100%;display: block">
    <thead><tr><th></th></tr></thead>
    <tbody style="width: 100%; display: block;">
      <tr v-for="(plotData, index) in plotSpecificData"  style="width: 100%; display: block;"  v-bind:key="JSON.stringify(plotData)" >
        <td style="width: 100%; display: block;">
          <plot ref="plots"

            :plotData = "plotData"
            :commonData = "commonData"
            :index = "index"
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
            zoomLimits: [0,1000], // DEBUG
            selection: -1,
            commonTimeline: [],
            manuallySelectedPlotSignals: {},
            plotSRL:0
        };
    },
    methods: {
        joinTimelines() {

          //console.log("PlotArea.vue::joinTimelines ENTER");

            var timeline = [];
            this.plotSpecificData.forEach(plot =>{
                if(plot.signals != undefined){
                plot.signals.forEach(signals => {
                  timeline = EvalContext.getInstance().joinTimelines(timeline, signals.xAxis);
                }) // For each subplot
              }

              // We also have timelines for events and ranges:
              if(plot.events != undefined){
                plot.events.forEach(subplot => {

                  timeline = EvalContext.getInstance().joinTimelines(timeline, subplot.events);
                }) // For each subplot
              }

              // We also have timelines for events and ranges:
              if(plot.intervals != undefined){
                plot.intervals.forEach(subplot => {
                  var tline = [];
                  subplot.intervals.forEach(r =>{
                    tline.push(r[0]);
                    tline.push(r[0] + (r[1]-r[0])/2.0);
                    //tline = tline.concat(r);
                    tline.push(r[1]);

                  });
                  timeline = EvalContext.getInstance().joinTimelines(timeline, tline);
                 // Adding above for the complement would step up the plot a bit.

                }) // For each subplot
              }

            }) // For each plot.

            if (timeline.length === 0) {
                timeline = [0, EvalContext.getInstance().getXmax()];
            }
            this.commonTimeline = timeline;
          //  console.log("PlotArea.vue::joinTimelines EXIT",timeline);

        },
        /**
        *   Wait for the plottedSignals[]-array to initialize before adding an element.
        *   This is important when the page is loaded, otherwise the order might be reversed
        *   and the graph table v-for-loop thinks that there are no plots to show.
        */
        createManuallySelectedPlot(signal,hidden = true) {
        //console.log("Creating manually selected plot3 (name,plotSRL,hidden)", signal.shortName,this.plotSRL,hidden, "nr of plots so far " + this.plotSpecificData.length);

            var plotData = {
                plotSRL:this.plotSRL++,
                manual:true,
                hidden:hidden,
                exprStr : signal.shortName + ":" + signal.name,
                "signals": [signal]
            };


            this.$nextTick(function() {
                this.manuallySelectedPlotSignals[signal.newName] = {name:signal,data:plotData};
                this.plotSpecificData.push(plotData);
            });
            //console.log("Now we have plotspecific data as: ",this.plotSpecificData.length)
        },
        removeManuallySelectedPlot(signalName) {
          let self = this;
          //console.log("PlotArea.vue::removeManuallySelectedPlot:" + signalName);
            for (let i=0; i < self.plotSpecificData.length; i++) {
                let curr =  self.plotSpecificData[i];
                if (typeof curr.signals !== "undefined" && curr.signals.length == 1){
                  if (curr.signals[0].newName === signalName) {
                      self.plotSpecificData.splice(i, 1);
                     let res =   delete self.manuallySelectedPlotSignals[signalName];
                      break;
                  }
                }
            }//for

            this.$forceUpdate();
      },
       clearPlots() {
          while(this.plotSpecificData.length > 0){
            this.plotSpecificData.pop();
          }
      },//clear
      restoreManualPlots(){
        //console.log("PlotArea.vue::restoreManualPlots");
        let self = this;
        Object.values(self.manuallySelectedPlotSignals).forEach(signal =>{
            self.plotSpecificData.push((signal.data));
        });
      },
      onAddMatchingPlots(start,end){
          var self = this;
          //console.log("PlotArea.vue::onAddMatchingPlots")
          let res = EvalContext.getInstance().getMatches_ChangeWithinTimeSpan(start,end);


        
          let oldZoomLimits = self.zoomLimits;
        //  bus.$emit('remove-all-manual-plots');
          let i = 0;
          self.plotSpecificData.forEach(p => {if(!p.hidden) i++;});
          res.forEach(s=>{
            //console.log("Found signal " + s.matchingSamples + " " + s.newName ," selected:",s.selected)
            if(!s.selected){
              s.selected = true;
              this.createManuallySelectedPlot(s,i++>10); // first few expanded, the rest collapsed.
            }
            else{
              //console.log("Signal is already selected ", s.newName)
            }

          })

          self.zoomLimits = [oldZoomLimits[0], oldZoomLimits[1]];
          self.$forceUpdate();

      },
      onGaEvaluated(evalDataStr){
            var self = this;
            var evalData = JSON.parse(evalDataStr);

            //console.log("PlotArea.vue::on ga-evaluated ",evalDataStr);
            //console.log("PlotArea.vue::on ga-evaluated, now we should remove all plots(initial length, evalData) ",self.plotSpecificData.length,evalData);

            self.clearPlots();
            //console.log("PlotArea.vue::on ga-evaluated (ENTER next tick), all plots should be gone (length)", self.plotSpecificData.length);

            self.commonData = evalData.times;
            // If we have ignore or allow statements, add those options to the commonData
            if(evalData.hasOwnProperty('leftIgnore')){
                self.commonData.leftIgnore = evalData.leftIgnore;      
            }
            if(evalData.hasOwnProperty('rightIgnore')){
                self.commonData.rightIgnore = evalData.rightIgnore;
            }
            if(evalData.hasOwnProperty('allowMaxFail')){
                self.commonData.allowMaxFail = evalData.allowMaxFail;
            }

            evalData.name   = evalData.exprStr;  //Backw compatibility

            if(self.plotSpecificData.length > 0)
            {
              console.warn("PlotArea.vue::ga-evaluated:: plot not empty!", self.plotSpecificData);
              console.log("PlotArea.vue::ga-evaluated:: Incoming !", evalDataStr);
              //return;
            }

            var count = 1;
            var expressions = []
            evalData.guards.forEach(data =>{
              //console.log("PlotArea.vue::ga-evaluated:: adding (guard)     plot: ",JSON.stringify(data.exprStr));
              if (count++ >1){data.hidden = true} // only show first guard expanded
              data.plotSRL = self.plotSRL++;
              if(!expressions.includes(data.exprStr)){
                self.plotSpecificData.push((data));
                expressions.push(data.exprStr);
              }
            });

            count = 1;
            evalData.assertions.forEach(data =>{
              if (count++ >1){data.hidden = true} // only show first assertion expanded
              data.plotSRL = self.plotSRL++;
              //console.log("PlotArea.vue::ga-evaluated:: adding (assertion) plot: ",JSON.stringify(data.exprStr));
              if(!expressions.includes(data.exprStr)){
                self.plotSpecificData.push((data));
                expressions.push(data.exprStr);
              }
               ;
            });

            self.restoreManualPlots(); // Put back manual plots in same order as before....
           
      }
    },

    watch: {
        plotSpecificData(newVal, oldVal) {
            this.joinTimelines();
        },
    },

    created() {
         var self = this;
         self.plotSRL = 0;
         bus.$on('add-matching-plots',self.onAddMatchingPlots);
         bus.$on('newplot', function(signal) {
             self.createManuallySelectedPlot(signal,false);
         });
         bus.$on('removeplot', function(name) {
             self.removeManuallySelectedPlot(name);
         });
         bus.$on('clear-plots', function() {
             self.clearPlots();
         });
         bus.$on('new-eval-context-avaliable', function(_data) {
             //console.log("PlotArea.vue::on new-eval-context-avaliable, now we should remove all plots");
             self.clearPlots();
         });
         bus.$on('ga-evaluated', self.onGaEvaluated); 
    }//created
}


</script>

<style>
table {
    width: 100%;
}
</style>
