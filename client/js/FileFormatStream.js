/*-------------------------------------------------------------------------------------------------
* FileFormat - PolledStream
* Author: Daniel Flemström 2020-04-05
* 
* This file format is used by the LiveView component to handle 
* NOTE this file should NOT be imported to EvalContext since that would end up in a circular ref. 
* NOTE that the cache must be kept out of this class to avoid a circular reference via the signal 
* instances
*-------------------------------------------------------------------------------------------------*/

const EvalContext = require('./EvalContext.js')
const FileFormats = require('./FileFormats.js')

class PolledStream extends FileFormats.FileFormat{
//--------------------------------------------------------------------------------
//----------------------           init              -----------------------------
//--------------------------------------------------------------------------------
init(signalnames,maxtime){
    var self = this;
    EvalContext.getInstance().clearContext(true);
    var sigcache = {}; // Map of signal name from data frame to signal structure, created by us
    //console.log("PolledStream::setup signals: ",signalNames);
	var logInfo = {     // Note this structure needs to be identical for all formats...
                    name:"Polled Live Stream " + new Date(),
                    type:"Live",
                    startTime:0,            // Start time from original file (original format)
                    endTime:maxtime,        // End time from original file   (original format)
                    formatter:self,         // pointer to this file format object for future reference
                    timeBase:0,             // The original time base of the signal in seconds
                    noOfSignals:signalnames.length,        // number of signals in log file
                    signalCount:signalnames.length,        // What is really the difference ?
                     };

	var ctx = EvalContext.getInstance()
   
	signalnames.forEach(name => {       
        var signal = {  name:name,
                        newName:logInfo.type + "/" + name,      // This distinguish it from a loaded log file e.g
                        pretty_print:name,                  
                        logInfo:logInfo,
                        values:[],
                        xAxis:[]   				 		    
                     }; 
        sigcache[name] = ctx.createNewSignal(signal)
        //console.log("\n\nPolledStream::setup created: ",self.signals[name],"\n");
    })//forEach
    // This signal stretches out the plots to get an initial size...
    ctx.createNewSignal( {  name:"STREAM-TIMESPAN",
                            newName:logInfo.type + "/" + name,       
                            pretty_print:"TIMESPAN",                  
                            logInfo:logInfo,
                            values:[0,0],
                            xAxis:[0,maxtime]   				 		    
                        });

    ctx.updateShortNames();
    ctx.updateRange();
    return sigcache;
}
//--------------------------------------------------------------------------------
//----------------------          update             -----------------------------
//--------------------------------------------------------------------------------
update(updates,sigcache){
    let self = this;
	if(updates == undefined || updates.length == 0 || sigcache == undefined)
		return;
    updates.forEach(update => {       
        //console.log("PolledStream::update  update-set ",update["TIME"] 
        Object.keys(update).forEach(signame => {
            //console.log("PolledStream::update updating signal ",signame,"\n")
            let signal = sigcache[signame];
            if (signal === undefined) { // TIME and M_S_T not in cache...
                //console.log("PolledStream::update, skipping signal " + signame);
                return;//continue
            }
            let newval  = update[signame];
            let newtime = update["TIME"] 
            let slen    = signal.values.length;  //xAxis same length
            let lastval = signal.values[slen -1];
            if(slen < 2 ){   
                //Always fill out the first two places
                signal.values.push(newval);
                signal.xAxis.push(newtime);   
                return; //continue         
            }
            if (newval != lastval){
                // Insert new values
                signal.values.push(newval);
                signal.xAxis.push(newtime);   
            }else{
                // Just move last timestamp forward for same value. 
                signal.xAxis[slen -1] = newtime;
            }
            })//each signal in update
        })// each update in update-set
}//update

}// PolledStream
exports.PolledStream = PolledStream;
/*
test_burst = 
 {
  "msg": ".",
  "data": [
    {
      "MWT.TC_BI_iCCUS_AToCCUO.TC_BI_CCUS_X_LifeSignA": "0",
      "MWT.TC_C_TC_C_Sup_T3.TC_BI_CCUS_S_RdyToRn_A1": "0",
      "TIME": "15.835000"
    },
    {
      "MWT.TC_BI_iCCUS_AToCCUO.TC_BI_CCUS_X_LifeSignA": "0",
      "MWT.TC_C_TC_C_Sup_T3.TC_BI_CCUS_S_RdyToRn_A1": "1",
      "TIME": "16.061000"
    },
    {
      "MWT.TC_BI_iCCUS_AToCCUO.TC_BI_CCUS_X_LifeSignA": "2",
      "MWT.TC_C_TC_C_Sup_T3.TC_BI_CCUS_S_RdyToRn_A1": "2",
      "TIME": "16.261000"
    },
    {
      "MWT.TC_BI_iCCUS_AToCCUO.TC_BI_CCUS_X_LifeSignA": "0",
      "MWT.TC_C_TC_C_Sup_T3.TC_BI_CCUS_S_RdyToRn_A1": "0",
      "TIME": "16.486000"
    },
    {
      "MWT.TC_BI_iCCUS_AToCCUO.TC_BI_CCUS_X_LifeSignA": "0",
      "MWT.TC_C_TC_C_Sup_T3.TC_BI_CCUS_S_RdyToRn_A1": "3",
      "TIME": "16.713000"
    }
  ]
}

 // A bit of test code. To run, uncomment and issue:
 //  >node FileFormatStream.js

//console.log("Testing the PolledStream",test_burst)

stream = new PolledStream([ "CCU2.MWT.TC_BI_iCCUS_AToCCUO.TC_BI_CCUS_X_LifeSignA",
                            "CCU1.MWT.TC_C_TC_C_Sup_T3.TC_BI_CCUS_S_RdyToRn_A1"]);

EvalContext.getInstance().dumpToConsole()
 
stream.update(test_burst.data);

console.log()
console.log(stream.signals)
 */