
/*-------------------------------------------------------------------------------
    Evaluates a set of G/A files over one log file
    (since loading the log file is the most time consuming, we want to do 
     one process per log-file)


argumensts  :
gafiles = ["path1","path2"]
logfiles = 
---------------------------------------------------------------------------------*/


const fs          = require('fs');
const tears       = require('../client/js/Tears.js');
const EvalContext = require('../client/js/EvalContext.js')
const FileFormats = require('../client/js/FileFormats.js');
const { argv } = require('process');

//---------------------------------------------------------------------------------
//                            Parameters and Globals  
//---------------------------------------------------------------------------------
 
var debug = false;

//---------------------------------------------------------------------------------
//                             load_and_set_context  
//---------------------------------------------------------------------------------
function load_and_set_context( log_file,        // fullpath
                                main_defs,      // fullpath to main definitions file
                                log_format = 1,  // index from FileFormats.js
                                maindef_encoding='utf8', // Encoding for main defs
                                log_encoding = 'utf8' //... and logfile
                            ){
    let log_data = fs.readFileSync(log_file, log_encoding);
    let main_defs_src = fs.readFileSync(main_defs, maindef_encoding);    
    set_context(log_file,
                log_data,
                main_defs,
                main_defs_src,   
                log_format);
}
//---------------------------------------------------------------------------------
//                                  set_context  
//---------------------------------------------------------------------------------

function set_context(log_file = "auto",   // str, fullpath (for documentation)
                     log_data = "",       // str, contents of log file in log_format  
                     main_defs = "auto",  // str, fullpath (for documentation)
                     main_defs_src,       // str,contents of the main defs
                     log_format = 1,      // int, index from FileFormats.js
                         ){
    //var ts = new Date().getTime() / 1000;
    var ctx = EvalContext.getInstance();

    
    let formatter = FileFormats.getFormat(log_format);       // TODO We need to encode this in the filename some how. NOW BT CSV only
    let signals = formatter.load(log_data,log_file,true); 
        
    ctx.forceUnitTestSignals(signals);;
    ctx.updateShortNames();
    ctx.updateRange();                            
        
    let defBlock =  {
                        content:main_defs_src,
                        fileName: main_defs,
                        active:true
                        }
    ctx.setDefaultDefinitionBlock(defBlock);      
    //var tctx = (new Date().getTime() / 1000) - ts;  
}
//---------------------------------------------------------------------------------
//                            load_and evaluate    
//---------------------------------------------------------------------------------
function load_and_evaluate( log_file, ga_file){
    let ga_text = fs.readFileSync(ga_file, 'utf8');
    return evaluate( log_file,  
                     ga_file,   
                     ga_text   
                    );
}
//---------------------------------------------------------------------------------
//                                  evaluate    
//---------------------------------------------------------------------------------
function evaluate( log_file,  // logfile (for documentation)
                   ga_file,   // ga-file (for documentation)
                   ga_text    // ga file contents to evaluate over current context
                   ){
    var ts = new Date().getTime() / 1000;

    let result = tears.evaluate_tears_expression(ga_text, false, true);

    //console.error('batchEvaluate.mjs::evaluate() raw result ',JSON.stringify(result))
     
     function _extractErrorMsg(err){
       if(err.message != undefined) return err.message; // For undefined issues
       if(typeof err != "string" || err =="") return ("undefined error:" + JSON.stringify(err));
       var errLines = err.split('\n');
       if (errLines.length == 1) return err.split("^")[1].substring(0);
       return errLines[errLines.length - 1]
     }
     let entry =  {
                    ga_file:ga_file.split('/').pop(),
                    log_file:log_file.split('/').pop(),
                    status:result.status
                    }

     switch (result.status) {
         case 'FAIL_SYNTAX':
             entry.err_msg = result.error.split(':')[0] +  " Syntax issue: " + _extractErrorMsg(result.error);
             break;
         case 'FAIL_EVAL':
             entry.err_msg  = " Evaluation issue: " + _extractErrorMsg(result.error);
             break;
         case 'OK':
            // entry corresponds to one gaFile and contains potentially several G/As
            // Lets repack this from the old format (used in the SAGA Tool) to something fresh and useful:
            entry.gas = [];
            result.evaluation.forEach(ga =>{
                 entry.gas.push({
                     where:ga.eval,        // if the where clause evaluated to false, the G/A is not evaluated (this field == false)
                     name    : ga.name,
                     signals : ga.value.signals,    // skip the extra value level, move up interesting info and 
                     guards  : ga.value.times.valid, // give them useful names.
                     passes  : ga.value.times.pass,
                     fails   : ga.value.times.fail
                 });
             });
             break;
         default:
             if(debug) console.log("batchEvaluate.mjs::evaluate() cannot handle evaluation " + JSON.stringify(result));
             entry.err_msg = "Unknown result status, cannot handle evaluation " + JSON.stringify(result);
             
          entry.time = (new Date().getTime()/1000)-ts;
     }
    //console.log(`evaluate took total: ${entry.time} seconds of which ${100*tctx/entry.time}% for context switch `);
    return  entry
}
//---------------------------------------------------------------------------------
// ----------------------------------   "main" ------------------------------------
// IFF run from commandline:
// ga_files = [fname,fname]
// log_file =  fullpath
// main_defs = fullpath
// debug = true / false   (opt)
//---------------------------------------------------------------------------------
/*

*/

if (require.main === module) {
    var args = {}
    
    argv.forEach(arg =>{
        if(false == arg.includes("=")) return;
        a = arg.split("=");
        args[a[0]] = a[1]
    })
    var ga_files = args['ga_files']
    //console.log("ga_files argument:",ga_files)
    if(ga_files){
        ga_files = JSON.parse(ga_files) 
    }
    var log_file = args['log_file']
    var main_defs = args['main_defs']
    
    /*
    console.log("--------------------------------------------------------")
    console.log("ga_files=");
    ga_files.forEach(f => console.log(f));
    console.log("log_file=", log_file);
    console.log("main_defs=", main_defs);
    console.log("--------------------------------------------------------")
    */
   
    var results = []
    var ts
    var te
    var main_defs
    var main_defs_src
    ts  = new Date().getTime()/1000;

    load_and_set_context( log_file, main_defs,main_defs_src)
        ga_files.forEach(ga_file => {
            let res = load_and_evaluate(log_file, ga_file);
            results.push(res);
        
    })
    te = new Date().getTime()/1000;

    console.log(JSON.stringify(results))
}//main (if not used in script)

//---------------------------------------------------------------------------------
//                                  EXPORTS     
//---------------------------------------------------------------------------------

exports.load_and_set_context = load_and_set_context;
exports.set_context = set_context;
exports.load_and_evaluate = load_and_evaluate;
exports.evaluate = evaluate;

