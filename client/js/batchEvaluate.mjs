const fs = require('fs');
const separator = require('path').sep;
const tears = require('./Tears.js');
const EvalContext = require('./EvalContext.js')
const FileFormats = require('./FileFormats.js')


let debug = false



var default_config = {
  "version":"2.0",
  //"logFiles": [],
  //"globalDefs": '',
  "gaFiles"   : [],
  "gaText" :"def events kalle=[1,2,3]\ndef events olle=[1,4,10]\nwhen kalle or olle",
  "include"   :["result"]
//                 "include"   :["result","plots","minimal","siglist"]
};


if(debug) console.log('Argumenst :  ' + process.argv);

if (process.argv.length < 3) {
  console.log('Usage: node ' + process.argv[1].split("/").pop() + ' <config-file>');
  process.exit(1);
}

if( process.argv[2].substring(0,6) == "gatext" ){
  default_config.gaText = process.argv[2].substring(7,process.argv[2].length)
  config = default_config
  if(debug) console.log("Evaluating  minimal config as:",  config)
  }
else{
  if(debug) console.log("Loading config file",  config)
  var config = require(process.argv[2]).config;
}

// Secret SCANIA Move : Usage: node batchEvaluate.mjs <config-file> <single-log-file>
if (process.argv.length > 3) {
 config.logFiles = [ process.argv[2]];
}

/*****************************************************************************
*
******************************************************************************/
/* Reads the config block and merges all listed log-files */
function prepareContext(config){
    if(config.hasOwnProperty("logFiles") == false) return;
    // Prepare Context
    var ctx = EvalContext.getInstance();
    config.logFiles.forEach(logFile => {
      if(debug) console.log("BatchEvaluate.mjs::prepareContext reading logfile",logFile)
      let formatter = FileFormats.getFormat(logFile.format);
      if(debug) console.log(formatter)
      if(debug) console.log("prepareContext:: loading ", logFile.filename)
      let data = fs.readFileSync(logFile.filename, 'utf8');
      try{
        var signals = formatter.load(data,logFile.filename,true);
      } catch(err){
        if(debug) console.log("File " + logFile.filename + " caused \n "+ err);
        signals = [];
      }
      if(signals != undefined && signals.length > 0){
        EvalContext.getInstance().mergeSignals(signals,false);
      }
      // next log file
    })
}
//-----------------------------------------------------------------------------
// Set optional global definitions
function prepareGlobalDefinitions(config){
  if(config.hasOwnProperty("globalDefs") == false) return;

  let src = fs.readFileSync(config.globalDefs, 'utf8');
  let defBlock =  {
       content:src,
       fileName: config.globalDefs,
       active:true
      }
  EvalContext.getInstance().setDefaultDefinitionBlock(defBlock);
  // Trick tears to evaluate the global defs if any.
  let ignore_result = tears.evaluate_tears_expression("", false, true);
  //self.definitions = gaText;

}
//(----------------------------------------------------------------------)

function stripPlots(obj){
 obj.forEach(row=>{
   if(debug) console.log("Removing plots for ", row.name, Object.keys(row))
   if(debug) console.log("Removing plots for EVAL=", Object.keys(row.eval))

 })
  return; // damage already done (all pointers)
}//stripPlots
//-----------------------------------------------------------------------------
// Evaluates but also presents the results a bit more human friendly.
// the sub plots are simply ignored
function evaluate(gaText,gaFile, include){
  var entry = {file_name:gaFile}
  //entry.ga = gaText;
  //extractErrorMsg a derivate of BatchEvaluate.vue::evaluate and in GAEditor.vue
  // If you find a bug, please update original in BatchEvaluate.vue
  let res = tears.evaluate_tears_expression(gaText, false, true);
  if(debug){
    console.log('batchEvaluate.mjs::evaluate() raw result ',JSON.stringify(res))
  }

  function extractErrorMsg(err){
    if(err.message != undefined) return err.message; // For unknown issues
    if(typeof err != "string" || err =="") return ("Unknown error:" + JSON.stringify(err));
    var errLines = err.split('\n');
    if (errLines.length == 1) return err.split("^")[1].substring(0);
    return errLines[errLines.length - 1]
  }
  switch (res.status) {
      case 'FAIL_SYNTAX':
          if(debug) console.log("batchEvaluate.mjs::evaluate() case 'FAIL_SYNTAX'");
          entry.file_verdict = "Error (Syntax)";
          entry.file_summary = res.error.split(':')[0] +  " Syntax issue: " + extractErrorMsg(res.error);
          //self.lastParserTip = JSON.stringify(res.message); // TODO make tool-tip later.
          break;
      case 'FAIL_EVAL':
      if(debug) console.log("batchEvaluate.mjs:evaluate()  case 'FAIL_EVAL'");
          entry.file_verdict = "Error (Eval)";
          entry.file_summary  = " Evaluation issue: " + extractErrorMsg(res.error);
          break;
      case 'OK':
         // entry corresponds to one gaFile and gives a summary
         // Each evaluation gets its own row:

         var guards = 0; // Totals
         var fails  = 0;
         var passes = 0;
         entry.eval_details = []; // one row for each guarded assertion in the file.
         let one_or_more_ga_not_activated = false;
         res.evaluation.forEach(ga =>{
            var res = ga.value;
            var row = {};

            row.name = ga.name

            if(ga.eval == false){
               row.ga_result = "Where clause prevented G/A to be evaluated";
               // This is normal and should not affect the verdict.
            }else {


              row.ga_result = "[" + res.times.valid.length +
                        " Guard Activations] [" + res.times.pass.length +
                        " passes ], and,  [" +
                        res.times.fail.length + " fails] ";
              if(res.times.valid.length == 0) {
                row.ga_result = "Guard never activated";
                one_or_more_ga_not_activated = true;
              }
              // file summary of activations passes and fails
              guards += res.times.valid.length;
              fails  += res.times.fail.length;
              passes += res.times.pass.length;
            }// where clause prevention


            if(false == include.includes("plots")){
                delete res.guards;
                delete res.assertions;
            }

            if(false == include.includes("siglist")){
                delete res.signals;
            }
            if(include.includes("result")){
             row.ga_evaluation = res;
            }
            entry.eval_details.push(row);
          })// for each ga

          entry.file_summary = "Grand total: [" + guards + " Guard Activations] [" + passes +
                          " passes ], and,  [" + fails + " fails] "

          // CURRENT evaluation policy aggregates the G/As (differs from web app)
          // gas_activated:ALL/SOME/NONE   independent on fail
          // Verdict:PASS  = fails == 0 and passes > 0
          // Verdict:FAIL, = fails > 0 and passes == 0
          // Verdict:INCONCLUSIVE = (coverage = NONE) or (both fails > 0 and passes > 0)

          entry.file_gas_activated = one_or_more_ga_not_activated ? "Some":"All";
          entry.file_verdict  = "----";
          if(guards == 0){
           entry.file_verdict  = "INCONCLUSIVE";
           entry.file_gas_activated = "None";
          }
          if(fails > 0){
             entry.file_verdict = (passes >0)?"INCONCLUSIVE":"FAIL";
          }//any ga failed.
          else if(fails == 0 && passes > 0){
             entry.file_verdict  = "PASS";
          }
          break;
      default:
          if(debug) console.log("batchEvaluate.mjs::evaluate() cannot handle evaluation " + JSON.stringify(res));
  }
  //console.log("BatchEval.vue: returning entry ",entry);
  return entry;
}

/*****************************************************************************
* MAIN
******************************************************************************/
prepareContext(config);
prepareGlobalDefinitions(config);
var ctx = EvalContext.getInstance();

if(debug) ctx.dumpToConsole()  // DEBUG to see what got loaded from the log file...

let total = [];

if (config.gaText){ // We are evaluating a simple expression.
    var res = evaluate(config.gaText,"NONE",config.include || [""]);
    console.log(JSON.stringify(res));
}
else { // We have a configuration file


config.gaFiles.forEach(gaFile =>{
  if(debug) console.log("-------------------------", gaFile);
  let src = fs.readFileSync(gaFile, 'utf8');
  let result =  evaluate(src,gaFile,config.include || [""]);
  total.push(result);
  if(debug)console.log(result);

})
 console.log(JSON.stringify(total));

}

//total.forEach(gaFile =>{
/*
{
             ---- First a summary for the gaFile as a whole form evaluation policy above.
   "showDetails": true,   <--- You should provide more info to the tester
   "class": "gaFailed",   <--- Classification from the evaluation policy above
   "progress": "FAIL",    <--- Overall verdict for this GA file (details on next line)
   "details": "Grand total: [6 Guard Activations] [5 passes ], and,  [9 fails] ",

 "rows": [   <-- For each G/A in the gaFile, this is the individual results
   {
     "name": "SR_C30_SRS_Safe-REQ-244",
     "result": "[6 Guard Activations] [5 passes ], and,  [9 fails] ",
     "class": "gaFailed"
     "guards":   <-- sub plots for the guard expressions. (optional)
     "assetions":<-- sub plots for the assertion expressions.(optional)
   }
 ]


*/
//})
