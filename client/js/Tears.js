
const parser2 = require('./TearsParser2.js')
//import parser2 from "./TearsParser2.js"
const Util = require('./Util.js')
//import * as Util from './Util.js';
//import bus from "./EventBus.vue"

module.exports = {
  getUsedSignals(tearsExpr){ // tearsExpr only for compatibility with old TEARS.
    // Returns the set of signalnames of signals used in the expression
    // given the current evaluation context.
    var res = parser2.getUsedSignals();
    let s = new Set(res)
    return  s;
  },
  // TODO: Do not duplicate code for local.js. Brake out the code in this module and use in local.js....

  getParseTree(tearsExpr){
    // TODO: currently experimental!
    /*
    var match = parser2.match('tearsExpr');
    var toAST = require('../../ohm_git_clone/extras/semantics-toAST.js').toAST;
    return toAST(match);
  */
  },
  ////////////////////////////////////////////////////////////////////////////////////////
  ///   evaluate_tears_expression
  ////////////////////////////////////////////////////////////////////////////////////////
  evaluate_tears_expression(tearsExpr, includePlots = true, includeAllEvals = false){
    //console.log("Tears2.js::evaluate_tears_expression",tearsExpr);
    let  empty_evaluation = {"times": {}, "guards": [], "assertions": []};
    var matchResult = {succeeded:function(){return false;}};
    try{
       matchResult = parser2.match(tearsExpr);
       if (!matchResult.succeeded()) {
         //console.log("Tears2.js::evaluate_tears_expression",JSON.stringify( {status:'FAIL_SYNTAX',result:matchResult.message,evaluation:empty_evaluation}));
         return {status:'FAIL_SYNTAX',error:matchResult.message,evaluation:empty_evaluation};
       }
    }catch(error){
      // Usually this is due to a syntax error, so we treat it as such but log it on console.
      console.log("Tears2.js::evaluate_tears_expression MATCH threw exception " + JSON.stringify(matchResult.message));
      //console.trace();
      return {status:'FAIL_SYNTAX',error:error,evaluation:empty_evaluation};
    }

    if(true){   // Set this one to false when developing grammar support to get big crashes (revealing more info)
        // Now we have correct syntax, time to check semantics
        try{
            var res = parser2.eval(matchResult);
       }catch(error){
          console.error("Tears.js::evaluate_tears_expression Failed eval result: ",JSON.stringify( error), "for tearsExpr ",tearsExpr.split("\n")[0]);
          //console.log("Tears.js::evaluate_tears_expression",JSON.stringify( {status:'FAIL_EVAL',causes:error,evaluation:empty_evaluation}));
          return {status:'FAIL_EVAL',error:error,evaluation:empty_evaluation};
         }
    }else {
      var res = parser2.eval(matchResult);    // Crash if we get any exceptions so we can see in debugger what went wrong.
      console.log("Tears.js::evaluate_tears_expression Evaluation Result is ",JSON.stringify( res));
    }

   if(includeAllEvals == false){  //That is, we were called buy the GUI,
     let result = {"times": {}, "guards": [], "assertions": []};
     // Pick the last evaluated G/A.
     for(var i = res.length -1; i>=0; i--){
       if(res[i].eval){
         result = res[i].value;
         break;
       }
     }
      return {status:'OK',evaluation:result};
   }// Old GUI impl that only takes the last G/A TODO:FIX ME
   else{
     return {status:'OK',evaluation:res}; // New impl (BatchEval) should handle a list of G/As.
   }
  }
}
