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
export function getInstance(){
// We need to check this but I assume "this" refer to the function scope
// that scope will be the same each time we call the function (magically)
if (magic_global_intance_of_eval_context == undefined){
  magic_global_intance_of_eval_context  = new EvalContext();
}
return magic_global_intance_of_eval_context;
}

export function joinTimelines(tLine1, tLine2) {

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
/************************************************************
*
*
*/
export class EvalContext{

  _clearContext(){
    let self = this;
    self.magic_nr = Math.floor(Math.random()*1000);
    // Main data structure, shared between PlotEditor and other instances for peformance reasons.
    self.signals            = undefined;
    self.timestamps         = [];
    // Redundant "cache "
    self.shortNames         =  {};  // this is a cached list of valid short names
    self.shortNameBlacklist =  {};  // If we cannot create a unique shortname, the signal is black listed.

    self.aliases = undefined;      // Re-populated by Tears.js whenever evaluating an expression
    self.consts  = undefined;      // Re-populated by Tears.js whenever evaluating an expression
    self.xmax = - Number.MAX_VALUE;
    self.xmin =   Number.MAX_VALUE;
    // These signals are usded for + and - inf
    self.infEventSignal = {shortName:"inf",
                            xAxis:[Number.MAX_VALUE]};
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
   self._clearContext();
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
     }; //
  if (jsondiff != undefined){this.setSignalsFromSagaJSONDIFF(jsondiff)}
  }
  /****************************************************************************
  */
  isValid(){
    return this.signals != undefined;
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
 resetConstsAndAliases(){
   self.aliases = undefined;      // Re-populated by Tears.js whenever evaluating an expression
   self.consts  = undefined;      // Re-populated by Tears.js whenever evaluating an expression
 }
  /****************************************************************************
  * exposeInternalSignalStructure
  * WE cannot stress the fact enough that the signals structure is shared memory
  * and we need to handle this very CAREFULLY!
  *****************************************************************************/

  getExposedInternalSignalStructure(){
    return this.signals;
  }

  // TODO, returning undefined is correct javascript, we should refactor
  // code to use getSignal instead of the wide search. Always use wide search,
  // since shortName is guaranteed to be unique.
  // This version of getSignal is used by the expression evaluation.
  getSignal(shortName) {
    // Due to some error in the grammar, we will get a def with a number!
    if (typeof shortName == 'number'){
      //console.log("EvalContext.js::getSignal Warning shortName is a number!");
      return shortName;
    }

    if (shortName == undefined){

       console.log("EvalContext.js::getSignal Warning shortName is undefined. Macic nr is", this.magic_nr);
       //console.trace();
       return undefined;
    }
      if (shortName.toLowerCase() === "inf") {
      /*    console.log("EvalContext.js::getSignal Warning Expression is USING INF!!!!!",self.infEventSignal)
          // TODO:  inf or logstart, logend should be an event "signal" that only contains that point in time
          //        However, I do not know how this eventually ends up in e.g in between.
          return {shortName:"inf",
                  xAxis:[Number.MAX_VALUE]};
      }else if (shortName.toLowerCase() === "neginf") {
          console.log("EvalContext.js::getSignal Warning Expression is USING NEGINF!!!!!",self.infEventSignal)
          // TODO:  inf or logstart, logend should be an event "signal" that only contains that point in time
          //        However, I do not know how this eventually ends up in e.g in between.
          return {shortName:"neginf",
                  xAxis:[-Number.MAX_VALUE]};
      */ return undefined;
      }

      var sig = this.getSignalDataWideSearch(shortName); //this.nameSignalMap[shortName];
      return (sig == null) ? undefined : sig;
  }
  isSignal(signalName){
    var self = this;
    // This function is required to separate real signals from def,alias and const
    // Normal search
    for (let i = 0; i < self.signals.length; i++) {
        var cs = self.signals[i];
        if (signalName === cs.shortName ||
            signalName === cs.name ||
            signalName === cs.newName) {
            return true;
        }
    }
    return false;
  }

  //TODO remove this or make it right.
  hasSignal(shortName) {
                return this.getSignalDataWideSearch(shortName) != null;
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

      // If not normal signal, it may be a const OR an alias
      if (self.consts !== undefined) {
          for (let i = 0; i < self.consts.length; i++) {
              var _const = self.consts[i];
              //console.log("EvalContext.js::getSignalDataWideSearch() checking const ", _const);
              if (_const.name === signalName)
                  return {
                      shortName: signalName,
                      isConst: true,
                      name: signalName,
                      newName: signalName,
                      xAxis: [self.getXmin(), self.getXmax()],
                      values: [_const.float, _const.float]

                  };
          }
      }
      if (self.aliases !== undefined ) {

          for (let i = 0; i < self.aliases.length; i++) {
              var alias = self.aliases[i];
              if (alias.name  === signalName) {
                  // ok, we are requesting an alias. Go and get the real signal
                  //console.log(" EvalContext.js::getSignalDataWideSearch found matching alias " + alias.alias.alias);
                  return self.getSignalDataWideSearch(alias.alias.alias);
              }
          }
      }
      return null;
  }//getSignalDataWideSearch
  getAllSignalNames() {
    let self = this;
      //console.log("Log.js::getAllSignalNames() called ");
      // Creates a list of all signal names that should appear in
      // the completion list of the GA Editor each time you press ctrl space.
      //var completionList = Object.keys(seld.nameSignalMap);
      if (self.signals == undefined){
        return [];
      }
      var completionList = Array.from(self.shortNames);

      for (let i = 0; i < self.signals.length; i++) {
          var cs = self.signals[i];
          completionList.push(cs.newName)
      }
      if (self.consts !== undefined) {
          for (let i = 0; i < self.consts.length; i++) {
              completionList.push(self.consts[i].name);
          }
      }
      if (self.aliases !== undefined) {
          for (let i = 0; i < self.aliases.length; i++) {
              completionList.push(self.aliases[i].name);
          }
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
  setConsts(consts) {
      this.consts = consts;
  }
  setAliases(aliases) {
      this.aliases = aliases;
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
  this._clearContext();
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
  * setSignals
  *****************************************************************************/
setSignalsFromSagaJSONDIFF(jsondiff){
    let self = this;
    let signals = self._createSignalDataFromJSON(jsondiff);
    self._setSignals(signals);
}
  /****************************************************************************
  * setSignals  - Use new signal structure 'signals' and update short names
  * of the signals.
  */
  _setSignals(signals){
    let self = this;
    self.aliases = undefined;      // Re-populated by Tears.js whenever evaluating an expression
    self.consts  = undefined;      // Re-populated by Tears.js whenever evaluating an expression
    self.signals = signals;
    self.updateShortNames();
    self.updateRange();
  }//setSignals
  createNewSignal(newSignal){
    console.log("EvalContext.js::creating new signal ", JSON.stringify(newSignal));
    let self = this;
    let sigEntry = newSignal
    sigEntry.name       = sigEntry.newName;
    sigEntry.shortName  = self.getShortName(sigEntry.newName); // NOTE, we can only shorten uniqe namnes ( add * if not in OnSignalListUpdated )
    sigEntry.timestamps = self.timestamps;       // All signals get the same timestamps
    if(self.signals == undefined)
      self.signals = [];
    self.signals.push(sigEntry);
    self.updateShortNames();
    self.updateRange();
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
static getXRange(signal){
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
********************************************************************************/updateRange() {
      let self = this;
        //console.log("EvalContext.js::updateRange);

      self.xmin = Number.MAX_VALUE;
      self.xmax = Number.MIN_VALUE;
      for (let i = 0 ; i < self.signals.length;i++){
          let range = EvalContext.getXRange(self.signals[i]);
          if (range.min < self.xmin) {
              self.xmin = range.min;
          }
          if (range.max > self.xmax) {
              self.xmax = range.max;
          }
     }//for
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
  interpolateDataToTimeline(data, timeline) {
    var lastMatchIndex = 0;
    var interpolatedValues = [];
    var time = data.xAxis;
    var values = data.values;
    if (!Array.isArray(time))
      time = [time];
    if (!Array.isArray(values))
      values = [values];

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
