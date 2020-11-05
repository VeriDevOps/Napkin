<template>
    <div>
        {{ plotData.name }}<br>
        <div v-bind:id="id" style="display: block; ; height: 200px;"></div>
    </div>
</template>

<script>
import bus from './EventBus.vue';
import Dygraph from 'dygraphs';
import * as Util from './Util.js';
import * as EvalContext from './EvalContext.js';

const SELECTION_CLEARED = -1;
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

export default {
  name: "plot",
	props: {
    plotData: {},
    commonData: {},
		numericId: 0,
    zoomLimits: { type: Array },
    selection: { type: Number },
    timeline: { type: Array }
	},
	computed: {
		id: function() {
      return "plot_" + this.numericId;
		}
	},
	data() {
		return {
      graphPoints: [],
      graph: {},
      canvas: {},
      area: {},
      recentlyUpdated: false
    };
	},
	methods: {
    /**
     * If the graph has been initialized, this function repaints.
     *
     * This is done by updating data, which in turn triggers relevant callback
     * (e.g. underlayCallback and drawCallback).
     */
    repaint() {
      console.time("repaint");
      this.clearHighlighting();
      if (Object.keys(this.graph).length > 0) {
        this.graph.updateOptions({
          'file': this.graphPoints
        });
      }
      console.timeEnd("repaint");
    },
    /**
     * Creates a Dygraph object, with a graph (y-values) for each non-constant signal,
     * defined in plotData.
     */
    newPlot() {
        var self = this;
        if (self.graphPoints.length === 0)
            throw "Unable to create plot for " + plotData.name + " (there are no graph points)."

        var labelArray = ["Time"];
        self.plotData.signals.forEach(signal => {
            if (isVariable(signal)) {
                labelArray.push(signal.shortName);
            }
        });

        new Dygraph(self.id, self.graphPoints, {
    	    xlabel: "Time",
    	    stepPlot: true,
            labels: labelArray,
    	    legend: "always",
    	    stackedGraph: false,
    	    strokeWidth: 1,
	    //valueFormatter: function(x) {return x.toFixed(2)},
            labelsSeparateLines: true,
    	    drawPoints: true,
            underlayCallback: self.underlay,
            zoomCallback: self.zoomAllGraphs,
            highlightCallback: self.selectAllGraphs,
            unhighlightCallback: self.unselectAllGraphs,
            drawCallback: self.panAllGraphs
        });



	bus.$on('window-resize', function() {
	    //console.log("window-resize in Plot");
      //document.getElementById(this.id).style.width = document.getElementById("plotarea").offsetWidth + "px";
        });
    },
    underlay: function(canvas, area, dygraph) {
      this.canvas = canvas;
      this.area = area;
      this.graph = dygraph;
      this.highlight();
      this.drawTestActTimestamps();
      this.drawConstants();
    },
    zoomAllGraphs: function(mindate, maxdate, yranges) {
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
      var self = this;
      this.canvas.strokeStyle = 'black';
      this.canvas.font = "16px Georgia";
      this.canvas.fillStyle = "black";
      this.canvas.setLineDash([2, 2]);

      var xRange = this.graph.xAxisRange();
      var domArea = this.graph.getArea();
      var top = domArea.y;
      var bottom = top + domArea.h;
      this.plotData.signals.forEach(signal => {
          for (var name in signal.timestamps) {
            let timestamp = signal.timestamps[name];
            let domTime = self.toDomXCoord(timestamp, domArea, xRange);
            self.drawVerticalLine(domTime, [bottom, top]);
            self.canvas.fillText(name, domTime + 2, bottom - 2);
          };
      });
      this.canvas.setLineDash([]);
    },
    drawConstants() {
      var self = this;
      this.canvas.strokeStyle = 'darkblue';
      this.canvas.lineWidth = 3;
      this.plotData.signals.forEach(signal => {
        if (isConstant(signal)) {
          var domArea = self.graph.getArea();
          var domXRange = [domArea.x, domArea.x + domArea.w];
          var yRange = self.graph.yAxisRange();
          // var domY = self.toDomYCoord(signal.values, domArea, yRange);
          var domY = self.toDomYCoord(Number.parseFloat(signal.shortName), domArea, yRange);
          self.drawHorizontalLine(domXRange, domY);
        }
      });
    },
    highlight() {
      if (this.plotData.type === Util.PLOT_TYPE.GUARD) {
        this.highlightTimes(this.plotData.valid, STYLES.VALID);
        if (Util.areEvents(this.commonData.valid)) {
          this.highlightTimes(this.commonData.valid, STYLES.VALID);
        }
      }
      else if (this.plotData.type === Util.PLOT_TYPE.ASSERTION) {
        this.highlightTimes(this.commonData.pass, STYLES.PASS);
        this.highlightTimes(this.commonData.fail, STYLES.FAIL);
      }
    },
    highlightTimes(times, style) {
      if (times.length > 0) {
        if (Util.areIntervals(times)) {
          this.highlightIntervals(times, FILLSTYLES[style])
        }
        else {
          this.highlightEvents(times, DASHSTYLES[style]);
        }
      }
    },
    highlightIntervals(intervals, fillStyle) {
      var xRange = this.graph.xAxisRange();
      var domArea = this.graph.getArea();
      for (let interval of intervals) {
        let [left, right] = this.toDomXCoords(interval, domArea, xRange);
        this.canvas.fillStyle = fillStyle;
        this.canvas.fillRect(left, this.area.y, right - left, this.area.h);
      }
    },
    highlightEvents(timestamps, style) {
      this.canvas.strokeStyle = style;
      this.canvas.lineWidth = 3;
      this.canvas.setLineDash([5, 3]);

      var xRange = this.graph.xAxisRange();
      var domArea = this.graph.getArea();
      var top = domArea.y;
      var bottom = top + domArea.h;
      for (let timestamp of timestamps) {
        let domTime = this.toDomXCoord(timestamp, domArea, xRange);
        this.drawVerticalLine(domTime, [bottom, top]);
      }

      this.canvas.setLineDash([ ]);
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
        var self = this;
        var graphPoints = [];
        var interpolatedSignals = [];

        // Array copying is made for efficiency reasons (factor: >1000)
        var timeline = this.timeline;
        this.plotData.signals.forEach(signal => {
            timeline = EvalContext.joinTimelines(timeline, signal.xAxis);
        });
        var timelineLength = timeline.length;

        this.plotData.signals.forEach(signal => {
            if (isVariable(signal)) {
                interpolatedSignals.push(EvalContext.getInstance().interpolateDataToTimeline(signal, timeline));
            }
        });

        for (let j=0; j<timelineLength; j++) {
            let gpRow = [timeline[j]];
            for (let i=0; i<interpolatedSignals.length; i++) {
                gpRow.push(interpolatedSignals[i][j]);
            }
            graphPoints.push(gpRow);
        }
        this.graphPoints = graphPoints;
    }
    },
    watch: {
      zoomLimits(newVal, oldVal) {
          this.graph.updateOptions({
              dateWindow: newVal
          });
      },
      selection(newVal, oldVal) {
          this.graph.setSelection(newVal);
      },
      timeline(newVal, oldVal) {
          this.updateGraphPoints();
      },
      plotData(newVal, oldVal) {
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
          }
    },
    commonData(newVal, oldVal) {
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
        }
    }
  },
  mounted() {
      console.log("Mounting " + this.plotData.name)
      console.time("Plot-mount")
      this.updateGraphPoints();
      this.newPlot();
      console.timeEnd("Plot-mount")
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
