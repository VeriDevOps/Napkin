
const FileFormats = require('./FileFormats.js')
//import * as FileFormats from './FileFormats.js';
/******************************************************************************
* The EvalContext class maintains a list of signals, loaded from a jsondiff structure.
* It also maintains the list of consts and aliases for practical reasons.
*
* USAGE (console):
* let data = new EvalContext();
* // load a log file and convert it to SAGA-JSONDIFF format
* let ga = "while MYSIGNAL>10 shall OTHER==8";
* result = Tears.evaluate(ga,data);
*
* USAGE (gui)
* EventBus creates and maintains one instance of this class.
* FileBrowser emits 'jsondiff' -> eventbus propagatest the info to
*
*******************************************************************************/





/****************************************************************************
* Singleton access
*
*
*
*
*****************************************************************************/
var magic_global_intance_of_eval_context = undefined;

 function getInstance(){
// We need to check this but I assume "this" refer to the function scope
// that scope will be the same each time we call the function (magically)
if (magic_global_intance_of_eval_context == undefined){
  magic_global_intance_of_eval_context  = new EvalContext();
}
return magic_global_intance_of_eval_context;
}


/****************************************************************************
 * Mass evaluation functions, use with care, typically in back-end applications,
 * Switching context when eveluating many log-files during,e.g tuning takes
 * 96-98% of the evaluation time. 
 */
var savedInstances = {}

function setInstance(name){
    var ctx = savedInstances[name]
    if(typeof(ctx)==='undefined'){
        magic_global_intance_of_eval_context  = new EvalContext();
        savedInstances[name] = magic_global_intance_of_eval_context;
        return false;
    }else{
        magic_global_intance_of_eval_context = ctx;
        return true;
    }
}//setInstance
function hasInstance(name){
    var ctx = savedInstances[name]
    return typeof(ctx) !== 'undefined';
}
function saveInstance(name){
    savedInstances[name] = magic_global_intance_of_eval_context;
}
exports.getInstance = getInstance;
exports.setInstance = setInstance;
exports.hasInstance = hasInstance;
/***************************************************************************** */
/************************************************************
*
*
*/
class EvalContext{

  clearContext(alsoClearGlobalDefinitions){
    let self = this;

    if(typeof alsoClearGlobalDefinitions !== 'undefined' && alsoClearGlobalDefinitions == true){
    self.defaultDefinitionBlock={              // This is an optional set of global definitions that may be applied before each evaluation.
          content:"",                          // This T-EARS expression is evaluated before each G/A.
          fileName: "No definitions Loaded",   // The filename of the loaded main definitions file.
          active:false,                       // Tears parser reads this flag to include or not include this block..
          constDefAlias:undefined
    };
    }
    self.nrLoadedLogs = 0;
    self.magic_nr = Math.floor(Math.random()*1000);
    // Main data structure, shared between PlotEditor and other instances for peformance reasons.
    self.signals            = [];
    self.timestamps         = [];
    // Redundant "cache "
    self.shortNames         =  new Set();  // this is a cached list of valid short names
    self.shortNameBlacklist =  new Set();  // If we cannot create a unique shortname, the signal is black listed.

    self.xmax = 200; //- Number.MAX_VALUE;
    self.xmin = 0;  //  Number.MAX_VALUE;
  }
  /****************************************************************************
  * CTOR
  * TODO: Make this private!
  *
  *
  *
  *****************************************************************************/

  constructor(jsondiff){
   let self = this;
   self.clearContext(true);
   // TODO: Somehow connect / move this functionality with/to the file format class...
   // getShortName has a default function, but can be changed to reflect the current log policy
   // i.e depending on company or department.
   self.getShortName = function(name) {
       var nameParts = name.split(/\/|\./);
       for (var i=0; i < nameParts.length; i++) {
         if (nameParts[i].indexOf("[") !== -1) {
           return nameParts[i].substring(0, nameParts[i].indexOf("["));
         }
       }
       return nameParts.slice(-1)[0];
     };
  if (jsondiff != undefined){
    var ff = new FileFormats.JSONDIFF();
    this.mergeSignals(ff.load(jsondiff,false))
  }
  }
  /****************************************************************************
  */
  isValid(){
    return this.signals != undefined;
  }
  /****************************************************************************
  * defaultDefinitionBlock
  * The default definition block is a T-EARS snippet that is evaluated
  * before the actual G/A (typically) entered in the editor.
  * If there are any errrors in the block, an error message is thrown.
  ****************************************************************************/
  setDefaultDefinitionBlock(config){
    this.defaultDefinitionBlock = config;
    //console.log("EvalContext.js::set global definitions")
    //console.table("Global definitions: ",config);
    //console.trace();
  }
  getDefaultDefinitionBlock()
  {
    return this.defaultDefinitionBlock;
  }
  // Builds the current list of completions from the global definition block.
  // TODO: also add local definitions AND remove these from the auto local list.
  getConstDefAliasCompletions(){
  //  console.log("EvalContext.js::getConstDefAliasCompletions")
    if (false == this.defaultDefinitionBlock.active) return [];
    if (undefined == this.defaultDefinitionBlock.constDefAlias) return [];
    let completions = []
    this.defaultDefinitionBlock.constDefAlias.forEach(def => {
          if(def.scope != undefined && def.scope === "global"){
              completions.push({
                caption: def.identifier + " = ("  +
                         def.type.replace("identifier","alias") + ") " +
                         def.value.sourceString.substring(0,80).replace("\n"," "),
                value: def.identifier,
                meta: def.deftype.replace("def","define") + " global"
              })
        }
    });
    //console.table(completions)
    return completions;
 }
 getMainDefEval(){
  //  console.log("EvalContext.js::getMainDevEvals")
    if (false == this.defaultDefinitionBlock.active) return [];
    if (undefined == this.defaultDefinitionBlock.constDefAlias) return [];

    //console.table(completions)
    return this.defaultDefinitionBlock.constDefAlias;
 }
 getMatches_ChangeWithinTimeSpan(starttime,endtime){
   // TODO use half search
   // Loop through all signals and add those where somehing happens
   let res = [];
   this.signals.forEach(signal => {

     // Check if there is any timestamps
     let i = 0;
     let nrSamples  = 0;
     let end = signal.xAxis.length;
     while (i < end && signal.xAxis[i] < starttime){
       i++; // TODO rework from slow linear wind to match region.
     }
     if (i < end && signal.xAxis[i] < endtime){
      // console.log("EvalContext.js::getMatches_ChangeWithinTimeSpan found match:", signal.name)
        nrSamples ++;
         while (i < end && signal.xAxis[i] < endtime){
            i++;
            nrSamples ++;
         }
        signal.matchingSamples = nrSamples;
        res.push(signal)
      }
   });
  // if res.length == 0 return res;
  // return a list with the ones with most changes at the top.
  res.sort(function(a, b) {
                      return a.matchingSamples < b.matchingSamples;
                    });
   return res;
 }
  /****************************************************************************
  * dumpToConsole
  * Dumps the internal data structure in a readable way
  ****************************************************************************/
  dumpToConsole(extensive=undefined){
    let self = this;
   console.group("EvalContext.js::dumpToConsole");
   console.log("Magic instance nr:", self.magic_nr);
   if(extensive) console.log("Loaded signals raw ptr", self.signals);
   if (self.signals){
      console.log("Loaded #signals ", self.signals.length);
    }
   else {
       console.log("Loaded #signals ", 0);
   }
   // Redundant "cache "
   console.log("Shortnames:   ", self.shortNames);
   console.log("Blacklist:    ", self.shortNameBlacklist);
   console.log("Aliases:      ", self.aliases);

   console.log("Consts        ", self.consts);

   console.log("xmax          ",self.xmax);
   console.log("xmin          ",self.xmin);
   console.groupEnd();

 }//dump

  /****************************************************************************
  * exposeInternalSignalStructure
  * WE cannot stress the fact enough that the signals structure is shared memory
  * and we need to handle this very CAREFULLY!
  *****************************************************************************/

  getExposedInternalSignalStructure(){
    return this.signals;
  }
/****************************************************************************
* getSignals - returns a list of signals matching signal.name == name
*              Since we can load several files, we may want to compare the
*              same signal from different log files. This function returns
*              all such matches
*/
 getSignals(name){
   var self = this;
   var res = [];
   if (self.signals === undefined || self.signals == null) {
       console.log("EvalContext.js::getSignals Warning this.signals is null!")
       return res;
   }
   for (let i = 0; i < self.signals.length; i++) {
       var cs = self.signals[i];
       if (name === cs.name){
           res.push(self.signals[i]);
       }
   }
   return res;
 }
  // TODO, returning undefined is correct javascript, we should refactor
  // code to use getSignal instead of the wide search. Always use wide search,
  // since shortName is not guaranteed to be unique.
  // This version of getSignal is used by the expression evaluation.
  getSignal(shortName) {

    if (typeof shortName === 'undefined'){

       console.log("EvalContext.js::getSignal Warning shortName is undefined. Macic nr is", this.magic_nr);
       //console.trace();
       return undefined;
    }

      var sig = this.getSignalDataWideSearch(shortName); //this.nameSignalMap[shortName];
      return (sig == null) ? undefined : sig;
  }

  // TODO: make sure calling functions handle undefined instead of null!
  // TODO: then remove
  getSignalDataWideSearch(signalName) {
      var self = this;
      //console.log("EvalContext.js::getSignalDataWideSearch Searching for[",signalName, "] in the following context:", self.magic_nr)//, "from",new Error().stack )//), "from ",(new Error()).stack )
       //self.dumpToConsole();
      if (self.signals === undefined || self.signals == null) {
          console.log("EvalContext.js::getSignalDataWideSearch Warning this.signals is null!")
          return null;
      }
      /// DEBUG we needed to know which signals the expression tried to use. TODO: this may be a useful function to have!
      // An ugly variant would be to replace this method temporarily :) 
      //console.log("EvalContext.js::getSignalDataWideSearch ",signalName)
      //return self.signals[0]


      if (self.shortNameBlacklist.has(signalName)) {
          console.log("EvalContext.js::getSignalDataWideSearch trying to use blacklisted short name  (ambigous). Request rejected: " + signalName)
          return null; // do not allow usage of ambigous short-names
      }
      // Normal search
      for (let i = 0; i < self.signals.length; i++) {
          var cs = self.signals[i];
          if (signalName === cs.shortName ||
              signalName === cs.name ||
              signalName === cs.newName) {
              return self.signals[i];
          }
      }
      return null;
  }//getSignalDataWideSearch

  getAllSignalNames() {
    let self = this;
      console.log("EvalContext.js::getAllSignalNames() called ");
      // Creates a list of all signal names that should appear in
      // the completion list of the GA Editor each time you press ctrl space.
      //var completionList = Object.keys(seld.nameSignalMap);
      if (self.signals == undefined){
        return [];
      }
      var completionList = Array.from(self.shortNames);

      for (let i = 0; i < self.signals.length; i++) {
          var cs = self.signals[i];
          if(self.nrLoadedLogs == 1)
          completionList.push(cs.name)
          else
          completionList.push(cs.newName)
      }

      // Make sure to delete all duplicates.
      let uniq = new Set(completionList);
      return Array.from(uniq);
  } // getAlllSignalNames
  getXmin() {
      return this.xmin;
  }
  getXmax() {
      return this.xmax;
  }
  /**************************************************************************
  * signalIterator() - iterate through all available signals.
  *
  *
  * USAGE:   if data is a EvalContext instance
  * for (let s of data.getSignalIterator()){
  *     console.log("Name of current signal is ", s.signalName);
  * }
  *
  */
  /*
    // NOT supported in current version of js :(
   * getSignalIterator(){
      for (let i = 0 ; i < this.signals.length;i++){
      yield this.signals[i];
    }
  }*/

forceUnitTestMinMax(min,max){
  this.xmin = min;
  this.xmax = max;
}
// TO avoid spilling context over to other test cases, we may need a forced reset of the context.
forceUnitTestClearContext(){
  this.clearContext();
}
forceUnitTestSetTimeStamps(ts){
  this.timestamps = ts;
}
  /****************************************************************************
  * setSignals - This is a shortcut for the unittests and should not be used otherwise
  *****************************************************************************/

forceUnitTestSignals(signals){
  this._setSignals(signals);
  //console.log("EvalContext::forceUnitTestSignals, resulting evaluation context:", this.magic_nr);
  /*this.dumpToConsole();
  console.log("RAW signal list:");
  for (var i=0;i < this.signals.length;i++){
    console.log(this.signals[i].shortName,
                this.signals[i].xAxis,
                this.signals[i].values);
  }
*/
}
  /****************************************************************************
  * mergeSignals -- Main way of loading signals into the Evaluation Context.
  * It is capable of rebasing old and new signals so they appear on the same
  * timeline, but starts at zero seconds. There is also a comparison rebase
  * where we "rewind" all signals(0 = startTime).
  * rebase : true - the earliest log starts with zero and the next one is
  *                 adjusted to start relative to that.
  * rebase :false - Compares two logs taken at different points in time. But
  *                 logs are loaded to start at t=0 this problem is already solved.
  *                  TODO: We may need to add a logfile skew or synch if 0 is not
  *                 accurate enough.
  *****************************************************************************/
 mergeSignals(signals,rebase = true){
   if(signals.length ==0) return; // TODO add more error handling.
   var self = this;
   self.nrLoadedLogs++;
   // If we have no signals, just set the signals
   if (self.signals.length == 0){
     //console.log("EvalContext.js:mergeSignals::No previous signals, doing as before")
       self._setSignals(signals);
       return;
   }
   // If rebase is false, we can just add the new signals to the old ones
   // since logfiles are always starting at 0 seconds relative time.
   if(rebase == false){
     signals.forEach(s => {
       s.shortName = self.getShortName(s.name);
       self.signals.push(s)
     })
     self.updateShortNames();
     self.updateRange();
     return; // No furthere processing necessary
   }
   // Otherwise we need to rebase the signals and load them
   // The caller should know that the current signals carries the timeBase property.
 var ff = new FileFormats.FileFormat();
 var oldSignals = self.signals;
 self.signals = [];
 if(signals[0].timeBase > oldSignals[0].timeBase){
   oldSignals.forEach(s => {
     self.signals.push(s)
   })
   signals.forEach(s => {
     s = ff.rebaseSignal(s,oldSignals[0].timeBase);
     self.signals.push(s)
   })

}else { // New signals timebase is smaller use that one.
  oldSignals.forEach(s => {
    s = ff.rebaseSignal(s,oldSignals[0].timeBase);
    self.signals.push(s)
  })
  signals.forEach(s => {

    self.signals.push(s)
  })
}//else
// TODO: SHOULD WE SORT THE SIGNALS ? Should be done in the SignalList ??
self.signals.forEach(s =>{
  s.shortName = self.getShortName(s.name);
});
self.updateShortNames();
self.updateRange();
}//merge

  /****************************************************************************
  * setSignals  - Use new signal structure 'signals' and update short names
  * of the signals.
  */
  _setSignals(signals){
    let self = this;
    self.signals = signals;
    self.signals.forEach(s =>{
      s.shortName = self.getShortName(s.name);
    });
    self.updateShortNames();
    self.updateRange();
    self.nrLoadedLogs = 1;
  }//setSignals
  /****************************************************************************
  * createNewSignal
  *
  *
  *****************************************************************************/
  createNewSignal(newSignal){
    //console.log("EvalContext.js::creating new signal ", JSON.stringify(newSignal));
    let self = this;
    let sigEntry = newSignal
    // Handle some old format inconsistencies
    if ((sigEntry.newName === undefined) && (sigEntry.name === undefined) && (sigEntry.pretty_print !== undefined)){
      sigEntry.newName = sigEntry.pretty_print;
      sigEntry.name    = sigEntry.pretty_print;
    }
    if (sigEntry.newName === undefined){
      sigEntry.newName = sigEntry.name;
    }
    if (sigEntry.name === undefined){
      sigEntry.name = sigEntry.newName;
    }

    sigEntry.shortName  = self.getShortName(sigEntry.newName); // NOTE, we can only shorten uniqe namnes ( add * if not in OnSignalListUpdated )
    sigEntry.timestamps = self.timestamps;       // All signals get the same timestamps
    if(self.signals == undefined)
      self.signals = [];
    self.signals.push(sigEntry);
    self.updateShortNames();
    self.updateRange();
  //  this.dumpToConsole(); // DEBUG
    return  sigEntry;
  }

  /**************************************************************************
  * This is where we have finalized the SAGA JSONDIFF format.
  *{
  *    name: signalName,
  *    shortName:
  *    [newName,                <-- TODO remove in internal format?
        values,
        pretty_print,           <--- TODO remove in internal format ?
       xAxis]
  *};  The ones within brackets are the ones that we had from the beginnign.
  *
  *     Since the structure is shared, other components may also add extra
  *     properties to this structure. Keeping these consistent is a bitch.
  *
  *    selected: false,
  *    filter: true,
  *    dirty: false,
  * NOTE: Usually, this function is EvalContext INTERNAL,
  * in most cases, you want to use setSignalsFromSagaJSONDIFF instead.
  **************************************************************************/
/*
  _createSignalDataFromJSON(jsondiff) {
        let self = this;

        var signals = [];
        self.timestamps = [];  // TODO, if we want to load several files we need to scope this one.

        // Timestamps are global and the same for all signals in a log.
        if (jsondiff.hasOwnProperty("TimeStamps")) {
            self.timestamps = jsondiff["TimeStamps"];
        }

        // We construct the list of signals sorted to facilitate browsing
        var keysSorted = Object.keys(jsondiff).sort(function(a, b) {
            if (jsondiff[a].hasOwnProperty("pretty_print") &&
                jsondiff[b].hasOwnProperty("pretty_print")) {
                return jsondiff[a].pretty_print.localeCompare(jsondiff[b].pretty_print);
            } else {
                return a.localeCompare(b);
            }
        });

        for (var i = 0; i < keysSorted.length; i++) {
            var signal = keysSorted[i];

            if (signal !== "TimeStamps") {
                let sigEntry = jsondiff[signal];
                let signalName = sigEntry.pretty_print;
                if (typeof signalName !== 'undefined' && signalName !== "") {
                        // We already have [newName,values,pretty_print,xAxis]
                        sigEntry.name       = sigEntry.newName;
                        sigEntry.shortName  = self.getShortName(signalName); // NOTE, we can only shorten uniqe namnes ( add * if not in OnSignalListUpdated )
                        sigEntry.timestamps = self.timestamps;       // All signals get the same timestamps
                }
                signals.push(sigEntry);
            }
        }
        return signals;
}
*/
/******************************************************************************
*  updateShortNames
*       For backward compatibility and easier completion, we create a
*       unique list of short names. And a corresponding black list of
*       the shortNames that are not unique
*
*/
updateShortNames(){
  let self = this;
  //console.log("EvalContext::updateShortNames");

  self.shortNames = new Set();
  self.shortNameBlacklist = new Set();

  for (let i = 0 ; i < self.signals.length;i++){
      let s = self.signals[i];
      // Can we assign current signal a short name ?
     // remove previous short name ban (asterisk)
     if(s.shortName != undefined)
        s.shortName = s.shortName.replace(/(?:\*)/g, '');


      var short_name = s.shortName;

      if (self.shortNames.has(short_name)) {
          self.shortNames.delete(short_name);      // No longer OK.
          self.shortNameBlacklist.add(short_name); //
      } else {
          // If it is neither used before, nor blacklisted, we can use it.
          if (!self.shortNameBlacklist.has(short_name)) {
              self.shortNames.add(short_name);
          }
      }
  } //for
  //console.log("EvalContext::Removing invalid short names ");

  // Some of the short names became invalid 'further down the list'
  // so we need to remove them.
  for (let i = 0 ; i < self.signals.length;i++){
      let s = self.signals[i];
      if(self.shortNameBlacklist.has(s.shortName)){
        s.shortName = "*" + s.shortName; // Mark illegal with a *.
      }
  }
  }//updateShortNames
/*******************************************************************************
 getXRange() - returns min and max for the given signal (X values).
********************************************************************************/
getXRange(signal){
  let xAxis = signal.xAxis;
  if (!Array.isArray(xAxis)) {
      xAxis = [xAxis];
  }
  let xmin = xAxis[0];
  let xmax = xAxis.slice(-1)[0];
  return {min:xmin,max:xmax}
}
/*******************************************************************************
 updateRange() - updates xMin and xMax for the current signal structure.
********************************************************************************/
updateRange() {
      let self = this;
        //console.log("EvalContext.js::updateRange);

      self.xmin = Number.MAX_VALUE;
      self.xmax = Number.MIN_VALUE;
      for (let i = 0 ; i < self.signals.length;i++){
          let range = self.getXRange(self.signals[i]);
          if (range.min < self.xmin) {
              self.xmin = range.min;
          }
          if (range.max > self.xmax) {
              self.xmax = range.max;
          }
     }//for
  }
/**
*   Projects signal values on the applicable part of the timeline
*   and  Number.NaN on the non applicable parts (to avoid drawing there)
*   The common timeline contains more points than the original so we
*   interpolate there,
*
* @param signal (xAxis,values)
* @param timeline xAxis, potentially wider and with higher sampling rate.
* @returns values for timeline, where y(t) = signal.values(t) for t in signal.xAxis
*                               and y(t) = Number.NaN for t not in signal.xAxis
* (note that t is not meant as index in the example)
************************************************************************/
projectSignalOnTimeline(signal, timeline){

    // Truncate common timeline for signal.
    var localTimeLine = [];
    var before  = [];
    var after = [];
    timeline.forEach(t =>{
      var first = signal.xAxis[0];
      var last = signal.xAxis[signal.xAxis.length - 1];
      if ( (t >= first) &&
           (t <= last))
           localTimeLine.push(t);
      if(t < first) before.push(Number.NaN);
      if(t > last)  after.push(Number.NaN);
    }) //forEach
    var result = before;
    result = result.concat(this.interpolateDataToTimeline(signal, localTimeLine));
    result = result.concat(after);
    return result;
  }
  /**
   * Interpolates a signals data values to a given xAxis (timeline).
   *
   * This is done by providing a signal value for each tick on the timeline. The
   * signal follows its own x-axis, but if there are x-ticks on the timeline that
   * are not in the signals x-axis (i.e. the signal doesn't change then), the
   * previous signal value is kept.
   *
   * @param data - Signal data containing {xAxis: [], values: []}
   * @param timeline - The xAxis that is used as a target for interpolation
   *
   * @return interpolated values (suitable for storage in e.g. data.values)
   */

   /************************************************************
   * joinTimelines - Merges two timelines into one (P1 or P2)
   * It also stretches the results at getXmin and getXmax
   * NOTE that this should only be used for visualization!
   */
   joinTimelines(tLine1, tLine2) {

     let evalContext = getInstance();
     let timeline = tLine1.concat(tLine2);
     timeline.sort(function(a, b) {
       return a - b;
     });
       if (timeline.length > 0) {
           if (timeline[0] > evalContext.getXmin())
               timeline.splice(0, 0, evalContext.getXmin());
           if (timeline.slice(-1)[0] < evalContext.getXmax())
               timeline.push(evalContext.getXmax());
       }
     // Remove duplicates
     for (var i = 1; i < timeline.length; i++)
     {
       if (timeline[i-1] === timeline[i]) {
         timeline.splice(i, 1);
       }
     }
     return timeline;
   }
interpolateDataToTimeline(data, timeline) {
    var lastMatchIndex = 0;
    var interpolatedValues = [];
    var time = data.xAxis;
    var values = data.values;
  /*  if (!Array.isArray(time))   // We should only deal with signals here.
      time = [time];
    if (!Array.isArray(values))
      values = [values];
*/
    var i=0;
    while (timeline[i] < time[0]) {
      interpolatedValues.push(values[0]);
      i++;
    }
    for (; i<timeline.length; i++) {
      if (lastMatchIndex < time.length &&
            timeline[i] === time[lastMatchIndex]) {
        lastMatchIndex++;
      }
      interpolatedValues.push(values[lastMatchIndex-1]);
    }
    return interpolatedValues;
  }

};//class
