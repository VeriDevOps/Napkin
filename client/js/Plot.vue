<template>
    <div >
       <table ><tr  ref="plottitle" @click="onHideShowGraph()" >

                    <td  v-if="typeof plotData.manual !== 'undefined'"
                           draggable="true"
                           @dragstart="onStartDrag($event,plotData.signals[0].newName)" >
                         <small> <code> <span v-if="this.plotData.signals[0].dirty == true" style="color:red}">
                                          {{ plotData.exprStr.split(':')[0] }}
                                      </span>
                                      <span v-else>
                                            {{ plotData.exprStr.split(':')[0] }}
                                     </span>
                                  </code>:
                                 <span :style="{color:this.plotData.signals[0].dirty?'red':'black'}">
                                 {{ plotData.exprStr.split(':')[1] }} : {{ this.plotData.signals[0].logInfo?this.plotData.signals[0].logInfo.name:""}}
                               </span>
                         </small><br>
                   </td>
                   <td  v-if="typeof plotData.manual === 'undefined'" >
                         <small> {{ plotData.exprStr.split(':')[0] }} :<code>  {{  plotData.exprStr.split(':')[1] }}</code></small><br>
                    </td>
                    <td style="text-align: right;background:white">
                         <A v-if="typeof plotData.manual !== 'undefined'" href="#" @click="closeManual" >Close</A>
                  <!--    <A   href="#" @click="toggleRangeSelector()" >Range-Selector</A>
                      <A href="#" @click="setSize(true)" > BIG</A><A href="#" @click="setSize(false)" > small</A> -->

               </td>
             </tr>
        </table>
        <div v-bind:id="id"  ref="graphDiv" style="height:100px; width:100%; display:block;"  @contextmenu.prevent="onContextMenu" ></div>

 
        <vue-context id="CtxMenuPlots" ref="plotmenu" style="max-height:500px;overflow:hidden; overflow-y:scroll;">
              <li>
                  <a v-if="typeof plotData.manual !== 'undefined'" href="#" @click.prevent="onClick('closeThis')">Close This Plot</a>
              </li>
               <li>
                   <a href="#" @click.prevent="onClick('closeAll')">Close All Manual Plots </a>
               </li>
               <li>
                   <a href="#" @click.prevent="onClick('getMatch')"> Plot Signals With Changes During Zoomed Area </a>
               </li>
               <li>
                   <a href="#" @click.prevent="onClick('rangeSelector')"> Show / Hide Range Selector </a>
               </li>
               <li>
                   <a href="#" @click.prevent="onClick('big')"> Make This Plot Big </a>
               </li>
               <li>
                   <a href="#" @click.prevent="onClick('small')"> Make This Plot Small </a>
               </li>
               <hr v-if="typeof plotData.manual !== 'undefined'">
               <li v-if="typeof plotData.manual !== 'undefined'">
                 <table><tr>  Added Latency:</tr>
                     <tr><td><b-form-input style="width:80%" ref="latencyInput"
                           @click="function(e){e.stopPropagation();e.preventDefault();return false;}"
                           @enter="setNewLatency"
                           v-model="newLatency"
                           :state="!isNaN(parseFloat(newLatency))"
                        />
                    </td><td>
                        <b-button @click="setNewLatency()" variant="success"  > Set</b-button>
                      </td></tr></table>

               </li>
               <hr>

             <input type="checkbox" v-model="hiearchicalPassFailLinks" value="true"
                      style=" -moz-transform: scale(2);margin-right:10px;margin-left:5px;align=center;"
                     @click="function(e){e.stopPropagation();e.preventDefault;hiearchicalPassFailLinks =!hiearchicalPassFailLinks;return false;}"
             >Hiearchical Pass / Fail Result.

              <hr>
                  <div v-if="hiearchicalPassFailLinks==false">
                         <div v-for="valid in commonData.valid" >

                            <a href="#" @click.prevent="onClickZ( valid )" :style="{color:'gray',fontWeight:withinVisibleRange(valid)?'bold':'normal'}" > GUARD: {{valid}}
                              <span v-if="Array.isArray(valid)"> <small>({{valid[1]-valid[0]}}s long)</small></span>
                            </a>
                          </b>
                        </div>
                        <hr>
                         <div v-for="pass in commonData.pass" >
                            <a href="#" @click.prevent="onClickZ( pass )"  :style="{color:'green',fontWeight:withinVisibleRange(pass)?'bold':'normal'}" > PASS: {{pass}}
                                <span v-if="Array.isArray(pass)"><small> ({{pass[1]-pass[0]}}s long)</small></span>
                            </a>

                         </div>
                         <hr>
                         <div v-for="fail in commonData.fail" >
                            <a href="#" @click.prevent="onClickZ( fail )"  :style="{color:'red',fontWeight:withinVisibleRange(fail)?'bold':'normal'}" > FAIL: {{fail}}
                                 <span v-if="Array.isArray(fail)"> <small> ({{fail[1]-fail[0]}}s long)</small></span>
                            </a>
                         </div>
                      </div>    
                      
                       <!-- end of non hiarch pass/fail list-->
 
               <div v-if="hiearchicalPassFailLinks==true">
                    <div v-for ="guard in sortGAresult(commonData)" >
                    <li>  <a href="#" @click.prevent="onClickZ( guard.guard )" :style="{color:'gray',fontWeight:withinVisibleRange(guard.guard)?'bold':'normal'}" >
                          GUARD: {{guard.guard}}
                        <span v-if="Array.isArray(guard.guard)"> <small>({{guard.guard[1]-guard.guard[0]}}s long)</small></span>
                      </a>
                    </li>
                      <li v-for="pass in guard.pass" >

                         <a href="#" @click.prevent="onClickZ( pass )"  :style="{marginLeft:'30px',color:'green',fontWeight:withinVisibleRange(pass)?'bold':'normal'}" > PASS: {{pass}}
                             <span v-if="Array.isArray(pass)"><small> ({{pass[1]-pass[0]}}s long)</small></span>
                         </a>

                      </li>
                      <div v-for="fail in guard.fail" >
                         <a href="#" @click.prevent="onClickZ( fail )"  :style="{marginLeft:'30px',color:'red',fontWeight:withinVisibleRange(fail)?'bold':'normal'}" > FAIL: {{fail}}
                            <span v-if="Array.isArray(fail)"> <small> ({{fail[1]-fail[0]}}s long)</small></span>
                         </a>
                      </div>
                  </div>
                </div> 
                 
                <!-- end of hiearchical pass/fail list -->
            
           </vue-context>  


    </div>
</template>

<script>
import bus from './EventBus.vue';
import Dygraph from 'dygraphs';
import * as Util from './Util.js';
import * as EvalContext from './EvalContext.js';

import { VueContext } from 'vue-context';

const SELECTION_CLEARED = -1;
/*
const STYLES = Object.freeze({
  "VALID": "validIntervals",
  "PASS": "passIntervals",
  "FAIL": "failIntervals"
});
const FILLSTYLES = Object.freeze({
  [STYLES.VALID]: "rgba(255, 255, 102, 1.0)",
  [STYLES.PASS]:  "rgba(0, 255, 0, 1.0)",
  [STYLES.FAIL]:  "rgba(255, 0, 0, 1.0)"
});
var DASHSTYLES = Object.freeze({
  [STYLES.VALID]: "blue",
  [STYLES.PASS]:  "rgba(0, 100, 0)",
  [STYLES.FAIL]:  "rgba(255, 0, 0)"
});


 //const PLOTCOLORS=["green","blue","cyan"];
*/
export default {
  name: "plot",
  components: {
   VueContext
  },
	props: {
    plotData: {},
    commonData: {},
//		numericId: 0,
    zoomLimits: { type: Array },
    selection: { type: Number },
    timeline: { type: Array }
	},
	computed: {
		id: function() {
      return "plot_" + this.plotData.plotSRL;
		},

	},
	data() {
		return {
      graphPoints: [],
      graph: {},
      canvas: {},
      area: {},
      recentlyUpdated: false,
      showRangeSelector: false,
      visible:false,
      newLatency:0,
      hiearchicalPassFailLinks:false,
    };
	},

	methods: {
    sortGAresult(res){

      // Get the starting time of the first event or interval
      function _getFirstStart(intervalsOrEvents){
        let el =  intervalsOrEvents[0];
        return Array.isArray(el)?el[0]:el;
      }
      // Count the occurences of each value in arr
      function _counts(arr){
        let res = {};
        arr.forEach(p => {
          if(res.hasOwnProperty(p))
            res[p]++;
          else
           res[p] = 1;
          })
          return res;
      }//_counts

      //console.log("------------------------>   sortGAresult:",JSON.stringify(res))
      if (res.valid == undefined || res.valid.length == 0 ) return; // TODO some default struct here.

      let guards = [];
      let G = [...res.valid];
      let P = [...res.pass];
      let F = [...res.fail]
      let currentGuard = {
         guard:G.shift(),
         pass:[],
         fail:[]
      };
      let nextGuard = G.shift();

      while(typeof nextGuard !== 'undefined')
      {
        let ts = _getFirstStart(nextGuard);
        while(P.length > 0 && (_getFirstStart(P) < ts))
            currentGuard.pass.push(P.shift());
        while(F.length > 0 && (_getFirstStart(F) < ts))
            currentGuard.fail.push(F.shift());
        // NEXT
        guards.push(currentGuard);
        currentGuard = { guard:nextGuard,pass:[],fail:[]};
        nextGuard = G.shift();
      }
      // Add remaining P & F to the last guard.
      while(P.length > 0 )
          currentGuard.pass.push(P.shift());
      while(F.length > 0 )
          currentGuard.fail.push(F.shift());
      guards.push(currentGuard);

      // Some fun stats:
      guards.latencies_p = [];
      guards.latencies_f = [];
      guards.forEach(g => {
        let start = _getFirstStart(g.guard);
        g.pass.forEach(p=>{
          let ts = _getFirstStart(p);
          guards.latencies_p.push(Math.trunc(1000 * (ts-start)));
        })
        g.fail.forEach(f=>{
          let ts = _getFirstStart(f);
          guards.latencies_f.push(Math.trunc(1000 * (ts-start)));
        })
      })

      guards.passLatsCount = _counts(guards.latencies_p);
      guards.failLatsCount = _counts(guards.latencies_f);

      //console.log("<------------------------   sortGAresult:",JSON.stringify(guards))
      //console.log("<------------------------   sortGAresult: P lat:",
      //            JSON.stringify(guards.latencies_p),
      //            "F lat:", JSON.stringify(guards.latencies_f)
      //);
      //console.log("<------------------------   sortGAresult: P lat counts:",
      //            JSON.stringify(guards.passLatsCount),
      //            "F lat counts :", JSON.stringify(guards.failLatsCount)
      //);

      return guards;
    },
    setNewLatency(){

      if(!this.plotData.signals) return;

      let signal = this.plotData.signals[0];
      let xAxis  = signal.xAxis;
      let move   = parseFloat(this.newLatency)

      if(signal.latency != undefined){
        move -= signal.latency;         //undo old latency
      }

      signal.latency = parseFloat(this.newLatency);

      for(let i = 0; i < xAxis.length; i++){
        xAxis[i] = xAxis[i] + move;
      }

      bus.$emit('edited-signal-updated', signal.newName) ;

    },
    onStartDrag(e,signalName) {
      //console.log("Plot.vue::DRAGGING ",signalName)
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/html', signalName);
    },
    onHideShowGraph(){
       this.plotData.hidden = !this.plotData.hidden;
       this.hideShowGraph();
       return false;
    },
    withinVisibleRange(R){
      if (!this.zoomLimits){
        //console.log("withinVisibleRange::this.zoomLimits is Null",this)
        return false;
        }
      if(Array.isArray(R)){
      // if it starts or ends in the range, we consider it to be visible.
      return (R[0] >= this.zoomLimits[0] && R[0] <= this.zoomLimits[1]) ||
             (R[1] >= this.zoomLimits[0] && R[1] <= this.zoomLimits[1])
      }else{
       return (R >= this.zoomLimits[0] && R <= this.zoomLimits[1]);
      }
    },
    hideShowGraph(){
      var el  = this.$refs.graphDiv;
      if(typeof el === 'undefined'){
        //console.log("Plot.vue trying to access null graphDiv ", this.plotData.signals[0].newName);
        return;
      }
      if (this.plotData.hidden == true){
        el.style.display = "none";
        this.$refs.plottitle.style.background = "lightgray"
      }else{
        el.style.display = "block";
        this.$refs.plottitle.style.background = "white";
        this.recentlyUpdated = true;
        this.updateGraphPoints();
        this.newPlot();
      }
    },
    onContextMenu(e){
      e.stopPropagation();
      console.log("Plot.vue::onContextMenu(e=",e,")");
      this.$refs.plotmenu.open(e);
     },
     onClickZ (range){
       console.log("Zooming in on area ",range, Array.isArray(range));
       let min = 0;
       let max = 0;
       if(!Array.isArray(range)){   // Event +- 10%
         min = range - range*0.1;
         max = range + range*0.1;
       }
       else if (range.length == 2){
         min = range[0] - range[0]*0.1;
         max = range[1] + range[1]*0.1;
       }
      //console.log("Zooming in on final area ",[min, max]);
       this.$emit('update:zoomLimits', [min, max]);
      },
     onClick (choice) {

       switch(choice){
         case 'closeThis':
          this.closeManual();
         break;

        case'closeAll':
          bus.$emit('remove-all-manual-plots')
        break;

        case 'getMatch':
            bus.$emit('add-matching-plots', this.zoomLimits[0],this.zoomLimits[1]);
        break;

        case 'rangeSelector':
          this.toggleRangeSelector();
          this.setSize(this.showRangeSelector);
        break;
        case 'big':
        this.setSize(true);
        break;
        case 'small':
        this.setSize(false);
        break;

       }

     },
      on_bus_invalidatePlots(){
        if (this.plotData.hidden == true) return;
        var self = this;
        if( self.invalidated == undefined || self.invalidated == false){

         if (typeof self.canvas !== 'undefined' && self.canvas.fillRect != undefined){
            //console.log("Plot.vue::on_bus_invalidatePlots:: Invalidating ",self,self.canvas)
            self.canvas.fillStyle = "rgb(226,227,229,0.5)";
            self.canvas.fillRect(0,0,this.area.w,this.area.w);}
            self.invalidated = true;
        }
    },
    /**
     * If the graph has been initialized, this function repaints.
     *
     * This is done by updating data, which in turn triggers relevant callback
     * (e.g. underlayCallback and drawCallback).
     */
    repaint() {
      if (this.plotData.hidden == true) return;
    //  console.time("repaint");
      this.clearHighlighting();
      if (Object.keys(this.graph).length > 0) {
        this.graph.updateOptions({
          'file': this.graphPoints
        });
      }
    //  console.timeEnd("repaint");
    },
    toggleRangeSelector(){
      this.showRangeSelector = ! this.showRangeSelector;
      this.newPlot();
      return false;
    },
    closeManual(e){
        if(e){
         e.preventDefault();
         e.stopPropagation();
        }
        this.plotData.signals[0].selected = false;
      	bus.$emit('removeplot', this.plotData.signals[0].newName);
        return false;
    },
    setSize(toBig){
      if(toBig == true){
       document.getElementById(this.id).style.height = "200px";
    }else{
          document.getElementById(this.id).style.height = "100px";
    }
      this.newPlot();
    },
    /**
     * Creates a Dygraph object, with a graph (y-values) for each non-constant signal,
     * defined in plotData.
     */
    newPlot() {
      if (this.plotData.hidden == true) return;
      //console.group("Plot.vue::newPlot");
        var self = this;
        self.invalidated = false;
        if (self.graphPoints.length === 0)
            throw "Unable to create plot for " + plotData.newName + " (there are no graph points)."

        var seriesOptions = {};
        if(this.plotData.signals != undefined){
            this.plotData.signals.forEach(ES =>{
              if(ES.shortName === "_Result"){

                 seriesOptions[ES.shortName]={color:"gold"};
               }
            });
        }// signal operations
        if(this.plotData.events != undefined){
            this.plotData.events.forEach(ES =>{
              seriesOptions[ES.name] = {plotter:this.eventPlotter}
              if(ES.name === "_Result"){
                 seriesOptions[ES.name]={color:"gold",plotter:this.eventPlotter};
               }
            });
        }// event options.
        if(this.plotData.intervals != undefined){
               this.plotData.intervals.forEach(ES =>{
               seriesOptions[ES.name] = {plotter:this.intervalPlotter}
               if(ES.name === "_Result"){
                  seriesOptions[ES.name]={color:"gold",plotter:this.intervalPlotter};
                }
            });

        }// interval options

       var dygraphOptions = {
          //  title:this.plotData.exprStr,

          xlabel: "Time",
          stepPlot: true,
          labels: self.labels,
          fillGraph:false,
          legend: "always",
          stackedGraph: false,
          strokeWidth: 2,
          axisLabelFontSize:10,
          showRangeSelector: this.showRangeSelector,
          //valueFormatter: function(x) {return x.toFixed(2)},
          legendFormatter: function(data) {
            var keep = [];
            data.series.forEach(series =>{
              if(series.label[0]=="_")
              series.isVisible = false;
            });
           return Dygraph.Plugins.Legend.defaultFormatter.call(this, data);
         },
          labelsSeparateLines: true,
          drawPoints: true,
          underlayCallback: self.underlay,
          zoomCallback: self.zoomAllGraphs,
          highlightCallback: self.selectAllGraphs,
          unhighlightCallback: self.unselectAllGraphs,
          drawCallback: self.panAllGraphs,
         // showRangeSelector: true,
          series:seriesOptions,
          colors:
          ["black",
          'rgba(58, 120, 181, 0.7)',
           //'rgba(255, 147, 42, 0.7)',  //orange
            'rgba(117, 122, 116, 0.7)',
           //'rgba(255, 255, 102, 0.5)',
          'rgba(30, 90, 100, 0.7)']
        }
        // Overrride above options from the dygraph options,

        if(this.plotData.dygraph != undefined){
          Object.assign(dygraphOptions, this.plotData.dygraph);
        }
        this.graph = new Dygraph(self.id, self.graphPoints, dygraphOptions);


    //  console.groupEnd();
    },
    underlay: function(canvas, area, dygraph) {
      //console.log("Plot.vue::underlay");
      this.canvas = canvas;
      this.area = area;
      this.graph = dygraph;
      this.highlight();
      this.drawTestActTimestamps();
    },

    zoomAllGraphs: function(mindate, maxdate, yranges) {

      //console.log("Plot.vue:ZoomAllGraphs handler ", this.id, mindate,maxdate,yranges)
  //    if(isNaN(minDate)||isNaN(maxdate)) return;
      this.$emit('update:zoomLimits', [mindate, maxdate]);
    },
    selectAllGraphs: function(event, x, points, row, seriesName) {
      this.$emit('update:selection', row);
    },
    unselectAllGraphs: function(event) {
      this.$emit('update:selection', SELECTION_CLEARED);
    },
    panAllGraphs: function(dygraph, isInitial) {
      this.$emit('update:zoomLimits', dygraph.dateWindow_);
    },
    drawTestActTimestamps() {
      if(this.plotData.signals == undefined) return;
      var self = this;
      this.canvas.strokeStyle = 'black';
      this.canvas.font = "16px Georgia";
      this.canvas.fillStyle = "black";
      this.canvas.setLineDash([2, 2]);
      this.canvas.lineWidth = 1;
      var xRange = this.graph.xAxisRange();
      var domArea = this.graph.getArea();
      var top = domArea.y;
      var bottom = top + domArea.h;
      this.plotData.signals.forEach(signal => {
      if(signal.timestamps != undefined){
          for (var name in signal.timestamps) {
            let timestamp = signal.timestamps[name];
            let domTime = self.toDomXCoord(timestamp, domArea, xRange);
            self.drawVerticalLine(domTime, [bottom, top]);
            self.canvas.fillText(name, domTime + 2, bottom - 2);
          };
      } // not all signals have timestamps.
      });
      this.canvas.setLineDash([]);
    },

    intervalPlotter(e) {

        var area = e.plotArea;
        var ctx = e.drawingContext;
        if(e.setName === "_Result"){
         ctx = e.dygraph.hidden_ctx_;
        }
        var lineColor = e.color//'rgba('+ rgb + ',0.8)';
        var gridColor = 'rgba(0,0,0,0.1)'
        var resultColor = "rgba(255, 255, 102, 0.5)"; // Yellow
        var opt = this.plotData.options[e.setName];

        //console.log("Plot.vue::intervalPlotter   drawing intervals for ------------------------------- ",e.setName,e.color,opt);

        // Get the original intervals instead of dygraph own data format.
        var S = undefined;
        this.plotData.intervals.forEach(SE =>{
          if (SE.name == e.setName){
            S = SE.intervals;
          }
        })

        var lineY = e.points[0].canvasy;

        ctx.lineWidth = 0.2;            // Horiz support line.
        ctx.fillStyle = gridColor;
        ctx.setLineDash([5, 15]);
        ctx.beginPath();
          ctx.moveTo(area.x,  lineY);
          ctx.lineTo(area.x + area.w, lineY );
          ctx.fillStyle = "black"
        ctx.stroke();

        S.forEach(interval => {
          interval[0] = Math.max(interval[0],EvalContext.getInstance().getXmin());
          interval[1] = Math.min(interval[1],EvalContext.getInstance().getXmax());
          let left = e.dygraph.toDomCoords(interval[0], opt.y - 0.25);
          let right = e.dygraph.toDomCoords(interval[1],opt.y + 0.25);

          //right = right[0];

          switch (opt.type){
            case 'R':  //  'R' = result of sub expression = Yellow filled regions
              ctx.lineWidth = 0.2;
              ctx.fillStyle = resultColor;
              ctx.setLineDash([]);
              ctx.beginPath();
              ctx.fillRect(left[0],            area.y + 10,
                           right[0] - left[0], area.h - 20);
              ctx.stroke();
            break;
            case 'r':   // 'r' = Sub expression range ,

              ctx.lineWidth = 0.2;
              ctx.fillStyle = lineColor;
              ctx.beginPath();
              ctx.setLineDash([]);
              ctx.fillRect(left[0],            left[1],
                           right[0] - left[0], right[1] - left[1]);
              ctx.stroke();
            break;
            case 'w':       // 'w' = Sub expression within region ,
              ctx.lineWidth = 10;
              ctx.strokeStyle = "orange"
              ctx.fillStyle = "green";
              var center = left[1] - (left[1] - right[1])/2
              ctx.beginPath();
                ctx.setLineDash([]);
                ctx.setLineDash([1,2]);
                ctx.moveTo(left[0],center)
                ctx.lineTo(right[0], center);

              ctx.stroke();
            break;
            default:

          }
          //console.log("Plot.vue::intervalPlotter   drawing intervals for ------------------------------- ",interval,left,right);

        });


     },

     eventPlotter(e) {
      // Each event series requires to get some extra configuration
      // If you have events, you should have done this in TearsParser2
      // PLOT DATA STRUCTURE:
      // plotData = signals (normal signals with name,shortName,xAxis,values)
      //          = events (eventseriesname,events) MUST be matched by a markers entry below.
      //          = intervals (intervalsseriesname, intervals) MUST be matched by a markers entry below.
      //
      //          = options seriesname:{  markers:
      //                                         'N' = Neutral ,                   for graphical representation
      //                                         'S' = Sub expression result,
      //                                         'i'=  Sub expression Ignore ,    one for each series]
      //                                  type:  'S' sub expression               one for each serie (used for calculating layout)
      //                                         'R' result of sub expression     one for each serie (used hijacking the color. )

      //                                  y      : y value (signal measures, NOTE this needs to be balanced with other plots in the same sub-plot)
      //
      //          = options  intervalSeriesName: { type: 'r' = Sub expression range ,
      //                                                'w' = Sub expression within ,
      //                                                'R' = result of sub expression,
      //
      //
      //                                           y:   y value (signal measures, NOTE this needs to be balanced with other plots in the same sub-plot)
      //          = markers signalseriesname  type:  'R' = result of sub expression
      //                                      extra: extra parameters that will be included in the series options to dygraph.  // TODO decide if this should be here or not.
      //          = dygraph                   parameters that will be included in the global options to dygraph(overrides defaults).
      // EXAMPLES (See TearsParser.js 2 and below)
      // var options ={};
      //     var E = "E:(" + events.sourceString + ")";
      //     options[E]           = {type:'r',y:min + step*2 ,markers:'N'};
      //     options["_Skipped E:"]= {type:'r',y:min + step*2 ,markers:'i'};
      //     var I = "I:(" + intervals.sourceString + ")";
      //     options[I]           = {type:'r',y:min + step };
      //     options["_Result"]    = {type:'R',y:min, markers:"S"};
      //
      // var plots =[{exprStr: "Signal = Count(Events, Intervals): Count(" +
      //                 events.sourceString + ", " + intervals.sourceString + ")",
      //               events:[
      //                 {name:E,events:P1},
      //                 {name:"_Skipped E:",events:Pskipped},
      //               ],
      //               intervals:[
      //                 {name:I,intervals:S1}
      //               ],
      //               signals:[
      //                 {name:"_Result", shortName:"_Result",
      //                  xAxis:xAxis,values:values
      //                 }
      //               ],
      //               options:options,
      //             //  dygraph:{valueRange:[0,4]}
      //              }];

     var area = e.plotArea;
     var ctx = e.drawingContext;
     if(e.setName === "Result"){

      ctx = e.dygraph.hidden_ctx_;
     }
     var lineColor = e.color//'rgba('+ rgb + ',0.8)';
     var gridColor = 'rgba(0,0,0,0.1)'
     var resultColor = "gold";//"rgba(255, 255, 102, 0.5)";

     var opt = this.plotData.options[e.setName];

     var lineY = e.points[0].canvasy;
     ctx.lineWidth = 1;                        // Horiz supportline
     ctx.strokeStyle = lineColor;
     ctx.fillStyle = gridColor;
     ctx.setLineDash([5, 5]);
     ctx.beginPath();
       ctx.moveTo(area.x,  lineY);
       ctx.lineTo(area.x + area.w, lineY );
       ctx.fillStyle = "black"
     ctx.stroke();


     // Get the original events to plot instead.
     var P = undefined;
     this.plotData.events.forEach(PE =>{
       if (PE.name == e.setName){
        P = PE.events;
       }
     });

    let radius = 10;// e.dygraph.toDomCoords(0, 0.25)[1] -  e.dygraph.toDomCoords(0, 0)[1];
     // FOR EACH EVENT
     let hasMarkers = (opt.markers.length < P.length);
      for(var i = 0;i < P.length; i++){
        var p = P[i];
        var marker = undefined;

        if (hasMarkers){
          marker = opt.markers;
        }else{
          marker = opt.markers[i];
        }
        let center = e.dygraph.toDomCoords(p, opt.y);

        ctx.lineWidth = 0.6;
        ctx.fillStyle = lineColor;
        ctx.strokeStyle = lineColor;
        ctx.setLineDash([5, 15]);
        ctx.beginPath();
            ctx.moveTo(center[0],area.y);           // Vertical support line
            ctx.lineTo(center[0], area.y + area.h );
        ctx.stroke();

        ctx.lineWidth = 0.6;
        ctx.setLineDash([]);
        switch (marker){
              case 'N':  // Just an event.
                  ctx.fillStyle = lineColor;
                  ctx.beginPath();
                  //  ctx.arc(center[0], center[1], radius, 0, 2 * Math.PI);
                  ctx.fillRect(center[0]-radius/4, center[1]-radius, radius/2,radius*2);
                  ctx.stroke();
                  ctx.lineWidth = 0.6;
                  ctx.moveTo(center[0],area.y);           // Vertical result line
                  ctx.lineTo(center[0], area.y + area.h );
                  ctx.stroke();
                  break;
              case 'S': //Sub expression result
                    ctx.lineWidth = 2;
                    ctx.fillStyle = resultColor;
                    ctx.beginPath();
                        ctx.moveTo(center[0],area.y );           // Vertical result line
                        ctx.lineTo(center[0], area.y + area.h );
                    ctx.stroke();

                    ctx.lineWidth = 0.6;
                    ctx.setLineDash([]);

                    ctx.beginPath();
                      ctx.fillRect(center[0]-radius/4, center[1]-radius, radius/2,radius*2);
                    ctx.stroke();
                    break;
              case 'i': // i ignored events
              var cross = [[-2,-3],[-3,-2],[-1,0],[-3,2],[-2,3],[0,1],[2,3],[3,2],[1,0],[3,-2],[2,-3],[0,-1]];
              ctx.strokeStyle="black"
              ctx.lineWidth = 0.6;
              ctx.moveTo(center[0],area.y);           // Vertical result line
              ctx.lineTo(center[0], area.y + area.h );
              ctx.stroke();

              ctx.lineWidth = 1;
              ctx.fillStyle = "rgba(255,165,0,0.4)";
              ctx.strokeStyle="black";
              var a = radius/3;
              var x = center[0];
              var y = center[1]
              ctx.beginPath();
                ctx.moveTo(center[0], center[1]-1*a);     //X
                cross.forEach(p => {
                  ctx.lineTo(x + p[0]*a, y + p[1]*a);
                });
              ctx.stroke();
              ctx.fill();


                    break;
              case 'p': // passed sequence event
                    ctx.fillStyle = lineColor;
                    ctx.strokeStyle = "black"
                  /*  ctx.beginPath();

                      ctx.fillRect(center[0]-radius/4, center[1]-radius, radius/2,radius*2);
                    ctx.stroke();*/
                    ctx.fillStyle = "orange";
                    ctx.lineWidth = 0.6;
                    ctx.moveTo(center[0],area.y);           // Vertical result line
                    ctx.lineTo(center[0], area.y + area.h );
                    ctx.stroke();

                    ctx.lineWidth = 2;
                    ctx.strokeStyle="black"
                    ctx.fillStyle = "green";
                    var x = center[0];
                    var y = center[1];
                    var a = radius
                    ctx.beginPath();
                      ctx.moveTo(x,y);     // ->
                      ctx.lineTo(x-a, y+a );
                      ctx.lineTo(x-a, y);
                      ctx.lineTo(x-a*2, y);
                      ctx.lineTo(x-a, y);
                      ctx.lineTo(x-a, y-a);
                      ctx.closePath();
                    ctx.stroke();
                    ctx.fill();

                    break;
            case 'f': // sequence elements not seen in any within periods.
                  var cross = [[-2,-3],[-3,-2],[-1,0],[-3,2],[-2,3],[0,1],[2,3],[3,2],[1,0],[3,-2],[2,-3],[0,-1]];
                  ctx.strokeStyle="black"
                  ctx.lineWidth = 0.6;
                  ctx.moveTo(center[0],area.y);           // Vertical result line
                  ctx.lineTo(center[0], area.y + area.h );
                  ctx.stroke();

                  ctx.lineWidth = 1;
                  ctx.fillStyle = "rgba(255,0,0,0.4)";
                  ctx.strokeStyle="black";
                  var a = radius/3;
                  var x = center[0];
                  var y = center[1]
                  ctx.beginPath();
                    ctx.moveTo(center[0], center[1]-1*a);     //X
                    cross.forEach(p => {
                      ctx.lineTo(x + p[0]*a, y + p[1]*a);
                    });
                  ctx.stroke();
                  ctx.fill();


                  break;

              default:
              ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.setLineDash([2, 5]);
                ctx.arc(center[0], center[1], 10, 0, 2 * Math.PI);

              ctx.stroke();

          }//switch
          ctx.fillStyle = 'rgba(100,0,0,0.5)';

        }//for
    },
    plotEventGA(){

      if(this.commonData.valid == undefined) return;
      if(this.commonData.valid.length <= 0) return;
      if(this.commonData.valid[0].length != undefined)return ;

      var area = this.area;
      var ctx = this.canvas;
      var guards = this.commonData.valid;
      var fails  = this.commonData.fail.slice(0);
      var passes = this.commonData.pass.slice(0);

      // There is exactly one fails or pass for each guard event.
      guards.forEach(g =>{
         let x = this.graph.toDomCoords(g, 0)[0];
         this.eventGuardAndAssertionPlotter(x,'G');
         var res = undefined;
         var f = typeof fails[0]  === 'undefined' ? Number.MAX_VALUE : fails[0];
         var p = typeof passes[0] === 'undefined' ? Number.MAX_VALUE : passes[0];
         if(f  < p){ // Pick nearest.
           res = this.graph.toDomCoords(fails.shift(), 0)[0];
           this.eventGuardAndAssertionPlotter(res,'F');
         }
         else{
           res = this.graph.toDomCoords(passes.shift(), 0)[0];
           this.eventGuardAndAssertionPlotter(res,'P');
         }
         //Lastly, mark out the within region.
          this.canvas.fillStyle = "rgba(100,100,100,0.4)";
          this.canvas.fillRect(x, this.area.y + 20, res - x, this.area.h);

      });
    },
    eventGuardAndAssertionPlotter(x,Gtype) {
      // We do not want to have the Guards and Assertion events in the legend.
      // Thus, we draw them outside the ordinary event plotter.
    var area = this.graph.getArea();
    var ctx = this.canvas;

       switch (Gtype){
             case 'G':  // Guard event
                  ctx.strokeStyle = 'rgba(100,100,100,0.4)';
                   ctx.lineWidth = 2;
                   ctx.beginPath();
                     ctx.moveTo(x,area.y);           // Vertical result line
                     ctx.lineTo(x, area.y + area.h );
                   ctx.stroke();
                   ctx.lineWidth = 5;
                   ctx.beginPath();
                     ctx.arc(x,
                     area.y + 10,
                     5,
                     0.5 * Math.PI, 1.5 * Math.PI , false);
                   ctx.stroke();
                   break;
             case 'P':  // Passed event
             case 'F':  // Passed event
                   ctx.save();
                   if(Gtype == 'P') ctx.strokeStyle = "rgba(0,100,0,0.8)"
                   else ctx.strokeStyle = "rgba(100,0,0,0.8)";
                   ctx.lineWidth = 2;
                   ctx.beginPath();
                     ctx.moveTo(x,area.y);           // Vertical result line
                     ctx.lineTo(x, area.y + area.h );
                   ctx.stroke();
                   ctx.lineWidth = 5;
                   ctx.beginPath();
                     ctx.arc(x,
                     area.y + 10,
                     5,
                     0.5 * Math.PI, 1.5 * Math.PI, true)
                   ctx.stroke();
                   ctx.restore();
                   break;

         }//switch

   },//G/A plotter.
    highlight() {
      //console.log("Plot.vue::highlight THIS COMMON DATA IS CURRENTLY ", JSON.stringify(this.commonData));
      //console.log("Plot.vue::highlight THIS  plotData IS CURRENTLY ",JSON.stringify(this.plotData));

      if(this.plotData.valid != undefined)
      this.highlightIntervals(this.plotData.valid, "rgba(255, 255, 102, 1)");

      this.highlightGuards();
      this.highLightPASS();
      this.highLightFAIL();
      this.plotEventGA();
      this.highlightIgnoreLogPart();
    },
  /*  highlightTimes(times, style) {
      if (times.length > 0) {
        if (Util.areIntervals(times)) {
          this.highlightIntervals(times, FILLSTYLES[style])
        }
        else {
          this.highlightEvents(times, DASHSTYLES[style]);
        }
      }
    },*/

    highlightIgnoreLogPart() {
      var xRange = this.graph.xAxisRange();
      var domArea = this.graph.getArea();
      // TODO:
      // If there is a ignoreleft, create an interval 
      // from 0 to ignoreleft and do a gray rectancle (as in invalid)
      // It would be elegant to have red hatches also. 
      console.log("Plot.vue::highlightIgnoreLogPart xRange is ", JSON.stringify(xRange));
     
      if (this.commonData.hasOwnProperty("leftIgnore")){   
          let [left, right] = this.toDomXCoords([xRange[0],this.commonData.leftIgnore], domArea, xRange);
          this.canvas.fillStyle = "rgb(1,1,2,1)";
          this.canvas.fillRect(left, this.area.y, right - left, this.area.h);
      }
      if (this.commonData.hasOwnProperty("rightIgnore")){   
          let [left, right] = this.toDomXCoords([this.commonData.rightIgnore,xRange[1]], domArea, xRange);
          this.canvas.fillStyle = "rgb(1,1,2,1)";
           this.canvas.fillRect(left, this.area.y, right - left, this.area.h);
      }
    },
    highlightIntervals(intervals, fillStyle) {
      var xRange = this.graph.xAxisRange();
      var domArea = this.graph.getArea();
      for (let interval of intervals) {
        let [left, right] = this.toDomXCoords(interval, domArea, xRange);
        this.canvas.fillStyle = fillStyle;
        this.canvas.fillRect(left, this.area.y+40, right - left, this.area.h);
      }
    },
    highlightGuards() {
      if(this.commonData.valid == undefined) return;
      if(this.commonData.valid.length <= 0) return;
      if(this.commonData.valid[0].length != undefined){   // Interval Guard

          var xRange = this.graph.xAxisRange();
          var domArea = this.graph.getArea();
          this.commonData.valid.forEach(interval => {
            interval[0] = Math.max(interval[0],EvalContext.getInstance().getXmin());
            interval[1] = Math.min(interval[1],EvalContext.getInstance().getXmax());
            let [left, right] = this.toDomXCoords(interval, domArea, xRange);
            this.canvas.fillStyle = "rgba(100,100,100,0.1)";
            this.canvas.fillRect(left, this.area.y, right - left, this.area.h);
          });
      }else{
        // Event Guards are drawn together with pass/fail.
      }

    },
    highLightPASS() {
      if(this.commonData.pass != undefined &&
          this.commonData.pass.length > 0){
        if(this.commonData.pass[0].length != undefined){ // PASS intervals
          var xRange = this.graph.xAxisRange();
          var domArea = this.graph.getArea();
          this.commonData.pass.forEach(interval => {
            interval[0] = Math.max(interval[0],EvalContext.getInstance().getXmin());
            interval[1] = Math.min(interval[1],EvalContext.getInstance().getXmax());
            //console.log("Plot.vue::highLightPASS interval, xRange,domArea ",interval, xRange,domArea)
            let [left, right] = this.toDomXCoords(interval, domArea, xRange);
            this.canvas.fillStyle = "rgba(0,100,0,0.2)";
            this.canvas.fillRect(left, this.area.y + 20, right - left, this.area.h);
          });
      }//pass intervals
      else{
        // PASS events are drawn together with their guard.
      }
    }// There are passes.

    },
    highLightFAIL() {
      if(this.commonData.fail != undefined &&
          this.commonData.fail.length > 0){
        if(this.commonData.fail[0].length != undefined){ // FAIL intervals
          var xRange = this.graph.xAxisRange();
          var domArea = this.graph.getArea();
          this.commonData.fail.forEach(interval => {

            interval[0] = Math.max(interval[0],EvalContext.getInstance().getXmin());
            interval[1] = Math.min(interval[1],EvalContext.getInstance().getXmax());
            //console.log("Plot.vue::highLightFAIL interval, xRange,domArea ",interval, xRange,domArea)
            let [left, right] = this.toDomXCoords(interval, domArea, xRange);
            this.canvas.fillStyle = "rgba(100,0,0,0.1)";
            this.canvas.fillRect(left, this.area.y + 20, right - left, this.area.h);
            // Add hatches here if really needed... (You need to do the lines one by one.)
          });
      }//pass intervals
      else{
        // PASS events are drawn together with their guard.
      }
    }// There are passes.

  },
    drawVerticalLine(x, yRange) {
      this.canvas.beginPath();
      this.canvas.moveTo(x, yRange[0]);
      this.canvas.lineTo(x, yRange[1]);
      this.canvas.stroke();
      this.canvas.closePath();
    },
    drawHorizontalLine(xRange, y) {
      this.canvas.beginPath();
      this.canvas.moveTo(xRange[0], y);
      this.canvas.lineTo(xRange[1], y);
      this.canvas.stroke();
      this.canvas.closePath();
    },
    clearHighlighting() {
      this.canvas.clearRect(this.area.x, this.area.y, this.area.w, this.area.h);
    },
    toDomXCoord(x, domArea, xRange) {
      return domArea.x + domArea.w * (x - xRange[0]) / (xRange[1] - xRange[0]);
    },
    toDomYCoord(y, domArea, yRange) {
      return domArea.y + domArea.h * (yRange[1] - y) / (yRange[1] - yRange[0]);
    },
    toDomXCoords(interval, domArea, xRange) {
      var domInterval = [];
      for (let i=0; i<interval.length; i++) {
        domInterval.push(this.toDomXCoord(interval[i], domArea, xRange));
      }
      return domInterval;
    },
    /**
     * Makes sure that all plots share a common x-axis.
     *
     * For each value on the common timeline that is not a part of the
     * original signal data, a point is added to the graph, using the
     * closest previous signal value. In such a way, signals change their
     * values as in the original recording, and keep their values in between.
     */
    updateGraphPoints() {
      if(this.plotData.hidden) return;
        var self = this;
        var graphPoints = [];
        var interpolatedSignals = [];
        var timeline = this.timeline;
        var labels = ["Time"];

        //console.log("Plot.vue::updateGraphPoints", JSON.stringify(self.plotData));


        if(self.plotData.signals != undefined){
           self.plotData.signals.forEach(signal => {
               labels.push(signal.shortName);
               // Project signal on timeline
               if (document.nu )debugger;
              interpolatedSignals.push(EvalContext.getInstance().projectSignalOnTimeline(signal, timeline));
              //console.log("Interpolated signals = ", interpolatedSignals );
            });
         }
        // Events are also Signals since we want to have level and interactive points.
        // But we ignore do not
        if (self.plotData.events != undefined){
          self.plotData.events.forEach(events => {
              var opt = self.plotData.options[events.name]
              if (opt == undefined)debugger;
              // Create pseudo signal
              var values = [];
              timeline.forEach(p => values.push(opt.y));
              labels.push(events.name);
              interpolatedSignals.push(values);
           })
        }//events

       if (self.plotData.intervals != undefined){
         self.plotData.intervals.forEach(intervals => {
             var opt = self.plotData.options[intervals.name]
             labels.push(intervals.name);
             // Create pseudo signal
             var values = [];
             timeline.forEach(p => values.push(opt.y));
             interpolatedSignals.push(values);
         })
       }//intervals
        var xMax = EvalContext.getInstance().getXmax();
        var xMin =  EvalContext.getInstance().getXmin();
        var timelineLength = timeline.length;
        for (let j=0; j<timelineLength; j++) {
          if(document.die != undefined) debugger;
        //  if(timeline[j] > -10 && timeline[j]< 100000){          // TODO: better limit for this. Now we condense all points < 0 to zero.  How about +inf?
            let gpRow = [Math.min(Math.max(xMin,timeline[j]),xMax)];    //Contain x vals within current timelie...
            for (let i=0; i<interpolatedSignals.length; i++) {
              if(typeof interpolatedSignals[i] === 'undefined') debugger;
                gpRow.push(interpolatedSignals[i][j]);
            }
            graphPoints.push(gpRow);
          //}else{
          //      console.log("Plot.vue::updateGraphPoints skipping :",JSON.stringify(timeline[j]));
          //}
        }
        self.labels = labels;
        self.graphPoints = graphPoints;

      //  console.log("Plot.vue::updateGraphPoints RESULT:",JSON.stringify(labels));
      //  graphPoints.forEach(row =>  console.log("Plot.vue::updateGraphPoints RESULT:",JSON.stringify(row)))

    }
    },
    watch: {
      zoomLimits(newVal, oldVal) {
          if (this.plotData.hidden == true || this.graph == undefined || this.graph.updateOptions == undefined) return;
         //console.log("Plot.vue::watch zoomLimits ", this.id, "newVal=",newVal, "oldVal=",oldVal)
         if(typeof(newVal) !== 'undefined' && newVal != null)
         this.graph.updateOptions({
             dateWindow: newVal
         })
         else
         this.graph.updateOptions({
             dateWindow: oldVal
         })

         /* this.graph.updateOptions({
             dateWindow: newVal
         })*/

      },
      selection(newVal, oldVal) {
          if (this.plotData.hidden == true) return;
          this.graph.setSelection(newVal);
      },
      timeline(newVal, oldVal) {
  //        this.updateGraphPoints();
      },

      plotData(newVal, oldVal) {
        if(this.plotData.hidden)return; // no point in rendering invisible graphs.
        // Temporary fix,
        this.recentlyUpdated = true;
        this.updateGraphPoints();
        this.newPlot();
         return;
      /*  // TODO: Below code prevents redraw of edited signals.
        //  console.log("Plot.vue::plotData WATCH");



          for (let i=0; i<newVal.signals.length; i++) {
              if (oldVal.signals[i] === undefined || newVal.signals[i].shortName !== oldVal.signals[i].shortName) {
                  this.updateGraphPoints();
                  this.newPlot();
                  return;
              }
          }
          for (let i=newVal.signals.length-1; i>=0; i--) {
              if (!isEqualData(newVal.signals[i].values, oldVal.signals[i].values)) {
                  this.updateGraphPoints();
                  this.repaint();
                  this.recentlyUpdated = true;
                  return;
              }
          }*/
    },
    commonData(newVal, oldVal) {
      this.recentlyUpdated = true;
       this.updateGraphPoints();
       this.repaint();
      /* TODO fix delta check below if too slow
      //  console.log("Plot.vue::commondata WATCH");
        if (this.recentlyUpdated === true) {
            this.recentlyUpdated = false;
            return;
        }

        if (this.plotData.type === Util.PLOT_TYPE.ASSERTION &&
            (!isEqualData(newVal.pass, oldVal.pass) ||
             !isEqualData(newVal.fail, oldVal.fail))) {
            this.repaint();
        }
        else if (this.plotData.type === Util.PLOT_TYPE.GUARD &&
                 !isEqualData(newVal.valid, oldVal.valid)) {
            this.repaint();
        }*/
    }
  },

  mounted() {
   //console.log("Plot.vue::mounted:(plotData= ", this.plotData.hidden)
    //    console.time("Plot-mount")
        if(this.plotData.signals &&
          this.plotData.signals[0] &&
          this.plotData.signals[0].latency != undefined){
          this.newLatency = this.plotData.signals[0].latency
        }
        this.updateGraphPoints();
        this.newPlot();
        this.hideShowGraph();

    //  console.timeEnd("Plot-mount")

    /*
	     bus.$on('window-resize', function() {
	    console.log("window-resize in Plot");
     document.getElementById(this.id).style.width = document.getElementById("plotarea").offsetWidth + "px";
   });*/

 },
 created() {
      var self = this;
      bus.$on('invalidate-plots',self.on_bus_invalidatePlots);
    }
}

function isConstant(signal) {
  return signal !== undefined && Util.isNumeric(signal.shortName);
}

function isVariable(signal) {
  return signal !== undefined && !isConstant(signal);
}

function isEqualData(newData, oldData) {
  if (!Array.isArray(newData))
    newData = [newData];
  if (!Array.isArray(oldData))
    oldData = [oldData];

  if (newData.length !== oldData.length)
    return false;
  for (let i=0; i<newData.length; i++) {
    if (newData[i] !== oldData[i]) {
      return false;
    }
  }
  return true;
}
</script>

<style></style>
