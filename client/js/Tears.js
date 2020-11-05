  import * as EvalContext from './EvalContext.js';
import parser from "./TearsParser.js"
import * as Util from './Util.js';
//import bus from "./EventBus.vue"
const Expressions = require('./Expressions.js');

function   extractPlottableExpressions(exprCollection) {
      var plottableExpressions = [];
      if (exprCollection !== undefined) {
          for (let expr of exprCollection.getPlottableExpressions()) {
              let validTimes = expr.getValidTimes();
       var timelines = [];
       var values = [];
       var shortnames = [];
       for (var i = 1, j = 0; j < expr.getNumPlots(); i++, j++) {
            timelines.push(expr.getTimestamps(i));
            values.push(expr.getValues(i));
            shortnames.push(expr.getShortName(i));
        }
        plottableExpressions.push({
                  "exprStr": expr.getExprStr(),
                  "shortnames": shortnames,
                  "numPlots": expr.getNumPlots(),
                  "timelines": timelines,
                  "values": values,
                  "lhs": expr.getLhs(),
                  "rhs": expr.getRhs(),
                  "valid": (validTimes !== undefined) ? validTimes : []
              });
          }
      }
      return plottableExpressions;
  }
     // Extracts all values from a parse tree that may be a signal name
function    listSignals(parseTree,ctx){
      if (parseTree == undefined) return
      let retVal = []
      for (let key in parseTree){
        //console.log("Found Key",key);
        if (typeof parseTree[key] == 'object'){
          retVal = retVal.concat(listSignals(parseTree[key],ctx));
        }else {
          let val = parseTree[key]
          if(!Util.isIn(val, ['==','>','<']) &&
             !Util.isNumber(val) &&
             ctx.isSignal(val))
             retVal.push(val);
        }
      }
      return retVal;
    }
module.exports = {
  getUsedSignals(tearsExpr){
    // Returns the set of signalnames of signals used in the expression
    // given the current evaluation context.
    var res = this.getParseTree(tearsExpr);

    if (res.status !='MATCHED_OK') return undefined;
    let parseTree  = res.result;
    res = listSignals(JSON.parse(parseTree), EvalContext.getInstance());
    let s = new Set(res)

    return  s;
  },
  // TODO: Do not duplicate code for local.js. Brake out the code in this module and use in local.js....
  getParseTree(tearsExpr){

    // remove block comments
    tearsExpr = tearsExpr.replace(/\s*\/\/.*\n/g, '\n').replace(/\/\*.*?\*\//g,"").replace(/\s*\/\*[\s\S]*?(\*\/|$)/g, '\n');
    let  empty_evaluation = {"times": {}, "guards": [], "assertions": []};
    // Check bare syntax
    var matchResult = {succeeded:function(){return false;}};
    try{

       matchResult = parser.match(tearsExpr);
       if (!matchResult.succeeded()) {
         //console.groupEnd();
         return {status:'FAIL_SYNTAX',result:matchResult.message,evaluation:empty_evaluation};
       }
    }catch(error){
      // Usually this is due to a syntax error, so we treat it as such but log it on console.
      //console.log("Tears.js::evaluate_tears_expression parser.match threw exception " + JSON.stringify(error));
      //console.trace();
      return {status:'FAIL_SYNTAX',result:matchResult.message,evaluation:empty_evaluation};
    }
    return {status:'MATCHED_OK',result:parser.getParseTree(matchResult)};
  },

  ////////////////////////////////////////////////////////////////////////////////////////
  ///   evaluate_tears_expression
  ////////////////////////////////////////////////////////////////////////////////////////
  evaluate_tears_expression(tearsExpr, includePlots = true){

    //console.group("Tears.js::evaluate_tears_expression")
    let evalContext = EvalContext.getInstance();

    evalContext.resetConstsAndAliases()
    let  empty_evaluation = {"times": {}, "guards": [], "assertions": []};
    //console.log("Evaluating [", tearsExpr, "]  Context: (#signals)" ,evalContext.signals.length);


    /*
    // remove block comments
    tearsExpr = tearsExpr.replace(/\s*\/\/.*\n/g, '\n').replace(/\/\*.*?\*\//g,"").replace(/\s*\/\*[\s\S]*?(\*\/|$)/g, '\n');
    let  empty_evaluation = {"times": {}, "guards": [], "assertions": []};
    // Check bare syntax
    var matchResult = {succeeded:function(){return false;}};
    try{

       matchResult = parser.match(tearsExpr);
       if (!matchResult.succeeded()) {
         console.groupEnd();
         return {status:'FAIL_SYNTAX',result:matchResult.message,evaluation:empty_evaluation};
       }
    }catch(error){
      // Usually this is due to a syntax error, so we treat it as such but log it on console.
       console.log("Tears.js::evaluate_tears_expression parser.match threw exception " + JSON.stringify(error));
      //console.trace();
      return {status:'FAIL_SYNTAX',result:matchResult.message,evaluation:empty_evaluation};
    }

    */
    var res = this.getParseTree(tearsExpr);

    if (res.status !='MATCHED_OK') return res;
    // Now we have correct syntax, time to check semantics
    let parseTree = res.result;

    console.log("Tears.js::evaluate_tears_expression resulting parse tree: ", parseTree);

    if (!evalContext.isValid()){
      //console.groupEnd();
      return {status:'FAIL_EVAL',causes:[],evaluation:empty_evaluation};
    }
    var rootExpr = new Expressions.RootExpression(JSON.parse(parseTree));


    // Add consts in expression to event bus
    var consts = rootExpr.getConsts();
    //console.log("Tears.js::evaluate_tears_expression current consts " , consts);
    if (consts.length > 0) {
        var _consts = [];
        for(let c of consts) {
            _consts.push(rootExpr.getConstIfExists(c));
            //console.log("Tears.js::evaluate_tears_expression getting const ", rootExpr.getConstIfExists(c));

        }
        //console.log("Tears.js::evaluate_tears_expression setting consts to ", _consts);
        evalContext.setConsts(_consts);
    }
    else {
        evalContext.setConsts([]);
    }
    // add aliases to EventBus,
    var aliases = rootExpr.getAliases();
    //console.log("Tears.js::evaluate_tears_expression current aliases in ROOT " ,aliases);

    if (aliases.length > 0) {
        var a = [];
        for(let alias of aliases) {
            a.push(rootExpr.getAliasIfExists(alias));
          //  console.log("Tears.js::evaluate_tears_expression pushing alias " ,rootExpr.getAliasIfExists(alias));
        }
        //console.log("Tears.js::evaluate_tears_expression setting consts to ", a);
        evalContext.setAliases(a);
    }
    else {
        evalContext.setAliases([]);
    }
    //evalContext.dumpToConsole();
    if (!rootExpr.isValid()){
        let causes = rootExpr.getInvalidityCauses();
        //console.log("Tears.js::evaluate_tears_expression expression is invalid " + JSON.stringify(causes));
        //console.groupEnd();
        return {status:'FAIL_EVAL',causes:causes,evaluation:empty_evaluation};
    }

   rootExpr.evaluate();
   let result = {"times": {}, "guards": [], "assertions": []};
   result.times.valid = rootExpr.getValidTimes();
   result.times.pass = rootExpr.getPassTimes();
   result.times.fail = rootExpr.getFailTimes();

   if(includePlots == true){
        result.guards = extractPlottableExpressions(rootExpr.getGuard());
        result.assertions = extractPlottableExpressions(rootExpr.getAssertion());
   }
   //console.log("Tears.js::evaluate_tears_expression expression valid ", JSON.stringify(result));
   //console.groupEnd();
   return {status:'OK',evaluation:result};

  }
}
