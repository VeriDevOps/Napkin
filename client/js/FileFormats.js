const EvalContext = require('./EvalContext.js');
// Later we should create a set of classes for different file formats.
//export class fileLoader{}


// The built in function does not work according to some random people....
function round(n,d){
  var parts = String(n).split(".");
  var res = parts[0]
  if(parts.length > 1){
    var frac = parts[1].substr(0,d + 1);
    if(frac.len>d){
      // We need to round
      var lastdig = parseInt(frac.slice(-1));
      frac = parseInt(frac.substr(0,d));
      if (lastdig >= 5)
        frac++;
      else
        frac--;
    }
    res = res + "." + frac;
  }
  return res
}//round



const formatList = [
  {id:0,name:"Scania AB",format:"JSONDIFF"},
  {id:1,name:"Bombardier Transportation AB",format:"Tabbed CSV"},
  {id:2,name:"Bombardier Transportation AB",format:"JSONDIFF"},
]
exports.formatList = formatList;
/*******************************************
* Format factory TODO: maybe only the formatList and getFormat
*                      should be visible.
********************************************/
function getFormat(id){
  switch (id){

    case 0: return new JSONDIFF();
    case 1: return new TabbedCSV();
    case 2: return new JSONDIFF();
  }
}
exports.getFormat = getFormat;
class FileFormat{
/*********************************
* compressSignal - Assumes signals on the format:
* (any other fields)
* xAxis:  <-- will be compressed
* values: <-- will be compressed
*********************************/
 compressSignal(s){
    var xAxis = [s.xAxis[0]];
    var values = [s.values[0]];
    var lastY = values[0];
    for(var i = 1; i < s.xAxis.length; i++){
      var y = s.values[i]
      if (y != lastY){
        xAxis.push(s.xAxis[i]);
        values.push(y);
        lastY = y;
      }
    }
    var lastX = s.xAxis[s.xAxis.length -1];
    if(xAxis[xAxis.length -1] < lastX){
      // add last point in logg
      xAxis.push(lastX);
      values.push(s.values[s.values.length -1]);
    }
    // Update the original signal with new
    // compressed data.
    s.xAxis = xAxis;
    s.values = values;
    return s;
  }
  /*********************************
  * rebaseSignal - Assumes signals on the format:
  * (any other fields)
  * xAxis:  <-- will be changed
  * timeBase is the new point in time that will be the zero point.
  * IF the signal already has an old time base, that rebase will be
  * cancelled first and then relocated to new zero point.
  *********************************/
   rebaseSignal(s,timeBase){
    var xAxis = [];
    var oldTimebase = 0;
    if (s.timeBase !== undefined){
      oldTimebase = s.timeBase;
    }
    s.xAxis.forEach(t =>{
      xAxis.push(t + oldTimebase - timeBase)
    })
    s.xAxis = xAxis;
    s.timeBase = timeBase;
    return s;
  }

  /*********************************
  * parseTime - converses string to time stamp.
  * Each new file format should override this one.
  *********************************/
  parseTime(time){

  }
  formatSeconds(t){
    var res = "";
    var rest = 0;
    var h = Math.trunc(t / 3600);
    rest = t - h * 3600;
    var m = Math.trunc(rest / 60);
    rest = rest - m * 60;
    var s = rest
    return  h + "h:" + m + "m:" + round(s,3) + "s";
  }
  /************************************
  * load is the main method that converts a file (read into the string data)
  * into a list of compressed signals
  *
  *************************************/
load(data,fileName = "", dataIsText=true){

  }
}
exports.FileFormat = FileFormat;
/****************************************************************************
* TabbedCSV  - THis sub class handles the BT export file format.
* Note that this format is not really, tab separated but more a varying Number
* of spaces.
*****************************************************************************/
class TabbedCSV extends FileFormat{
/***************************************
* this is the main function that loads the data
* overrides the super class function.
*
****************************************/
load(data,fileName = "", dataIsText=true){
  /* TODO: Add houskeeping info and validation stuff*/
  //console.log("FileFormats.js::TabbedCSV::loading file " + fileName)
    var self = this;
    var logInfo = {     // Note this structure needs to be identical for all formats...
            name:fileName,
            type:"TabbedCSV",
            startTime:0,            // Start time from original file (original format)
            endTime:0,              // End time from original file   (original format)
            formatter:this,         // pointer to this file format object for future reference
            timeBase:0,             // The original time base of the signal in seconds
            noOfSignals:0,          // number of signals in log file
            signalCount:0
            //TimeStamps            // TODO: move timestamp handling here. (Scanias word for annotations)
    };

    var signals = [];
    var dataRows = data.split('\n')
    //console.log("FileFormats.js::TabbedCSV::file has row count = " + dataRows.length)

    if(dataRows.length < 2) throw ("File " + fileName + " has no data rows, wrong format?");
    // First row contains the names of the signals.
    var signalNames = this.readLine(dataRows[0]);
    var sigNames2 = this.readLine(dataRows[1]);// Some BT files have a one liner with some info
    if( signalNames.length != sigNames2.length ){
        //console.log("Skipping row",signalNames)
        //console.log("Instead, using row",sigNames2, "as columns")
        dataRows.shift();
        signalNames = sigNames2;
    }
    signalNames.shift();//First column is time and we do not care about what its called.
    signalNames.forEach(name => {
        // This must follow the template signal for SAGA
        // as defined in EvalContext.js
        signals.push({name:name,
                    newName:fileName + "/" + name,      //<-- TODO considered for removal / change /rename
                    pretty_print:name,                  //<--       this as well
                    logInfo:logInfo,
                    values:[],
                    xAxis:[]
                    });
    })

    //console.log("FileFormats.js::TabbedCSV::Found the following signals: ", signals)
    dataRows.shift();

    // Signals always start at zero so we need to see where the log file start:
    var timeBase = (this.readLine(dataRows[0])[0])
    logInfo.startTime = parseFloat(timeBase);
    timeBase = this.parseTime(timeBase);
    logInfo.timeBase = timeBase; // Store original time base
    logInfo.signalCount = signals.length;

    // dataRows=dataRows.slice(0,10) // DEBUG

    dataRows.forEach(row =>{
        var dataCols = this.readLine(row);
        //console.log("Processing row")
        // first column is time
        var currentTime = dataCols[0];
        dataCols.shift();
        // Read rest of columns (= one for each signal)
        if(dataCols.length  != logInfo.signalCount){
            if(dataCols.length>0){  // Really empty lines are OK at the end.
            console.error("Wrong number of columns in file " + fileName + " got "  + dataCols.length + " expected " + logInfo.signalCount);
            console.log("failed on the following row data:", row);
            }

        }else{
            logInfo.endTime = currentTime;              // Update last timestamp if row is not empty
            for(var i = 0 ; i < dataCols.length; i++){  // Add timestamp and value to the signals.
            signals[i].xAxis.push(this.parseTime(currentTime));
            signals[i].values.push(parseFloat(dataCols[i]));
            }
        }//if Valid row or not
    })

    // SPECIAL CASE FOR BOMBARDIER CASE STUDY TODO: solve format specific parameters with loadable class


     

    var signals2 = signals;

    signals = []
    var signalNames2 = [];
    signals2.forEach(s =>{
    if(s.name.substr(0,3) ==="CCU"){  // Only mess with CCU signals
        s.name = s.name.substr(5);          // cut away CCUx
        if (signalNames2.indexOf(s.name)>-1) {
            //console.log("Dropping redundant signal ",s.name);
        }else{
            signalNames2.push(s.name);

            s.newName = s.logInfo.name + "/" + s.name;
            s.pretty_print = s.pretty_print.substr(5); // cut away CCUx
            signals.push(s)
        }
    }else{
            signals.push(s);   // Not a CCUx signal. Just put it back.
    }
    });

    ////// END SPECIAL CASE

    // We use compressed signals in SAGA so need to compress the signals
    var compressedSignals = [];
    signals.forEach(s =>{
        s = this.compressSignal(s);
        s = this.rebaseSignal(s, timeBase);
        compressedSignals.push(s);
    })
    //console.log(" Resulting compressed signals are ", compressedSignals)

    /// MORE SPECIAL CASE FOR Bt
    /*
    var CcuoEmBr = self._getSignal(compressedSignals,'MWT.TC_BO_oCCUOMToCCUS.TC_BO_CCUS_S_CcuoEmBr')
    if (CcuoEmBr){
        console.log("FileFormats::CSV::load found CcuomBR")
        var patch =  self._frcVal(compressedSignals, 
                            'MWT.TC_BO_oCCUOMToCCUS.TC_BO_CCUS_S_CcuoEmBr',
                            'MWT.TC_BO_oCCUOMToCCUS.TC_BO_CCUS_S_CcuoEmBr_S',
                            'MWT.TC_BO_oCCUOMToCCUS.TC_BO_CCUS_S_CcuoEmBr_R',
                            'MWT.TC_BO_oCCUOMToCCUS.TC_BO_CCUS_FrcEn');
        if(patch){
            console.log("FileFormats::CSV::load patching CcuomBR",patch);
            CcuoEmBr.xAxis = patch.xAxis;
            CcuoEmBr.values = patch.values; 
        }
    }

    var StaInhReq = self._getSignal(compressedSignals,'MWT.TC_BO_oCCUOMToCCUS.TC_BO_CCUS_S_StaInhReq')
    if (StaInhReq){
        console.log("FileFormats::CSV::load found StaInhReq")
        var patch =  self._frcVal(compressedSignals, 
                            'MWT.TC_BO_oCCUOMToCCUS.TC_BO_CCUS_S_StaInhReq',
                            'MWT.TC_BO_oCCUOMToCCUS.TC_BO_CCUS_S_StaInhReq_S',
                            'MWT.TC_BO_oCCUOMToCCUS.TC_BO_CCUS_S_StaInhReq_R',
                            'MWT.TC_BO_oCCUOMToCCUS.TC_BO_CCUS_FrcEn');
        if(patch){
            console.log("FileFormats::CSV::load patching CcuomBR",patch);
            StaInhReq.xAxis = patch.xAxis;
            StaInhReq.values = patch.values; 
        }
    }
    */
    /// END MORE SPECIAL CASE FOR BT

    return compressedSignals;
}//load


 readLine(line){
 //console.log("readLine::Splitting line into columns ",line.length)
  var cols_= line.split(/(\s+)/).filter( e => e.trim().length > 0);
  var cols = [];
  cols_.forEach(c => {
    c = c.trim().replace("'","").replace("\\","");
    if (c.length>0)
    cols.push(c)
  })
  //console.log("Extracted columns ",cols.length)
  return cols;
}
//-----------------------------------------------------------------------
//            Internal  - _getSignal
//-----------------------------------------------------------------------
_getSignal(signals, name){
    var res = undefined;
    for(var i = 0; i < signals.length; i++){
        
        if (signals[i].name.includes(name)){
            res =  signals[i];
            break;
        }
    }
    return res;
}
//-----------------------------------------------------------------------
//            Internal  - _frcVal
//-----------------------------------------------------------------------
_frcVal(signals, S_name, S_S_name, S_R_name, FrcEn_name){
    var self = this;
    var S     = self._getSignal(signals,S_name);
    var S_R   = self._getSignal(signals,S_R_name);
    var S_S   = self._getSignal(signals,S_S_name);
    var FrcEn = self._getSignal(signals,FrcEn_name);

    console.log("TabbedCSV::_frcVal",S,S_R,S_S,FrcEn);
    if(! S)     return undefined
    if(! FrcEn) return undefined
    

    if(!S_R)
        S_R = { 
            values:[0,0],
            xAxis:[0,Number.MAX_VALUE]
        };
    if(!S_S)
        S_S = { 
            values:[0,0],
            xAxis:[0,Number.MAX_VALUE]
        };
    console.log("TabbedCSV::_frcVal",S,S_R,S_S,FrcEn);
    var ctx = EvalContext.getInstance();
    var commonTimeLine = ctx.joinTimelines(S.xAxis, S_R.xAxis)
    commonTimeLine = ctx.joinTimelines(commonTimeLine, S_S.xAxis)
    commonTimeLine = ctx.joinTimelines(commonTimeLine, FrcEn.xAxis)
    
    let joinedVals = [];
    
   [FrcEn, S_R, S_S, S].forEach(s => {
      //console.log("Projecting on  timeline for signal " + s.value.name)
      joinedVals.push(ctx.projectSignalOnTimeline(s, commonTimeLine));
    })

    // JoinedVals contains exactly 3 signals with the same number of data points.
    // select creates a fourth by picking a value from S1 if SC[t] == true and S2 if SC[t] == false
    // for all samples t in comminTimeLine
   var res = []
   for(let i = 0; i < commonTimeLine.length;i++){               
        if(joinedVals[0][i] == 0){                              // FrcEn == 0 ---> S
            res.push(joinedVals[3][i])
            continue;
        }
        if(joinedVals[1][i] == 0 && joinedVals[2][i] == 0){     // S_R == 0  && S_S == 0 ---->S
            res.push(joinedVals[3][i])
            continue;
        }
        if(joinedVals[1][i] == 1 && joinedVals[2][i] == 0){     // S_R == 1  && S_S == 0 ---->0
            res.push(0)
            continue;
        }
        if(joinedVals[1][i] == 0 && joinedVals[2][i] == 1){     // S_R == 0  && S_S == 1 ---->1
            res.push(0)
            continue;
        }
        if(joinedVals[1][i] == 0 && joinedVals[2][i] == 0){     // S_R == 0  && S_S == 1 ---->undefined!!!!!!
            res.push(0)
            console.error("WARNING ", S_R_name, "and", S_S_name, "are both set at the same time")
            continue;
        }
    }

    return {xAxis:commonTimeLine,
           values:res}
} //frcVal
/* parseTime - Overrides the parse time from the super class*/
    parseTime(time){
        //return parseFloat(time); // DEBUG
        // hour_fraction_to_s
        // time should be a string with fractions of hour like time TimeStamps
        var hour = parseInt(time)
        var minute = (parseFloat(time) - hour) * 60
        var second = (minute - Math.trunc(minute)) * 60
        var res = hour *3600000;
        res += Math.trunc(minute) * 60000;
        res += second * 1000;
        return res / 1000.0;
    }
    formatTime(t){
        var h = parseInt(t)
        var m = (parseFloat(t) - h) * 60
        var s = (m - Math.trunc(m)) * 60
        return  h + "h:" + Math.trunc(m) + "m:" + round(s,3) + "s";
    }
}// tabbedCSV
exports.TabbedCSV = TabbedCSV;
/*****************************************************************************
* SCANIA / BT JSONDIFF format
*
* Note that when the file is transferred from the server, data is already
* json format. When loaded from file, it is text.
* TODO: Make sure that the extra param does not mess up class hierarchy stuff...
******************************************************************************/
class JSONDIFF extends FileFormat{
load(data,fileName = "", dataIsText=true){
  var logInfo = {     // Note this structure needs to be identical for all formats...
          name:fileName,
          type:"TabbedCSV",
          startTime:0,            // Start time from original file (original format)
          endTime:0,              // End time from original file   (original format)
          formatter:this,      // pointer to this file format object for future reference
          timeBase:0,          // The original time base of the signal in seconds
          noOfSignals:0        // number of signals in log file
          //TimeStamps        // TODO: move timestamp handling here. (Scanias word for annotations)
  };

  var jsondiff;
  if(dataIsText)
  jsondiff = JSON.parse(data);
  else {
    jsondiff = data
  }
  var signals = [];
  var timestamps = [];
  // Timestamps are global and the same for all signals in a log.
  if (jsondiff.hasOwnProperty("TimeStamps")) {
      timestamps = jsondiff["TimeStamps"];
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
                  sigEntry.name       = sigEntry.newName;
                  sigEntry.newName = fileName + "/" + sigEntry.name,   // TODO, Check with SCANIA, Violating something?
                  sigEntry.timestamps = timestamps;       // All signals get the same timestamps
                  sigEntry.logInfo = logInfo;
          }
          signals.push(sigEntry);
      }
  }
  // Signals are already compressed, but we need to find the lowest point in time
  var xmin = Number.MAX_VALUE;
  var xmax = -Number.MAX_VALUE;
  signals.forEach(s =>{
         if (s.xAxis[0] < xmin ) {
             xmin = s.xAxis[0];
         }
         if (s.xAxis[0] > xmax ) {
             xmax = s.xAxis[0];
         }
  })

  // and rebase the signals accordingly:

  var res = [];
  signals.forEach(s =>{
    s = this.compressSignal(s);
    s = this.rebaseSignal(s, xmin);
    res.push(s);
  })

  // Update log info:
  logInfo.noOfSignals  = signals.length;
  logInfo.startTime    = xmin;             // JSONDIFF has same format (seconds)
  logInfo.timeBase     = xmin;             // No difference here.
  logInfo.endTime      = xmax;
  return res;
}//load
formatTime(t){

   var rest = 0;
   var h = parseInt(t / 3600);
   rest = t - h * 3600;
   var m = parseInt(rest / 60);
   rest = rest - m * 60;
   var s = rest
  return h + "h:" + m + "m:" + s + "s";
}

}//JSONDIFF
exports.JSONDIFF = JSONDIFF;
