var express = require("express");
//requiring path and fs modules
const path = require('path');
const fs = require('fs');

const tears = require('../client/js/Tears.js');
const EvalContext = require('../client/js/EvalContext.js')
const FileFormats = require('../client/js/FileFormats.js');
const { strict } = require("assert");
const { totalmem } = require("os");


class LogCache{
    constructor(){
        let self = this;
        self.cache = {};
    }
    invalidate_cache(){
        // TODO: take away logfiles that has not been used since a while...
        let self = this;
        if(self.cache) self.cache = undefined;
    }
    get_signals(filepath){
        let self = this;
        let entry = self.cache[filepath];

        if(typeof(entry) === "undefined"){
            entry = {type:'signals',
                    signals:this._load_signal_log(filepath),
                    accessed:new Date().getTime() / 1000};
            self.cache[filepath] = entry;
        }
        return entry.signals;
    }
    _load_signal_log(filepath){
        console.log("Loading",filepath);
        let self = this;
        let data = fs.readFileSync(filepath, 'utf8');
        let formatter = FileFormats.getFormat(1);       // TODO We need to encode this in the filename some how. NOW BT CSV only
        let signals = formatter.load(data,filepath,true); 
        return signals;
    }
    preload_cache(pathdir){
        let self = this;
        var fileObjs = fs.readdirSync(pathdir, {withFileTypes:false});
        fileObjs.forEach(file => {
            if (file.includes("TXT") && file.includes("LOGDATA")){
                self.get_signals(`${pathdir}/${file}`);
            }
        });
    }
    list(){
        let self = this;
        return Object.keys(self.cache);
    }
}//class
class DynamicFileCache{
    constructor(){
        this.cache = {}
    }
    update_entry(filepath){
        let self = this;
        var gaText = fs.readFileSync(filepath, 'utf8');
        let mtime = fs.statSync(filepath).mtimeMs;
        let entry = {
            type:"ga-file",
            gaText:gaText,
            mtime:mtime
        }
        self.cache[filepath] = entry;
        return entry;
    }
    load_file(filepath){
      
        let self = this;
        //let mtime = fs.statSync(filepath).mtimeMs;

        let entry = self.cache[filepath];

        if( (typeof(entry) === "undefined") )//||
          //  (mtime > entry.mtime)               )
          {
            console.log("Cache entry missing or too old",filepath.split("/").pop());
                entry = this.update_entry(filepath)
        }
        
        return entry.gaText;
    }
    list(){
        let self = this;
        return Object.keys(self.cache);
    }
}


function evaluate( logfile, ga_file, main_defs,main_defs_src){
     var ts = new Date().getTime() / 1000;

     if (EvalContext.hasInstance(logfile)){
         EvalContext.setInstance(logfile);
     }
     else{
        console.log(`creating new context for ${logfile.split("/").pop()}`)
        EvalContext.setInstance(logfile);    
     
        var ctx = EvalContext.getInstance();
        signals = log_cache.get_signals(logfile);     
        ctx.forceUnitTestSignals(signals);;
        //ctx.updateShortNames();
        //ctx.updateRange();
            
        
        let defBlock =  {
                            content:main_defs_src,
                            fileName: main_defs,
                            active:true
                            }
        ctx.setDefaultDefinitionBlock(defBlock);

        let ignore_result = tears.evaluate_tears_expression("", false, true);
    }    
     var entry = {file_name:ga_file}
     let gaText = ga_cache.load_file(ga_file);
     var tctx = (new Date().getTime() / 1000) - ts;  
     let result = tears.evaluate_tears_expression(gaText, false, true);
      
     //console.log('batchEvaluate.mjs::evaluate() raw result ',JSON.stringify(result))
     
     function extractErrorMsg(err){
       if(err.message != undefined) return err.message; // For undefined issues
       if(typeof err != "string" || err =="") return ("undefined error:" + JSON.stringify(err));
       var errLines = err.split('\n');
       if (errLines.length == 1) return err.split("^")[1].substring(0);
       return errLines[errLines.length - 1]
     }
     switch (result.status) {
         case 'FAIL_SYNTAX':
             if(debug) console.log("batchEvaluate.mjs::evaluate() case 'FAIL_SYNTAX'");
             entry.file_verdict = "Error (Syntax)";
             entry.file_summary = result.error.split(':')[0] +  " Syntax issue: " + extractErrorMsg(result.error);
             //self.lastParserTip = JSON.stringify(res.message); // TODO make tool-tip later.
             break;
         case 'FAIL_EVAL':
             if(debug) console.log("batchEvaluate.mjs:evaluate()  case 'FAIL_EVAL'");
             entry.file_verdict = "Error (Eval)";
             entry.file_summary  = " Evaluation issue: " + extractErrorMsg(result.error);
             break;
         case 'OK':
            // entry corresponds to one gaFile and gives a summary
            result.evaluation.forEach(ga =>{
                 delete ga.value.guards;
                 delete ga.value.assertions;
                 delete ga.value.signals;
             });
             entry.eval = result;
             entry.time = (new Date().getTime()/1000)-ts;
             break;
         default:
             if(debug) console.log("batchEvaluate.mjs::evaluate() cannot handle evaluation " + JSON.stringify(result));
     }
    //console.log(`evaluate took total: ${entry.time} seconds of which ${100*tctx/entry.time}% for context switch `);
    return  entry
}

 /*
var evaluation_cache = {}       // Try first to linearly traverse it all the time

table_entry = {
    ready:false,                // if mtime is change for a G/A, we 
    ga_file:ga_file,            // full path to ga_file used
    log_file:log_file,          // full path to logfile used
    evaluation:result_entry,
    eval_time:eval_time,
    last_accessed : 0
}
// When evaluating :
// We have more logfiles than G/As ? 
*/

var clients = {}

var log_cache = new LogCache()
var default_main_definition_file = "/Users/dfm01/Dropbox/BTSAGA-Ind-Eval/Paper-Data/FlakedCurse/GA/main_definitions.ga" 
var default_main_definition_src  = fs.readFileSync(default_main_definition_file, 'utf8');
const basedir = '/Users/dfm01/Dropbox/BTSAGA-Ind-Eval/Paper-Data/FlakedCurse/logcache/Baseline_CX1'
var gadir='/Users/dfm01/Dropbox/BTSAGA-Ind-Eval/Paper-Data/FlakedCurse/GA/DRS_Mutation/GA'

const debug = true;
//test.load_directory()
 
var ga_cache = new DynamicFileCache()

var start_REST = false
if (start_REST){
var app = express();app.listen(3000, () => {
    console.log("Server running on port 3000");
   });
   
   var bodyParser = require('body-parser')
   app.use( bodyParser.json() );       // to support JSON-encoded bodies
   app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
     extended: true
   })); 
   
   //-------------------------------------------------------------------------
   //-------------------------------------------------------------------------

   app.post("/preload-caches", (req, res, next) => {
  
      var log_files = JSON.parse(req.body.log_files.replace(/\'/g,'"'));
      var ga_files = JSON.parse(req.body.ga_files.replace(/\'/g,'"'));
      default_main_definition_file = req.body.default_main_defs;
      default_main_definition_src  = fs.readFileSync(default_main_definition_file, 'utf8');
    // create worker... TODO
        log_files.forEach(log =>{
            log_cache.get_signals(log);
        });
        ga_files.forEach(ga =>{
            ga_cache.load_file(ga);
        });
        res.json("LOADED");
   });

    
   app.post("/evaluate", (req, res, next) => {
    
   /*
       logfile = absolute path to logfile, 
       ga_file = absolute path to ga-file
       main_defs = absolute path to main_definitions,
   */
   
       var logfile = req.body.logfile;
       var ga_file = req.body.ga_file;
       var main_defs = req.body.main_defs;
   
       entry = evaluate(logfile, ga_file, main_defs,fs.readFileSync(main_defs, 'utf8'));
       res.json(entry);
   });

   app.post("/evaluate-cache", (req, res, next) => {
         
        var log_files = log_cache.list();
        var ga_files = ga_cache.list();
        var ts
        var te
        console.log(`evaluate-cache:: Evaluating ${log_files.length} logfiles:`)
        var results = [];
        log_files.forEach(log_file =>{
            ts  = new Date().getTime()/1000;
            ga_files.forEach(ga_file => {
                entry = evaluate(log_file, ga_file, default_main_definition_file,default_main_definition_src);
                results.push({
                    ga_file:ga_file,
                    log_file:log_file,
                    evaluation:entry
                })
            })
            te = new Date().getTime()/1000;
            console.log(`Logfile ${log_file.split("/").pop()} took ${te - ts} second for ${ga_files.length} G/As` );

        })
        res.json(results);
    });
}
console.log("Hejsan")


var log_files = [] ;
var ga_files = [];
var fileObjs = fs.readdirSync(basedir, {withFileTypes:false});
fileObjs.forEach(file => {
    if (file.includes("TXT") && file.includes("LOGDATA")){
        log_files.push(`${basedir}/${file}`);
    }
});

fileObjs = fs.readdirSync(gadir, {withFileTypes:false});
fileObjs.forEach(file => {
    if (file.includes(".txt") ){
        ga_files.push(`${gadir}/${file}`);
    }
}); 
console.log(ga_files)
fs.readdir(gadir,(error,files) =>{
    ga_files = files;
})

var results = []
var individial_times = []
var ts
var te
var totalstart 
var totalend

totalstart = new Date().getTime()/1000;
log_files.forEach(log_file =>{
    ts  = new Date().getTime()/1000;
    ga_files.forEach(ga_file => {
        entry = evaluate(log_file, ga_file,
                         default_main_definition_file,
                         default_main_definition_src);
        results.push({
            ga_file:ga_file,
            log_file:log_file,
            evaluation:entry
        })
    })
    te = new Date().getTime()/1000;
    //console.log(`Logfile ${log_file.split("/").pop()} took ${te - ts} second for ${ga_files.length} G/As` );
    individial_times.push(te-ts);
})
totalend = new Date().getTime()/1000;
console.log(`${log_files.length} x${ga_files.length} took ${totalend - totalstart} `)

totalstart = new Date().getTime()/1000;
log_files.forEach(log_file =>{
    ts  = new Date().getTime()/1000;
    ga_files.forEach(ga_file => {
        entry = evaluate(log_file, ga_file,
                         default_main_definition_file,
                         default_main_definition_src);
        results.push({
            ga_file:ga_file,
            log_file:log_file,
            evaluation:entry
        })
    })
    te = new Date().getTime()/1000;
    //console.log(`Logfile ${log_file.split("/").pop()} took ${te - ts} second for ${ga_files.length} G/As` );
    individial_times.push(te-ts);
})
totalend = new Date().getTime()/1000;
console.log(`${log_files.length} x${ga_files.length} took ${totalend - totalstart} `)