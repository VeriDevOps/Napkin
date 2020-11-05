var Vue = require('vue')
var Util = require('./Util.js');

fs = require('fs');

var time;

const bus = new Vue({
	name: "bus",
	data() {
		return {
			socket: {},
			nameSignalMap: {},
			longNameSignalMap:{}, // TODO remove
			signals:{},
			xmin: -1,
			xmax: -1
		}
	},
	//TODO: Refactor - the utility methods should probably by in some other module
	/**************************************************************************/
	/* Common utility methods 												  */
	/**************************************************************************/
	methods: {
		/**
		* Get all short signal names ("pretty_print") and extract the actual signal name
		* (it is typically either the last substring in /x/y/z/signal (or x.y.z.signal)
		* or the one containing a bracket part, e.g. signal[0|1].
		*
		* @param signal The signal structure (as in a .jsondiff-file)
		* @return The short name of this signal.
		*/
		getShortName(signal) {
			return Util.getShortName(signal.name);
      //
			// var signalPathParts = signal.name.split(/\/|\./);
      //
			// for (var i=0; i < signalPathParts.length; i++) {
			// 	if (signalPathParts[i].indexOf("[") !== -1) {
			// 		return signalPathParts[i].substring(0, signalPathParts[i].indexOf("["));
			// 	}
			// }
      //
			// return signalPathParts.slice(-1)[0];
		},
		getSignal(shortName) {
			if(shortName=="inf"){
				console.log("USING INF!!!!!")
				// TODO:  inf or logstart, logend should be an event "signal" that only contains that point in time
				//        However, I do not know how this eventually ends up in e.g in between.
				return null;//{xAxis:[this.xmax]};
			}
			//console.log("getSignal for " + shortName);
			//console.log("MAP:", JSON.stringify(this.nameSignalMap[shortName]))
			//console.log("WIDE:", JSON.stringify(this.getSignalDataWideSearch(shortName)));
			return this.getSignalDataWideSearch(shortName);//this.nameSignalMap[shortName];
			//return (sig == null)?undefined:sig;
		},
		hasSignal(shortName) {
			return this.getSignalDataWideSearch(shortName) != null;
			//return (shortName in this.nameSignalMap);
		},
		getSignalDataWideSearch(signalName){
		//console.log("eventbus signals " + JSON.stringify(this.signals));
			//console.log("EventBus::getSignalDataWideSearch Searching for",signalName, " in nr of signals:", this.signals.length)
			for (let i = 0; i < this.signals.length; i++)
			{
			  var cs = this.signals[i];
				//console.log("    ",cs.shortName)
				//console.log("    ",cs.name)
				//console.log("    ",cs.data.newName)
				if (signalName === cs.shortName ||
				    signalName === cs.name ||
					  signalName === cs.data.newName) {
					return this.signals[i];
				}
			}
			return null;
		},
		getSignalDataLong(signalName) {
			console.log("longNameSignalMap",Object.keys(this.longNameSignalMap))
			if(signalName in this.longNameSignalMap){
				//console.log("EventBus::getSignalDataLong Complete Entry " + JSON.stringify(this.longNameSignalMap[signalName]));
				return this.longNameSignalMap[signalName].data ;
			}
			else{
				return null;
			}

		},
		// TODO: this is unclear what this function does. Remove?
		// (it returns the short names of all signals)
		getAllSignalNames() {
			return Object.keys(this.nameSignalMap);
		},
		getAllSignalLongNames() {
			return Object.keys(this.longNameSignalMap);
		},
		getXmin() {
			 return this.xmin;
		},
		getXmax() {
			 return this.xmax;
		},
		// TODO: what is this and why? Remove?
		addSignalForTesting(shortName) {
			this.nameSignalMap[shortName] = {};
		},

		updateXmax() {
			this.xmax = -100;
			for (let i=0; i<this.signals.length; i++) {
				let xAxis = this.signals[i].data.xAxis;
				let xmaxInSignal;
				if (Array.isArray(xAxis)) {
					xmaxInSignal = xAxis.slice(-1)[0];
				}
				else {
					xmaxInSignal = xAxis;
				}

				if (xmaxInSignal > this.xmax) {
					this.xmax = xmaxInSignal;
				}
			}
			},

 loadSignals(jsondiff) {
			this.signals = [];
			this.dirty = false;
			var timestamps = {};

			var keysSorted = Object.keys(jsondiff).sort(function(a, b) {
				if (jsondiff[a].hasOwnProperty("pretty_print") &&
						jsondiff[b].hasOwnProperty("pretty_print")) {
					return jsondiff[a].pretty_print.localeCompare(jsondiff[b].pretty_print);
				}
				else {
					return a.localeCompare(b);
				}
			});

			if(jsondiff.hasOwnProperty("TimeStamps"))
			{
				timestamps = jsondiff["TimeStamps"];
			}
 			for (var i = 0; i < keysSorted.length; i++)
			{
 				var signal = keysSorted[i];
				if(signal !== "TimeStamps")
				{
					var signalName =  jsondiff[signal].pretty_print;

					this.signals.push({name:     signalName,
														 shortName:this.getShortName({name:signalName}),
						                 selected: false,
														 filter:   true,
														 dirty:    false,
														 data:     jsondiff[signal],   // [newName,values,pretty_print,xAxis]
														 timestamps: timestamps});
				}
			}
			this.updateXmax();
			},

	    loadFile(file) {
		    var self = this;


		    var sig = fs.readFileSync(file);
		    //console.log("jsondiff " + sig);
		    var sig2 = JSON.parse(sig);
		    //console.log("jsondiff " + JSON.stringify(sig2));
		    self.loadSignals(sig2);
	    },

	},

	created() {
		var self = this;

			self.$on('signal-list-updated', function(nameSignalMap,longNameSignalMap,signals) {
				// console.log("BUS INTERCEPTED SIGNAL LIST UPDATE")
				// TODO: Move building the maps from SignalList.vue to here.
				self.nameSignalMap = nameSignalMap;
				self.longNameSignalMap = longNameSignalMap; //TODO remove
				self.signals = signals;
				self.xmin = Number.MAX_VALUE;
				self.xmax = Number.MIN_VALUE;
				for (var k in nameSignalMap)
				{
					let xAxis = nameSignalMap[k].data.xAxis;
					if (!Array.isArray(xAxis)) {
						xAxis = [xAxis];
					}
					let xmin = xAxis[0];
					if (xmin < self.xmin) {
						self.xmin = xmin;
					}
					let xmax = xAxis.slice(-1)[0];
					if (xmax > self.xmax) {
						self.xmax = xmax;
					}
				}
		});

		self.$on('xmax', function(xmax) {
			self.xmax = xmax;
		});
	}
});
module.exports = {
   getSignal(x) {
   var sig = bus.getSignal(x);
   //console.log("getSignal " + x + " " + sig);
   return sig;
   },

   getXmax() {
   return bus.xmax;
   },

   loadFile(file) {
   return bus.loadFile(file);
   }

}

