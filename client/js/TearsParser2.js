// The ohm-grammar file needs to be loaded differently, depending on whether
// this is run from a command terminal or in a browser
//var contents = require('../assets/tears2_grammar.ohm');
const EvalContext = require('./EvalContext.js');
const Util = require('./Util.js');
const operators = require('./Operators.js');
//import * as EvalContext from './EvalContext.js';
//import * as Util from './Util.js';
//import * as operators from './Operators.js';
if (typeof window === 'undefined') {
    const fs = require('fs');
    var contents = fs.readFileSync(__dirname + '/../assets/tears2_grammar.ohm');

} else {
    var contents = require('../assets/tears2_grammar.ohm');

}

//const ohm = require('../assets/ohm.min.js');

const ohm = require('ohm-js');
const grammar2 = ohm.grammar(contents);
const semantics2 = createSemantics();

function evalOptional(node, defVal){
  if(node.children.length >0){
    return node.children[0].eval();
  }
  else {
    if(typeof defVal !== 'undefined')   // TODO: not sure you can pass undefined to function?
      return defVal;
    else
      return undefined;

  }
}//evalOptional

function leftTrunc(eventsOrIntervals,  t){
  /**
      E = [ e1,e2,..,en] => [e] : e < t for all e in E
      R = [[r1s,r1e],...[rns,rne]] =>
          All intervals ending after t
          remaining intervals are adjusted to start at t if it begins earlier.
  **/
  // See leftTrunc...
  if(eventsOrIntervals.lenght == 0)
    return eventsOrIntervals

  if(Array.isArray(eventsOrIntervals[0])){  // Intervals
    eventsOrIntervals = eventsOrIntervals.filter(e => e[1] > t)
    eventsOrIntervals = eventsOrIntervals.map(e => [Math.max(t,e[0]),e[1]]);
  }
  else { // Are Events
    eventsOrIntervals = eventsOrIntervals.filter(e => e > t)
  }
    //console.log("Resulting intervals ",JSON.stringify(eventsOrIntervals));
    return eventsOrIntervals;
}

function rightTrunc(eventsOrIntervals,  t){
  // See leftTrunc...
  if(eventsOrIntervals.lenght == 0)
    return eventsOrIntervals

  if(Array.isArray(eventsOrIntervals[0])){  // Intervals
    eventsOrIntervals = eventsOrIntervals.filter(e => e[0] < t)
    eventsOrIntervals = eventsOrIntervals.map(e => [e[0], Math.min(t,e[1])]);
  }
  else { // Are Events
    eventsOrIntervals = eventsOrIntervals.filter(e => e < t)
  }
    //console.log("Resulting intervals ",JSON.stringify(eventsOrIntervals));
    return eventsOrIntervals;
}

// TODO: Remove comments from arguments and stuff.
function formatPlotArg(s){
  return  s.split("//")[0];
}
function formatPlotLabel(s){
  return  s.split("//")[0].substring(0,15)
}
/*---------------------------------------------------
                intervalsToSignal
----------------------------------------------------*/
// Converts Intervals to a Binary Signal representation
// where 1 represents true and 0 false. 
// The signal starts in 0 and ends in xmax.
// The intervals must be in-order and non-adjacent
// FIXME: order the intervals and solve adjancy problems.

function intervalsToSignal(S){
   
  var xmax = EvalContext.getInstance().getXmax()
  var xAxis =[]
  var values = [];

  if(S.lenght == 0){ // empty Intervals
    return{xAxis:[0,max],values:[0,0]};
  }
  if(S[0][0] > 0){          // if first start is right of origo, add origo
    // Push in an extra point at 0,0
    xAxis.push(0);
    values.push(0);
}
  for (var i = 0; i < S.length; i++){
   
    xAxis.push(S[i][0]); 
    values.push(1);        // Start is high
   
    xAxis.push(S[i][1]); 
    values.push(0);        // end is Low
  }
  // Since an interval always end in 0 we
  // can safely add a point at the end to get
  // stretch it over the whole available time-line
  // NOTE: live-view may be affected if xmax is not adjusted
  // each update. TODO:Investigate this further!
  if(xAxis[xAxis.length -1] < xmax){
    xAxis.push(xmax); // end is Low
    values.push(0);  
  }


  //console.log("intervalsToSignal",S,S[0][0]>0,{xAxis:xAxis,values:values})
  //console.trace() 
  return{xAxis:xAxis,values:values};
} // intervalsToSignal


/*-------------------------------------------------------------------------
  Constants | Defs | Aliases
    deftype:
    type: Float (later possibly other types | Timeout | Events]
    identifier:
    value:
*/
var constDefAlias = [];  //TODO move into moduleContext for better structure?
function resolveAliases(expectedType, node, ret_undef = false){

  // expectedType - Written in the error message if type is wrong or node undefined
  // node - the OHM node (identifier)
  // ret_undef - Normally, an exception is thrown if the alias cannot be winded back
  // to a const or def. However, signals need to have the last resolved identifier.

  var res = {deftype:'alias',value:node};
  var recursionLevels = [];
  while (res.deftype === 'alias'){
    //console.log("resolveAliases top in while, processing res: ",res)
      // The eval function unfortunately has its own expectations on the data type.
      // if OHM expects e.g. Boolean, It will give an exception if the node
      // cannot be evaluated as a Boolean.
      res = res.value.eval();
      recursionLevels.push(res);
      res = getConstDefAlias(res);

      if (typeof res === 'undefined'){
        if(ret_undef){   // identifiers are typically undefined as aliases so let caller lookup.
           res = recursionLevels.pop()
           //console.log("getConstDefAlias finally resolved to identifier: ", res);
           return res  ; // Alias chain has reached the bottom so return last successful lookup!
         }
        throw(errLocationFromNode(node) +
         ' ^' + expectedType + ' definition expected, but identifier "'  + recursionLevels.pop() +
         '" is not defined as ' + expectedType + ".");
      }
      if (recursionLevels.length > 15){
        var evals ="";
        recursionLevels.forEach(s => evals += "->" + s);
        throw(errLocationFromNode(node) +
         ' ^'  + recursionLevels.pop() +
         ' seems to be a recursive definition:' + evals + "...");
      }
   }
  var evalChain  = "";
  recursionLevels.forEach(s => evalChain += "->" + s);
  res = {culprit: evalChain.substring(2), // If somethings goes wrong this is the culprit chain.
          value:res
         }
  //console.log("resolveAliases evaluated the value of the alias to: ",res)

  return res;
}//resolveAliases

function getConstDefAlias(identifier){
  var res = undefined;
  /* TODO: FIXME after paper deadline
  // Built in constants
  if (identifier.toLowerCase == "logstart"){
      let xmin = EvalContext.getInstance().getXmin()
      return  {deftype:'const', // keep old aliases for debug purposes.
                type:'Timeout',
                identifier:identifier, //preserve users case (aA)
                value:xmin
               };
  }
  if (identifier.toLowerCase == "logend"){
    debugger;
    let xmax = EvalContext.getInstance().getXmax()
    return  {deftype:'const', // keep old aliases for debug purposes.
              type:'Timeout',
              identifier:identifier, //preserve users case (aA)
              value:xmin
             };
  }*/
  for(var i=0;i <constDefAlias.length;i++){
      if (constDefAlias[i].identifier === identifier){
        //console.log("getConstDefAlias::Found", constDefAlias[i] );
        return constDefAlias[i];
      }
  }//for
  return res;
}//getConstDefAlias

function addConstDefAlias(deftype,type,identifier,value){
  if(identifier.toLowerCase() === 'logstart' ||
     identifier.toLowerCase() === 'logend') {
        throw(' ^Identifier "' + identifier +
        '" is reserved as a default constant:');
     }
    
  if (getConstDefAlias(identifier) == undefined || deftype == 'alias'){   // an alias can be redefined to mimic function calls.

    constDefAlias.unshift({deftype:deftype, // keep old aliases for debug purposes.
                 type:type,
                 identifier:identifier,
                 value:value
                });
  }else {
    throw(' ^Identifier "' + identifier +
           '" is already in use:');
  }
}//addConstDefAlias
/*-------------------------------------------------------------------*/

var compare = {
  '<': function(left, right) { return left < right; },
  '>': function(left, right) { return left > right; },
  '==': function(left, right) { return left == right; },
  '<=': function(left, right) { return left <= right; },
  '>=': function(left, right) { return left >= right; },
  '!=': function(left, right) { return left != right; },
};

function filter_pulse_width(S,comp,limit){
  var ret = [];
  if (S != undefined)
    ret =  S.filter(e => compare[comp](e[1] - e[0], limit));
  /*
  var ret = [];
  var len = S.length;

  for (var i=0;i<len;i++){
    if( compare[comp](S[i][1] - S[i][0], limit)){
      ret.push(S[i]);
    }
  }*/
  return ret;
} //filter_pulse_width

function createCommonTimeLine(T1, T2) {

  // The old impl interpolated timelines over the whole log which is
  // wrong, since we cannot project non existing samples onto it anyway.

  if(T1.length == 0 || T2.length == 0 ) return [];

  let timeline = T1.concat(T2);
  timeline.sort(function(a, b) {
    return a - b;
  });
  // Trim left and right (only keep common timestamps)
  var tline = [];
  timeline.forEach(t =>{
    if((t >= T1[0] && t <= T1[T1.length - 1])&&
       (t >= T2[0] && t <= T2[T2.length - 1])){
         tline.push(t);
       }
  });

  // Remove duplicates
  for (var i = 1; i < tline.length; i++)
  {
    if (tline[i-1] === tline[i]) {
      tline.splice(i, 1);
    }
  }
  return tline;
}//createCommonTimeLine.
function createCommonTimeLines_unitTest(){

  var res = createCommonTimeLine([1,4,10,19,100], [2,4,5,20,150]);
  console.log("TearsParser2::createCommonTimeLines_unitTest",res)
}
function resample_signal(S,P){
  // The signal S is sampled at the points P.
 // The signals are already sampled at discrete points in time
 // given a signal as XY ( X = x-axis, Y = values)
 // resampling here means for each p in P:
 // a) pick Y[i]    -- there exists an i such that X[i] == p
 // b) pick Y[i -1] -- there exists an i such that i < len(Y) and
 //                     X[i -1] < p < X[i]
 // all points p : X[max] < p < X[0] are ignored.


 var res  = [];
 // project one value for each point in P.
 //                  o_______
 //         o________|         |
 //         |                  |
 //S=   o----                  o --------------o
 //PC=x   x  x      x x    x    x             x
 var j = 0;

 for (var i = 0; i < P.length; i++) {
   if(P[i] < S.xAxis[0]) continue; // Skip point left of S

   // Find the point closest to the right of p.
   while(j < S.xAxis.length && S.xAxis[j] < P[i]){j++;}

   if(j >= S.xAxis.length) break; // Skip points right of S.

   if(S.xAxis[j] == P[i]){
       res.push(S.values[j]);
   }
   else {
       res.push(S.values[j - 1]);
   }
 }//for each P

  return res;
} // resample_signal
function resample_signal_unitTest(){
  // S= signal, P is timeline for new samples.
var S = {values:     [0,  5, -3,  9,  -3,  15,   0],
         xAxis :     [0, 20, 60, 80, 110, 130, 260]}
var P = [];

    P.push({S  :S,
            P  : [],
            exp: []}); // Edge case
    
    P.push({S  :[],
      P  :     [1, 10, 20, 55, 61, 100, 131, 261],
      exp:       []}); // Edge case.

    P.push({S  :S,
            P  :     [1, 10, 20, 55, 61, 100, 131, 261],
            exp:       [0  ,0,  5,  5,   -3,  9, 15,]}); // Last point should have been cut off.

    P.push({S  :S,
            P  :    [-1, 5, 21, 68, 131, 250],
            exp:        [0,  5, -3,  15, 15]});

    P.push({S  :S,
            P  :[-10,0, 0, 21, 68, 130, 260, 290],
            exp:    [0, 0,  5, -3,  15,   0]});


  /*
  var S = {values:      [0, 0, 15, 16, 30],
           xAxis :      [0, 2,  0,  1,  0]}

           P.push({S  :S,
                   P  :[-10,0, 0, 21, 68, 130, 260, 290],
                   exp:    [0, 0,  5, -3,  15,   0]});
*/
P.forEach(test => {
  var res = resample_signal(test.S,test.P);
  var pass = true;
  if(res.length == test.exp.length){
  for (var i = 0; i < res.length; i++) {
    if(res[i] != test.exp[i]){
      pass = false;
      break;}
  }
  }else {
  pass = false;
  }
  if(pass){
    console.log("TearsParser2.js::resample_signal UnitTest [Passed] ");

  }else {
    console.error("TearsParser2.js::resample_signal UnitTest [Failed]      v  S = ",JSON.stringify(S.values));
    console.error("TearsParser2.js::resample_signal UnitTest               x  S = ",JSON.stringify(S.xAxis));
    console.error("TearsParser2.js::resample_signal UnitTest                 P = ",JSON.stringify(test.P));

    console.error("TearsParser2.js::resample_signal UnitTest            result = ",JSON.stringify(res));
    console.error("TearsParser2.js::resample_signal UnitTest   expected result = ",JSON.stringify(test.exp));
  }
  console.log("TearsParser2.js::resample_signal UnitTest ------------------------------- ");

});

}
function complement(S){
  //console.log("COMPLEMENT GETS",JSON.stringify(S));

   // TODO!  This is actually not true, the complement should end before the last
   //        interval starts.
  let logMax = EvalContext.getInstance().getXmax();
  let logMin = EvalContext.getInstance().getXmin();

  if (typeof S === 'undefined' || S.length == 0){
    return [[0,logMax]];
  }

  var comp = []
  var start = logMin; // -Number.MAX_VALUE;

  for(var i = 0; i < S.length;i++){
    var s = S[i];
    comp.push([start,s[0]]);
    start = s[1];
  }
  if(start < logMax){
    comp.push([start,logMax]);
    if(comp[0][1]<=0){  // If first interval ends left of origo, skip it. TODO: Should they not all be dropped if left of origo?
      comp.shift();
    }
  }
  return comp;
}

function events_and_intervals(P,S){
    // P = event series
    // S = Interval series
    // Keep all points in P that occurs within an interval s in S
    var ip = 0;
    var Pret = []
    if(!(Array.isArray(P) && Array.isArray(S))){
      throw "^Internal error, TearsParser2.js::events_and_intervals(P,S) "+
              "argument is not an array!";}
    S.forEach(s =>{
      while(ip < P.length && P[ip] <= s[0]){ ip++} // wind to next interval
      while(ip < P.length && P[ip]<= s[1]) {
        Pret.push(P[ip]);
        ip++
     }
   })// for each interval.
   return Pret;
} //events_and_intervals

function events_or_events(events1, events2) {  // from Operators.js
  var joinedEvents = events1.concat(events2);
  joinedEvents.sort(function(a, b) {
      return a - b;
  });
  var uniqueJoinedEvents = joinedEvents.filter(function(event, index) {
    return joinedEvents.indexOf(event) === index;
  });
  return uniqueJoinedEvents;
} //events_or_events

function intervals_and_intervals(S1,S2){

operations.and(S1,S2);

}

function partition_events_by_intervals(P,S){
  // Returns:
  // Array with S.length indices. Each index contains
  // a copy of all events in P that matches that partition together with
  // the index of the event in P.
  // partitions = s.start < p <= s.end :p in P for all s in S.
  // NOTE!
  // an event p may occur in several s in S if they overlap.

 //console.log("TearsParser2.js::partition_events_by_intervals(P,S) IN ",P,S);
  var ip = 0;
  var partitions = [];
  let len = S.length;

  for(var is = 0 ; is < len; is++) {      // One partition for each interval in S
    var s = S[is];
    var part = [];
    var begin = s[0];
    var end = s[1];
    // Skip all events before start of period:
    while (ip < P.length && P[ip] <= begin) {
      ip++;
    }
    // Include all events upp until end of period.
    while (ip < P.length  && P[ip] <= end) {
        part.push([P[ip],ip]); // meaning [p,index of p in P]
        ip++;
    }
    partitions.push(part);
  }//for
//  console.log("TearsParser2.js::partition_events_by_intervals RETURNS ",JSON.stringify(partitions));
  return partitions;

}//partition
function unit_test_partitioner(){
  var P = [1,5,10,15,20,25,30];
  var S = [[2,5],[3,10],[4,10],[10,20]]
  var res = partition_events_by_intervals(P,S);
  console.log("UNIT TEST partition_events_by_intervals",res);
}


function create_within_intervals_from_events(P,tw){
  //console.log("TearsParser2::create_within_intervals_from_events ",JSON.stringify(P),tw);
  var S = [];
  P.forEach(p => {
    S.push([p , p + tw]);
  });
  return S;
}// create within int...

function create_within_intervals_from_intervals(S,tw){
  var Sret = [];
  for(var i = 0 ; i < S.lenght; i++){
    S.push([S[i][0] , S[i][0] + tw]);
  }
  return Sret;
}// create within int...


// currentTimeBase
// This variable is used for storing time base information
// controlling the for within modifiers for Intervals
// during the evaluation.
// Guard evaluation --> currentGA = undefined, ??  tw  = tw
//                      within is not used.
// Assertion eval   --> for starts at each g in G
//                      within relates to each g and possible for in G
// Sequence  eval   --> for starts at p in left in the expr left -> right
//                      within relates to each left in the expr left -> right.
//
// sequences evaluated in the Guard

// sequences evaluated in the Assertions

var moduleContext = {};
function reset_moduleContext(){
  moduleContext = {
    currentGiven:undefined, // IFF the given then when syntax is used, this is the extra Interval Expression of the guard
    currentGA:undefined,   // Timebase for sub sequent expressions (assert and seq)
    usedSignals: [],       // All signal requests are collected during evaluation.
    lastMainDef:null      // Last succeeded evaluation of the main definition block
  };
}
reset_moduleContext();

function getLastMainBlockEvaluation(){
    if (moduleContext.lastMainDef)
      return moduleContext.lastMainDef
    else
      return null
}
function setLastMainBlockEvaluation(evaluation){
    moduleContext.lastMainDef = evaluation ;
}


function within_for(G,A,tw,tf){
  //console.log("TearsParser2::within_for IN (G,A,tw,tf)",
  //              JSON.stringify({G:G,A:A,tw:tw,tf:tf}));
  // TODO: This code does not comply to the Paper
  //       The problem is overlapping within-periods that give duplicate
  //       accepted asssertion intervals.
  var Ppass =[];
  var Pfail =[];
  var ia = 0; // index for assertion periods:
  for (var i =0; i < G.length; i++){
    var g = G[i];
      // wind assertions forward as long as they end before the current g
      while (ia < A.length && A[ia][1]< G[i]){ia++}
      if(ia >=A.length){
        // no more assertions can apply.
        // this and all coming g:s will fail at g + tw + tf
        while(i < G.length){
          Pfail.push(G[i] + tw + tf);
          i++
        }
         break; // we are finished.
      }//out of A:s

      // current A is at least within the guard + tw period.
      var a_start = A[ia][0];
      var a_end   = A[ia][1];
      var startingWithin = a_start <= g + tw;
      var longEnough     = a_end >= Math.max(a_start,g) + tf;
      //console.log("Processing G:         " + G[i]);
      //console.log("A[ia]=                " + JSON.stringify(A[ia]));
      //console.log("Processing in time :  " + startingWithin);
      //console.log("Processing longEnough:" + longEnough);

      if  (startingWithin && longEnough){
             Ppass.push(Math.max(a_start,g) + tf);
           }
      else {
        // To be sure, we neeed to check next ia
        if(ia < A.length - 1){
          var a_start = A[ia + 1][0];
          var a_end   = A[ia + 1 ][1];
          var startingWithin = a_start <= g + tw;
          var longEnough     = a_end >= Math.max(a_start,g) + tf;
          if  (startingWithin && longEnough){
                 Ppass.push(Math.max(a_start,g) + tf);
          }
          else {
            Pfail.push(g + tw); // DISCUSS: + tf ?
          }
        }
        else {
          Pfail.push(g + tw); // DISCUSS: + tf ?
        }
      }
  }//for each g in G
  //console.log("TearsParser2::within_for OUT (G,A,tw,tf)",
  //                JSON.stringify({pass:Ppass,fail:Pfail}));

  return {pass:Ppass,fail:Pfail};
}//within_for

function interval_for(S,tf){
  //console.log("interval_for IN ",JSON.stringify(S),tf,moduleContext.currentGA);
  // Converts Intervals to events

      if(moduleContext.currentGA == undefined){
        // Converts Intervals to events:
        // For each s in S that is >= tf long
        // emit an event at s[start] + tf
        var P = [];
        for(var i = 0;i<S.length;i++){
          var s = S[i];
          var p = s[0] + tf;
          if (p <= s[1]){
            P.push(p);
          }
        }// for
        return P;
    }else{
        // In the assertion however, we have a timebase in G
        // For each s in S that is >= tf long
        // emit an event at s[start] + tf
        var P = [];
        // Partition G over all intervals in S
        // Then for each guard, we can see if there is an
        // sub interval that is long enough from g, s_end
        // However, we must also take the current within timeout
        // into consideration, if any.
        var tw = 0;
        if(moduleContext.currentGA.tw != undefined){
          tw = moduleContext.currentGA.tw;
        }
        var res = within_for(moduleContext.currentGA.G,S,tw,tf);
        // we only care about the pass information.
        return res.pass;
    }// assertion

}// intervals for tf --> events

function evaluate_relative_to_P(eventsExpression_E, timebase_P){
  // Since e.g for expressions are dependent on the context,
  // we need to set the global time base before evaluating the expression.
  // Typically done when evaluating transitions in a sequence, where
  // The timebase "moves" from sequence node to sequence node.
  var currentGA_stash = undefined;
  if(moduleContext.currentGA != undefined){
      var currentGA_stash = moduleContext.currentGA;
  }
  moduleContext.currentGA = {G:timebase_P,    // We are not interested in using
               tw:Number.MAX_VALUE};          // within (means end of sequence).

  var Pv = eventsExpression_E.eval();

  if(moduleContext.currentGA_stash != undefined){
    moduleContext.currentGA = currentGA_stash;
  }
  else {
    moduleContext.currentGA = undefined;
  }
  return Pv;
}
function  evaluate_transition(E0str,Pv0,T0,E1,t1){
  /*
      Evaluates Pv0 -> E1 within t1
      T0 is the trace array where each element is a complete trace from
      the first node in a sequence.

      USE CASE 1:                       // NOT YET USED
      when A shall B within timeout
      Pv0 = A
      T0  = P_to_T(A)
      E1 = B  (not yet evaluated)
      t1 = timeout
      res = evaluate_transition(Pv0,T0,E1,t1)

      USE CASE 2:
      Pv0 -> E1 within t1

  */
var traceSeq = false;
if(traceSeq){
  console.group("TearsParser2.js::evaluate_transition IN:");
  console.log("                           Pv0=", JSON.stringify(Pv0));
  console.log("                           T0=", JSON.stringify(T0));
}
  var fails = [];
  var plots = undefined;                         // Sub-Expression plots for E1

  var Pv1E  = evaluate_relative_to_P(E1,Pv0);
  var Pv1   = Pv1E.value;

if(traceSeq){
  console.log("                           E1=", JSON.stringify(E1.sourceString));
  console.log("                           Pv1=", JSON.stringify(Pv1));
}
  var P0W = create_within_intervals_from_events(Pv0,t1);
  var M0 = partition_events_by_intervals(Pv1,P0W);
if(traceSeq){
  console.log("partitioned events  P0->P1 within ",t1,":");
  console.log("              Pv0=", JSON.stringify(Pv0));
  console.log("              Pv1=", JSON.stringify(Pv1));
  console.log("               t1=", JSON.stringify(t1));
  console.log("-----------------------------");
  console.log("(partitions)=> M0=", JSON.stringify(M0));
}
  // WT contains one entry for each Pv0 that can have none or more traces
  // The task now is to see which of the events in Pv0 "reaches" Pv1
  // within the specified time (t1)
  var passes = [];    // Passed events of P1
  var T1     = [];    // Traces for each pass
  var fails  = [];    // Traces for each fail
  var Ign1   = [];     // Traces for P1 events that matched but were ignored.

  // Assemble the result to a nicely annotated plot.
  // Note that P0 = the union of P0pass and P0fail
  var P0pass = [];  // Events in P0 that successfully led to an event in P1
  var P0fail = [];   // Events in P0 that failed to find any event in P1
  var R0W    = [];   // within regions of P0

  var P1pass = [];  // Events in P1 that satisfied at least one P0 event.
  var P1fail = [];  // Events that fell outside the R0W periods.
  var P1Ign   = [];  // Events in P1 within R0W periods but NOT in P1pass.


  for(var i = 0 ; i < M0.length; i ++){    // ForEach Pv0 match partition in M0
    var sigma = M0[i];
    var trace = T0[i];

    if(sigma.length == 0){
      // partition sigma is empty meaning that the event Pv0[i]
      // could not continue to this node (no p in Pv1 matched).
      // M0[i] is the partition for for Pv0[i] and  T0[i] is the corresponding
      // trace
      var trace =T0[i]; //Not that we fail at the edge of p0 + t1 !
      trace.push([Pv0[i] + t1,undefined]); // last trace entry of fail has no
                                           // index. That's why we failed right?
      fails.push(trace);
      P0fail.push(Pv0[i] + t1);
    }
    else{
      // Some of the events in Pv1 matched. The first is a pass (for this node)
      trace.push(sigma[0]);  // append the matched event trace from Pv1
      T1.push(trace);
      passes.push(sigma[0][0]); //This will be the new Pv0
                                //(head and value element [val,ix])
      P0pass.push(sigma[0][0]); // first hit in partition,
                                // NOTE This is actually a point from Pv1
    //  P1pass.push(sigma[1][0]); //
      if(sigma.length>1){  // Some matched events are ignored.
        var tmp = sigma.shift();
        Ign1.push(sigma[0]);  // append the matched event trace from Pv1
        sigma.forEach(t=>{
          P1Ign.push(t[0])
        });
      }//sigma>1
    }//sigma >0
  };// foreach M0
  if(traceSeq){
    console.log("              Pv1=", JSON.stringify(passes));
    console.log("              T1=", JSON.stringify(T1));
  }
  R0W    = create_within_intervals_from_events(Pv0,t1);
  P1fail = events_and_intervals(Pv1, complement(R0W))

  // All plot vectors are created, but P1Ign may contain too many events.
  // It is possible that an event e is ignored for p1 (in Pv0) but
  // is perfectly valid for p2 (in Pv0). So all those need to be removed.
  P1Ign.filter(value => !P0pass.includes(value)); // May be slow with long vectors...

//    P1_plot = P1_plot.sort(function(a,b){a[1]-b[1]});


var options ={};
  var P0pass_str = "_P0Pass"; // Events in P0 that successfully led to an event in P1
  var P0fail_str = "_P0fail"; // Events in P0 that failed to find any event in P1
  var R0W_str    = "_R0W";    // within regions of P0

//  var P1pass_str = "P1pass";  // Events in P1 that satisfied at least one P0 event.
  var P1fail_str = "_P1fail";  // Events that fell outside the R0W periods.
  var P1Ign_str   ="_P1Ign";   // Events in P1 within R0W periods but NOT in P1pass.

  options["Lhs Events"] = {type:'r',y:2, markers:'N'};
  options["Rhs Events"] = {type:'r',y:1, markers:'N'};
  options[P0pass_str] = {type:'r',y:2, markers:'p'};
  options[P0fail_str] = {type:'r',y:2, markers:'f'};
  options[R0W_str]    = {type:'w',y:2, markers:'w'};

//  options[P1pass_str] = {type:'r',y:2, markers:'p'};
  options[P1fail_str] = {type:'r',y:1, markers:'f'};
  options[P1Ign_str] = {type:'r',y:1, markers:'i'};
  // Possibly add the traces from T1 as success regions?

  var plots =[{exprStr:"Events = Lhs Events -> Rhs Events within t:(" +
                        E0str + ") -> (" + E1.sourceString + ") within " + t1,
              events:[
                {name:"Lhs Events",events:Pv0},
                {name:"Rhs Events",events:Pv1},
                {name:P0pass_str,events:P0pass},
                {name:P0fail_str,events:P0fail},
//                {name:P1pass_str,events:P1pass},
                {name:P1fail_str,events:P1fail},
                {name:P1Ign_str,events:P1Ign},
              ],
              intervals:[
                {name:R0W_str,intervals:R0W},
              ],
              options:options,
              dygraph:{valueRange:[0,3]}
             }];
if(typeof Pv1E.plots != 'undefined') plots = plots.concat(Pv1E.plots);
if(traceSeq){
  console.log("TearsParser2.js::evaluate_transition OUT: ",
               JSON.stringify({failTraces:fails, passes:passes,
               passTraces:T1,plots:plots} ));

  console.groupEnd();
}
  return {failTraces:fails,
          passes:passes,
          passTraces:T1,
          plots:plots};
}

function errLocationFromNode(node){
  // SYNTAX error messages are nicely reported using Line,Col
  // But EVAL problems lack such info.
  var s = node.source.startIdx;
  var e = node.source.endIdx;
  // Assuming the error is on one line..
  var lines = node.source.sourceString.substring(0,s).split('\n');
  var line = lines.length - 1;

  // Cols consumed by previous lines
  var col = 0;

  lines.forEach(l => col = col + l.length);
  col -= lines[lines.length -1].length;
  col += (lines.length -1) ;// also count newline.
  var startColumn = s - col;
  var endColumn = e - col;
  //console. log("errLocationFromNode",line, startColumn, endColumn);

  return "Line " + (line + 1)  + ", col " + startColumn +
                                 ", endCol " + endColumn;
}

module.exports = {

    getUsedSignals(){
      return moduleContext.usedSignals;
    },

    eval(matchResult) {
        constDefAlias = [];
        reset_moduleContext();
        
        // Before any statements are evaluated, we check if
        // there is a default definition block that should be used
        let defBlock = EvalContext.getInstance().getDefaultDefinitionBlock();
        //console.log("TearsParser2:eval::", JSON.stringify(defBlock));
        if(defBlock.active == true){
          if(defBlock.constDefAlias != undefined){
            //console.log("TearsParser2:732 reusing constDefAlias", defBlock.constDefAlias[0])
            constDefAlias = [...defBlock.constDefAlias]; // copy it
            //console.log("TearsParser2:732 reusing constDefAlias is the copy the same", defBlock.constDefAlias=== constDefAlias)
          }else{

              try{
                 let defBlockMatchResult = this.match(defBlock.content);
                 if(!defBlockMatchResult.succeeded()){
                   console.log("Failed to evaluate global definitions\n Defblock filename: ",defBlock.fileName ,"\nMatchResult:",defBlockMatchResult);
                   throw("^Global definitions: " + defBlock.fileName + " syntax or evaluation error:" + defBlockMatchResult.message.replace("^",""));
                 }
                 let ignored = semantics2(defBlockMatchResult).eval();
                 //setLastMainBlockEvaluation(constDefAlias)
                  //console.log("TearsParser2:-------------------------------------------------------")
                  //console.log("TearsParser2:758 constructing new constDefAlias from, res, constDefAlias", ignored, constDefAlias[0])
                  //console.table(constDefAlias)
                }catch(error){
                  //console.log(error)
                  defBlock.active = false;
                  throw("^Global definitions: " + defBlock.fileName + " syntax or evaluation error:" + error.replace("^",""));
              }
              constDefAlias.forEach(def =>{def.scope = "global"});
              defBlock.constDefAlias = [...constDefAlias];
              EvalContext.getInstance().setDefaultDefinitionBlock(defBlock);
              // TODO: Also update the completion information: (Mark as globas / locals)
          }
       }//if use defblock.
       // Now we can evaluate the expression
       let res =  semantics2(matchResult).eval();
       // constDefAlias.forEach(def =>{if (def.scope !== "global") def.scope !== "local"});
       return res;
    },

    match(expr) {
        //console.log("TearsParser.js::match() " + JSON.stringify());
      return grammar2.match(expr);
    }
}//exports

/**
 * Rules for how to convert the result of GA-text parsing into a
 * json-representation of the parse tree.
 */
function createSemantics() {
    var self = this;
    var pCount = 0;
    var semantics2 = grammar2.createSemantics();
    semantics2.addOperation('eval', {

/*
TOP LEVEL RULE (default)
SPEC = filename* Config* DefinesAndConstsAndAlias* ((identifier "=")? GuardedAssertion)*
*/
SPEC: function(filename, graces, statements){
       var fname = filename.sourceString;   //TODO: filename is not used
        
       /* replaced by reset_moduleContext, 
       TODO: remove this block if it all works
       delete moduleContext.allowMaxFail
       delete moduleContext.leftIgnore
       delete moduleContext.rightIgnore
      */ 

       var res = statements.eval();
       // DEBUG TODO: this is a really nice feature though:
       //console.log("DEFINITIONS DUMP")
       /*constDefAlias.forEach(row =>{
         var op = row.deftype + "," + row.type + "," + row.identifier + "," + row.value.sourceString + "\n"
         console.log(op)
       });*/
      // console.log(JSON.stringify(constDefAlias));
      //console.table(constDefAlias);


      // The Bulky adjustments below are necessary to make G/As usable in practice
      // TODO: Discuss if this is part of a separate policy  "language" OR part of T-EARS.
      // If done properly, we should probably have a policy language for this and the ackumulated results.
      // If there is a gracePeriod or an allowed slack  defined


      // BEGIN GENERAL POLICY
      graces.eval();


       if(moduleContext.hasOwnProperty('leftIgnore')){
         res.forEach((item, i) => {
            //console.log("Processing ", i, item);
            item.value.times.fail =  leftTrunc(item.value.times.fail,  moduleContext.leftIgnore);
            item.value.times.pass =  leftTrunc(item.value.times.pass,  moduleContext.leftIgnore);
            item.value.times.valid = leftTrunc(item.value.times.valid, moduleContext.leftIgnore);
            item.value.leftIgnore = moduleContext.leftIgnore;
         });
         

       }
       if(moduleContext.hasOwnProperty('rightIgnore')){
            res.forEach((item, i) => {
                //console.log("Processing ", i, item);
                item.value.times.fail =  rightTrunc(item.value.times.fail,  moduleContext.rightIgnore);
                item.value.times.pass =  rightTrunc(item.value.times.pass,  moduleContext.rightIgnore);
                item.value.times.valid = rightTrunc(item.value.times.valid, moduleContext.rightIgnore);
                item.value.rightIgnore = moduleContext.rightIgnore;
             });
            
       }


      if(moduleContext.hasOwnProperty('allowMaxFail')){
        //console.log("Filtering out fails shorter than ",  moduleContext.allowMaxFail)
        res.forEach((item, i) => {
           let guards = item.value.times.valid;
           if (guards.length > 0 && Array.isArray(guards[0])){
             item.value.times.fail =   item.value.times.fail.filter(r => r[1] - r[0] >= moduleContext.allowMaxFail);
           }
           item.value.allowMaxFail = moduleContext.allowMaxFail;
        });
       
      }

      // END GENERAL POLICY
    
      return res;
},
Allow:function(_fn, timeout,_fail){
  var t = timeout.eval();
  if(moduleContext.hasOwnProperty('allowMaxFail')){
    /*console.warn(errLocationFromNode(timeout) +
    ' ^allowMaxFail ignore already specified. You may want to check your main definitions file.');*/
  }
  moduleContext.allowMaxFail = t;
},
GracePeriodSpec:function(_fn, _end, timeout){
  // Probably we want to resolve alias (automatic?)
  var t = timeout.eval();
   if (_end.sourceString == "<"){
      if(moduleContext.hasOwnProperty('leftIgnore')){
        /*console.warn(errLocationFromNode(timeout) +
        ' ^Leftward ignore already specified. You may want to check your main definitions file.');*/
      }
      moduleContext.leftIgnore = t;

    }
  else{
    if(moduleContext.hasOwnProperty('rightIgnore')){
     /* console.warn(errLocationFromNode(timeout) +
      ' ^Rightward ignore already specified. You may want to check your main definitions file.');*/
    }
    if(t<0){
      t = EvalContext.getInstance().getXmax() - t;
    }

    moduleContext.rightIgnore = t;
  }
},
/*
 Statements = (EventDef | GenericDef | Constant | Alias | GA)*
*/
Statements:function(statements){


  // Statements can be any of above and are evaluated IN order
  // The reason is to allow redef of aliases as a substitute for
  // User defined functions (you can create a def that uses an alias)
  // That alias can be redefined (effectively parameterizing the def)

  var GA_evaluations = []; // name, config, ga-eval
  statements.children.forEach(item => {
    if (item.ctorName !== 'GA'){
      item.eval();
    }else {
      // If it is a GA statement, we evaluate it and save the result if
      // config rule does not prevent it.
      var res  = item.eval()
      GA_evaluations.push(res);
    }
  });
  //console.log("TearsParser2::Statements ", GA_evaluations);
  // TODO: return all evaluations (need to update GUI )

  return GA_evaluations
},
/*
   GivenContext = given IntervalGuard
*/
GivenContext:function( _given, interval_guard){
  return  interval_guard.eval();
},
/*
GA = ((identifier "=")? Config? GivenContext? GuardedAssertion)
*/
GA:function( identifier, _eq, config, given_context, guardedAssertion){
  var name = evalOptional(identifier,"");
  var given_context = evalOptional(given_context,"");
  moduleContext.currentGiven = given_context;
  var include = evalOptional(config,true);
  if(include)
       return {
          name: name,
          eval:true,
          value:guardedAssertion.eval()
        }
  else
  return{
     name: name,
     eval:false,
     value:{"times": {}, "guards": [], "assertions": []}
   }
},
Config:function(_where, expr){
  return expr.eval();
},
BoolExpr_conj:function(lhs,op,rhs){
  var res = false;
  if (op.sourceString == 'and')
    res =  lhs.eval() && rhs.eval();
  else
     res = lhs.eval() || rhs.eval();
  //console.log("TearsParser2::BoolExpr_conj ", res);
  return res;
},
BoolExpr_eq:function(lhs,op,rhs){
  var res = false;
  if (op.sourceString == '==')
    res =  lhs.eval() == rhs.eval();
  else
     res = lhs.eval() != rhs.eval();
  //console.log("TearsParser2::BoolExpr_conj ", res);
  return res;
},
BoolExpr_boolean:function(val){
  return val.eval();
},
BoolExpr_op:function(lhs,op,rhs){
  var res = compare[op.sourceString](lhs.eval(),rhs.eval());
  //console.log("TearsParser2::BoolExpr_op ", op.sourceString,lhs.eval(),rhs.eval(),res);
  return res;
},
BoolExpr_constOrAlias:function(id){
//  console.log("TearsParser2::BoolExpr_constOrAlias looking up", id);
  var res = resolveAliases("Boolean", id);
  if (res.value.type !== "Boolean")
  {
       throw(errLocationFromNode(id) +
       ' ^Expected Boolean, but identifier "' + res.culprit +
       '" is defined as ' +  res.value.type + ".");
  };
 var val = res.value.value.eval();
 return val;
},
Boolean:function(val){
    return val.sourceString==="true"?true:false;
},
/*BooleanFunction =
    exists "(" identifier ")"                --exists

    The identifier can be an alias for a signal
*/
BooleanFunction_exists:function(_fname,_lp,identifier,_rp){
  console.log("BooleanFunction_exists resolving ",identifier.sourceString);

    try{
      var res = resolveAliases("Signal", identifier,true);
    }
    catch(e){
      console.log("BooleanFunction_exists exception when resolving alias:",res,e)
      return false
    }

    console.log("BooleanFunction_exists resolving alias succeeded: ",res)
    if (res.hasOwnProperty('value')){
      {
           throw(errLocationFromNode(identifier) +
           ' ^Expected Signal or Signal alias, but resolved identifier "' + res.culprit +
           '" is defined as ' + res.value.type + ".");
      };
    }
    // We are pretty sure it is a signal indentifier or an unknown identifier
    res = EvalContext.getInstance().getSignal(res);
    console.log("BooleanFunction_exists Tried to find signal: ",res)

    return res !== undefined;
},


/*
TOP LEVEL RULE (default)
SPEC = filename* Config* DefinesAndConstsAndAlias* ((identifier "=")? GuardedAssertion)*

SPEC: function(filename, config, definesAndConstsAndAlias, identifier, _eq, guardedAssertion){
  var fname = filename.sourceString;
  definesAndConstsAndAlias.children.forEach(item => {
     item.eval();
  });

  let names = []                          // Array of G/A names
  identifier.eval().forEach(id =>{
      if (id.length ==0)
        names.push("");
      else
        names.push(id[0]);
  });

  let ga = guardedAssertion.eval();  // Array of GA:s
  var ret = [];
  for(var i = 0 ; i < ga.length; i++){
    ret.push({ix:i,name:names[i],eval:ga[i]});
  }
  //console.log("Total results", JSON.stringify(ret));
  return ga[ga.length - 1];  // we should return ret,
                             // but recipients are not yet ready for that.
},
*/

/*
    EventDef = def "events" identifier "=" Events
*/
EventDef:function(_def, _events, identifier, _eq, body){

   addConstDefAlias("def",
                    "Events",
                    identifier.eval(),
                    body);
},
/*
    IntervalsDef = def "intervals" identifier "=" Intervals
*/
IntervalsDef:function(_def, _events, identifier, _eq, body){
   addConstDefAlias("def",
                    "Intervals",
                    identifier.eval(),
                    body);
},

/*
Constant = const identifier "=" limit
*/
Constant:function(_const, identifier,_ew, body){
  var type = body._node.ctorName;
  addConstDefAlias("const",
                    type,
                    identifier.eval(),
                    body);
// console.log("TearsParser2::Constant added constant " +
//              identifier.eval() + "=" + body.eval(), " of type ", type, " body is",body);
},
/*
Alias = alias identifier "=" identifier
*/
Alias:function(_alias, identifier, _ew, body){
  var type = body._node.ctorName;

  addConstDefAlias("alias",
                    type,
                    identifier.eval(),
                    body);

//   console.log("TearsParser2::Alias added alias " +
//                identifier.eval() + "=" + body.eval(), " of type ", type, " body is",body);

},
/*
 GuardedAssertion =  while IntervalGuard (shall verify? IntervalAssertion)* --intervalGA
*/
GuardedAssertion_intervalGA: function(_when, guard, _shall,_verify, assertion) {
    moduleContext.currentGA = undefined;
    moduleContext.usedSignals = [];
    var GE = guard.eval();
    var G = [];
    var plots = [];
    //console.log("while Guard               evaluated to:",JSON.stringify(GE.value));
    //console.log("And the extra given Guard evaluated to:",JSON.stringify(moduleContext.currentGiven.value));
    // If the given then when syntax is used, the guard and given context are "and"ed togehter
    if (moduleContext.currentGiven != undefined){
      G = operators.and(GE.value,moduleContext.currentGiven.value);
      if (typeof (moduleContext.currentGiven.plots != 'undefined') ) plots.concat(moduleContext.currentGiven.plots);
    } 
    else{
     G = GE.value;
    }
    moduleContext.currentGA ={G:G};
    var retVal = {times: {
               valid: G,
               pass:[],
               fail:[]},
               guards:[],
               assertions:[],
               signals:moduleContext.usedSignals};
    
    if (typeof GE.plots != 'undefined') plots.concat(GE.plots);
    retVal.guards = plots;
    
  //  console.log("TEARS-2:GuardedAssertion_intervalGA Guard Evaluated to ",
  //               JSON.stringify(GE));

    // TODO, Refuse more than one shall IntervalsAssertion
    if (assertion.children.length >1){
      throw errLocationFromNode(assertion) +
            " ^ A guard can only have zero or one assertion."
    }
    for(var rep = 0; rep < assertion.children.length  ;rep++){
      var AE = assertion.children[rep].eval();
      /*AE= {"type":"IntervalAssertion",
             "value":{"type":
                      "Intervals",
                      "value":[[7.570000000006985,13.75]]
                    },
            "within":0}*/
      var A = AE.value
    //  console.log("TEARS-2:GuardedAssertion_intervalGA Assertion Evaluated to",
    //                JSON.stringify(AE));
    // Within intervals
      var W = [];

      var to = AE.within;
      //console.log("Reading slack",JSON.stringify(to));
      for(var i = 0; i < G.length;i++ ){
        var start = G[i][0];
        W.push([start, start+to]);
      }
      // According to spec, we only consider the intervals where the Guard is True

      A = operators.and(A,G);

      //console.log("TEARS-2:GuardedAssertion_intervalGA A= ",JSON.stringify(A));
      // Passed is all periods within the Guard where the Assertion is true

      var P = A;

      // Fail is all periods during the guard where the assertio is false (not counting within)
      var F = operators.and(complement(A),G);

      //console.log("TEARS-2:GuardedAssertion_intervalGA F= ",JSON.stringify(F));
      //console.log("TEARS-2:GuardedAssertion_intervalGA W= ",JSON.stringify(W));
      //console.log("TEARS-2:GuardedAssertion_intervalGA compl W= ",JSON.stringify(complement(W)));

      // However any Fail periods that occur in the within periods shall be ignored.
      if(to>0){
        //console.log("Adding slack",to);
        F = operators.and(F,complement(W));
      }

      retVal.times.pass =  P;
      retVal.times.fail =  F;

      if (AE.plots != undefined){
         retVal.assertions = AE.plots;
       }

  }// for

    //console.log("TEARS-2:GuardedAssertion_intervalGA FINAL Result",JSON.stringify(retVal));
    return retVal;
},
/*
  IntervalAssertion = Intervals WithinExpression?           --within
*/
  IntervalAssertion_within: function(intervals, withinExpression){
      //console.log("TEARS-2:IntervalAssertion_within",withinExpression);

      var withinTimeout = 0;

      if (withinExpression.children.length>0){
        withinTimeout = withinExpression.children[0].eval();
        moduleContext.currentGA.tw = withinTimeout;
      //  console.log("           TEARS-2:IntervalAssertion_within to = ",withinTimeout);
      }

      var IA = intervals.eval();
      var res = {type:'IntervalAssertion',
              value:IA.value,
              within:withinTimeout};
      if (IA.plots != undefined) res.plots = IA.plots;
    //  console.log("           TEARS-2:IntervalAssertion_within PLOTS = ",JSON.stringify(IA.plots));


      return res;
  },
/*
Intervals =
                 IntervalsExpr TimeFilter* ((and|or) IntervalsExpr TimeFilter* )*    --conj
*/
  Intervals_conj : function(lhs_intervals, lhs_timeFilter, conj, rhs_intervals, rhs_timeFilter){
    function createPlot(SLE,SRE,conj,res){
      var options ={};
      var lhs = "L:(" + SLE.sourceString + ")";
      var rhs = "R:(" + SRE.sourceString + ")";
      options[lhs] = {type:'r',y:2};
      options[rhs] = {type:'r',y:1};
      options["_Result"] = {type:'R',y:3};
      var plot = {exprStr: "Intervals = Intervals " + conj +
                           " Intervals: (" + SLE.sourceString + ") " + conj +
                           " (" + SRE.sourceString +")",
                     intervals:[
                       {name:"_Result", intervals:res},
                       {name:lhs, intervals:SL  },
                       {name:rhs, intervals:SR }

                     ],
                     options:options,
                     dygraph:{valueRange:[0,3]}
                   };
        //plots.push(plot);
        return plot;
    }
  //    console.log("TEARS-2:Intervals_conj -- ENTER" );
      var SLE = lhs_intervals.eval();
      SLE.sourceString = lhs_intervals.sourceString;

      var SL  = SLE.value;
      var lt = lhs_timeFilter.eval();
      var SRE = {};
      var plots = [];

      // If there are no right hand side arguments, we just
      // pass the plots of the left hand side evaluations.
      if (SLE.plots != undefined && conj.children.length == 0 ){
            plots = plots.concat(SLE.plots);
      }
    //  console.log("TEARS-2:Intervals_conj -- LEFT",JSON.stringify(SLE) );

      for(var i =0; i < lt.length;i++){
        //console.log("               TEARS-2:Intervals_conj:LHS Filter",lt[i], SL );
        SL =  filter_pulse_width(SL, lt[i].comp, lt[i].limit);
        //console.log("               TEARS-2:Intervals_conj:LHS Filter",lt[i], SL );
      }

      // Iterate through all rhs expression
      for (var rep = 0; rep<conj.children.length; rep++){

          SRE = rhs_intervals.children[rep].eval()
          SRE.sourceString = rhs_intervals.children[rep].sourceString;
          var SR  = SRE.value;
          var rt = rhs_timeFilter.children[rep].eval();
          for(var i =0; i < rt.length;i++){ // strange that this filter is an array
            //console.log("               TEARS-2:Intervals_conj:RHS Filter",rt[i] );
            SR =  filter_pulse_width(SR,rt[i].comp,rt[i].limit);
            }
          //console.log("TEARS-2:Intervals_conj:CURRENT OPERATOR IS =",conj.children[rep].sourceString);

        //  var left_plotted_signal  = intervalsToSignal(SL);
      //    var right_plotted_signal = intervalsToSignal(SR);
          var conjOP = conj.children[rep].sourceString.toLowerCase();

          if (conjOP  === "and"){
            var res = operators.and(SL,SR);
          }
          else if (conjOP === "or"){
              var res = operators.or(SL,SR);
          }
          plots.push(createPlot(SLE,SRE,conjOP,res));
          if (SLE.plots != undefined){
                plots = plots.concat(SLE.plots);
          }
          // Chain to next
          SLE.value = SRE.value; ;
          SLE = SRE;
          SL  = res;
          //console.log("TEARS-2:Intervals_conj:LHS OR result=",SL);
      }// for chained conj expressions.
      if(SRE.plots != undefined) {
          plots = plots.concat(SRE.plots);
        }
      //console.log("TEARS-2:Intervals_conj -- Collected PLOTS",JSON.stringify(plots),rep );
    //  console.log("TEARS-2:Intervals_conj2 -- Collected PLOTS");

      return {type:"Intervals",
              value:SL,
              plots:plots
             };
},
/*
  IntervalFunction  =
                  "not" Intervals                                         --not
*/


/*IntervalsExpr  =
              | "(" Intervals ")"                 --parentheses
*/
IntervalsExpr_parentheses:function(_lp, intervals,_rp){
  var SE = intervals.eval();
  return SE;
},
/*
  IntervalsExpr =
          | Signal LogicalOperator Signal     --logop
  LogicalOperator = ("==" | "!=" | "~=" | ">=" | ">" | "<=" | "<")
*/
IntervalsExpr_logop : function(signal1, op, signal2){

  var signal1e = signal1.eval()
  var signal2e = signal2.eval()

/*  console.log("--------------------------------------------------------------------------------------------------")
  console.log("IntervalsExpr_logop : signal1 "  + JSON.stringify(signal1e))
  console.log("IntervalsExpr_logop : signal2 "  + JSON.stringify(signal1e))
*/
  var sig1 = signal1e.value;
  var sig2 = signal2e.value;

  var operator = op.sourceString;
  // TODO:
  // sig1 empty
  // sig2 empty

  // Create a common timeline and interpolate signals on it.
  //var timeline = EvalContext.joinTimelines(sig1.xAxis, sig2.xAxis);
  var timeline = createCommonTimeLine(sig1.xAxis, sig2.xAxis);
  //console.log("IntervalsExpr_logop : common timeline "  + JSON.stringify(timeline))

  //var S1 = EvalContext.getInstance().interpolateDataToTimeline(sig1, timeline);
  //var S2 = EvalContext.getInstance().interpolateDataToTimeline(sig2, timeline);
  var S1 = resample_signal(sig1, timeline);
  var S2 = resample_signal(sig2, timeline);

  //console.log("IntervalsExpr_logop : resampled S1 "  + JSON.stringify(S1))
  //console.log("IntervalsExpr_logop : resampled S2 "  + JSON.stringify(S2))


  //console.log("Timeline ",timeline);
  var intervals  = [];
  var start = undefined;

  for (var i = 0; i < timeline.length; i++){
    //console.log("Comparing ",i,S1[i],operator,S2[i],compare[operator](S1[i],
    //             S2[i]),compare[operator]);
    if(compare[operator](S1[i],S2[i])){
        if(start == undefined){
          //console.log("Starting new interval",i)
          start = timeline[i];
        }// else we are already in an interval.

    } else { // End the current interval.
           if(start == undefined)
            continue; // already in "non-interval"
            //console.log("Ending interval at ",i)
           //assert(start != undefined);
           intervals.push([start,timeline[i]])

           start = undefined;
       }
   }//for
    if(start != undefined){
      //console.log("Ending interval at ",timeline.length - 1,
      //             timeline[timeline.length - 1])
      intervals.push([start,timeline[timeline.length - 1]]);
    }
  //console.log("TEARS-2:IntervalsExpr_logop Result is:",intervals );
  var plots =[];

  var sig1_max = Math.max(...sig1.values);
  var sig2_max = Math.max(...sig2.values);
  var sig1_min = Math.min(...sig1.values);
  var sig2_min = Math.min(...sig2.values);

  var sigMax = Math.max(sig1_max,sig2_max);
  var sigMin = Math.min(sig1_min,sig2_min);
  var resultValue = (sigMax-sigMin)/3; // The result is always presentet 1/3 from the bottom...

  plots.push({exprStr: "Intervals = Signal  " + op.sourceString +
                       " Signal: (" + signal1.sourceString + ") " +
                        op.sourceString + " (" + signal2.sourceString + ")",
              signals:[
                {
                  name:"L:(" + signal1.sourceString + ")",
                  shortName:"L:(" + signal1.sourceString + ")",
                  xAxis:sig1.xAxis,
                  values:sig1.values
                },
                {
                  name:"R:(" + signal2.sourceString + ")",
                  shortName:"R:(" + signal2.sourceString + ")",
                  xAxis:sig2.xAxis,
                  values:sig2.values
                }
               ],
               intervals:[{name:'_Result',intervals:intervals}],
               options:{'_Result':{type:'R',y:resultValue}},
               });
  if(signal1e.plots != undefined) plots = plots.concat(signal1e.plots);
  if(signal2e.plots != undefined) plots = plots.concat(signal2e.plots);
  return {type:"Intervals",
          value:intervals,
          plots:plots};
},
/*
IntervalsExpr  =
              | true                                                     --true
              | false                                                   --false
*/

IntervalsExpr_true:function(_true){
  return {type:"Intervals",value:[[-Number.MAX_VALUE,Number.MAX_VALUE]]};
},
IntervalsExpr_false:function(_false){
  return {type:"Intervals",value:[]};
},
/*
IntervalsExpr  =
            | definedIntervals				                                   --def
*/
IntervalsExpr_def: function(definedIntervals){

  var res = resolveAliases("Intervals", definedIntervals);
  if (res.value.type.substring(0,8) !== "Interval"){
    throw(errLocationFromNode(definedIntervals) + ' ^"' + res.culprit +
    '" defines a(n) ' + res.value.type.substring(0,9) + " expression, but an Intervals"+
    " expression was expected.");
  }
  var val = res.value.value.eval();

  //console.log("IntervalsExpr_def evaluated ",val,res);
  return val;
},

/*
IntervalsExpr  =
              |"[" ListOf<Interval, ","> "]"      --list

*/
IntervalsExpr_list:function(_l, items, _r){
    var S = items.eval();
    if (S == undefined){
      S = [];
    }
    return {type:"Intervals",value:S};
},
/*
Interval = "[" Timeout "," Timeout "]"
*/
Interval: function(_lp, start, _comma, end,_rp){
  var s = [start.eval(),end.eval()];
  // primitive type, return only value
  return s;
},


/*
IntervalFunction =  between "(" (Events|Timeout) "," (Events|Timeout) ")" --between
*/
IntervalFunction_between:function(_key, _lp, start, _comma, end, _rp){

  if(moduleContext.currentGA != undefined){
    throw errLocationFromNode(_key) + "^You should not use \"between\" in "+
     "assertion expressions. We recomment creating additional guards instead. ";
  }

  // The arguments can be either Timeout, or Events but if an identifier is used
  // It might be a def (intervals) or const (Timeout)

  function getEventsOrTimeout(identifier){
      if (identifier._node.ctorName === 'identifier'){
        // If identifier is an alias, we need to resolve that first:

        var res = resolveAliases("Events", identifier, true);
        var v = res.value.value.eval();
        if(res.deftype = "const"){
            return v;
        }
        if(v.type === "Events" || v.type === "Timeout"){
          return v;
        }
        throw errLocationFromNode(identifier) + "^Expected Timeout or Events but identifier " + res.culprit +
         " is defined as " + v.type + ".";
      }else {
        // It is probably a manual Event Sequence

        //console.log("TearsParser2.js::between  resolving ",identifier.eval())
        return identifier.eval();
      }//not an identifier
  }//internal function...
  var P1E = getEventsOrTimeout(start);
  var P2E = getEventsOrTimeout(end);

  //  console.log("TearsParser2.js::between IN",JSON.stringify(P1E),
  //             JSON.stringify(P2E))
  var P1 = undefined;
  var P2 = undefined;

  // Transform P1 and P2 to Events.
  // Allowed combos
  // #1 between (p1, p2) => between( [p1], [p2] )
  // #2 between (p1, P2) => between( [p1], P2 )
  // #3 between (P1, p2) => between( P1,[p1 + p2 for all p1 in P1] )
  // #4 between (P1, P2) => between( P1, P2 )

  if(P1E.value == undefined && P2E.value == undefined){          // #1
    P1 = [P1E];
    P2 = [P2E];
  }else if(P1E.value == undefined && P2E.value != undefined){    // #2
    P1 = [P1E];
    P2 = P2E.value;
  }else if(P1E.value != undefined && P2E.value == undefined){    // #3
    P1 = P1E.value;
    P2 = [];
    P1.forEach(p => {
      P2.push(p + P2E);
      })
      if(P2E < 0){ // Negative offset --> Swap begin and end points.
        var T = P1;
        P1 = P2;
        P2 = T;
      }
  }else if(P1E.value != undefined && P2E.value != undefined){    // #4
    P1 = P1E.value;
    P2 = P2E.value;
  }else{
    throw("^Unknown error in input to between function " ,JSON.stringify(P1E),
          JSON.stringify(P2E));
  }
  var P1_original = P1.slice(0);
  var P2_original = P2.slice(0);
  var S = [];
  //console.log("TearsParser2.js::between IN:P1,P2=",JSON.stringify(P1),
  //            JSON.stringify(P2))
  if(P1.length == 0 || P2.length == 0) {
    var plots = [];
    if(P1E.plots != undefined ) plots = plots.concat(P1E.plots);
    if(P2E.plots != undefined ) plots = plots.concat(P2E.plots);
    return {type:"Intervals",value:[],plots:plots};
  }
  var skippedP1 = [];
  var skippedP2 = [];
  var i1 = 0;
  var i2 = 0;
  var len1 = P1.length
  var len2 = P2.length


  var Q = P2.slice(0); //copy
  var q = -1234;   // Just kick it pass first P1 loop.

  for(var i = 0; i < len1;i++){
    if(q == undefined || P1[i] < q){ // skip trailing events and P1 in between
      skippedP1.push(P1[i]);
    }
    else{
      winding_q:
      while(q = Q.shift()){
        if( q <= P1[i]){
          skippedP2.push(q);    // skip P2:s in between...
        }
        else{
          // new interval Found
          S.push([P1[i], q])
          break winding_q;
        }
      }
    }// if no more q:s
  } // for each p in P1
  while(q = Q.shift()){
    skippedP2.push(q);    // skip P2:s after last region...
  }
   var options ={};
      var s = "S:(" + start.sourceString + ")";
      var e = "E:(" + end.sourceString + ")";
      options[s]           = {type:'r',y:2, markers:'N'};
      options[e]           = {type:'r',y:1, markers:'N'};
      options["_Skipped S"] = {type:'r',y:2, markers:'i'};
      options["_Skipped E"] = {type:'r',y:1, markers:'i'};
      options["_Result"]    = {type:'R',y:0};

  var plots =[{exprStr:"Intervals = between(Events|Offset, Events|Offset):"+
            " between(" + start.sourceString + ", " + end.sourceString + ")",
                events:[
                  {name:s,events:P1},
                  {name:e,events:P2},
                  {name:"_Skipped S", events:skippedP1},
                  {name:"_Skipped E", events:skippedP2},
                ],
                intervals:[
                  {name:"_Result",intervals:S}
                ],
                options:options,
                dygraph:{valueRange:[0,3]}
               }];
   if(P1E.plots != undefined ) plots = plots.concat(P1E.plots);
   if(P2E.plots != undefined ) plots = plots.concat(P2E.plots);
   return {type:"Intervals",value:S,plots:plots};

},
IntervalFunction_not: function(_not, _lp, intervals, _rp){

  var SE = intervals.eval();
  var S = SE.value;

  //console.log("TearsParser2.js::IntervalsExpr_not IN " + S)
  var comp=complement(S);
  var res =  {type:"Intervals",
              value:comp,
             };
  //console.log("TearsParser2.js::IntervalsExpr_not IN " + JSON.stringify(comp))

  if(typeof SE.plots != 'undefined') res.plots = SE.plots;
  return res;
  // TODO: correct that not([]) = [-inf,inf]
},


/*
   Signal   =
            Signal "-" Signal                                     --subtractSig
*/
Signal_sigOpSig:function(lhs,op,rhs){
  var S1E = lhs.eval();
  var S2E = rhs.eval();

  var sig1 = S1E.value;
  var sig2 = S2E.value;
  var operator = op.sourceString;
  // TODO:
  // sig1 empty
  // sig2 empty

  // For now we just use the old implementation.

  // Create a common timeline and interpolate signals on it.
  var timeline =  EvalContext.getInstance().joinTimelines(sig1.xAxis, sig2.xAxis); // TODO handle start/end later createCommonTimeLine(sig1.xAxis, sig2.xAxis);
  let res_sig = [];

  var S1 = EvalContext.getInstance().interpolateDataToTimeline(sig1, timeline);
  var S2 = EvalContext.getInstance().interpolateDataToTimeline(sig2, timeline);

  //console.log("Timeline ",timeline);
  var len = timeline.length;

  for(var i  = 0; i < len;i++){
    switch (operator) {
      case '-':
        res_sig.push(S1[i] - S2[i]);
        break;
      case '+':
        res_sig.push(S1[i] + S2[i]);
        break;
      case '*':
        res_sig.push(S1[i] * S2[i]);
        break;
      case '/':
        res_sig.push(0.0 + S1[i] / S2[i]);
        break;
      default:

    }//switch

  }//for each sample.

  var plots =[];
  plots.push({exprStr: "Signals = Signal " + op.sourceString + " Signal: (" +
    lhs.sourceString + ") " + op.sourceString + " (" + rhs.sourceString + ")",
              signals:[
                {
                  name:     "L:(" + lhs.sourceString+ ")",
                  shortName:"L:(" + lhs.sourceString+ ")",
                  xAxis:sig1.xAxis,
                  values:sig1.values
                },
                {
                  name:     "R:(" + rhs.sourceString+ ")",
                  shortName:"R:(" + rhs.sourceString+ ")",
                  xAxis:sig2.xAxis,
                  values:sig2.values
                },
                {
                  name:     "_Result",
                  shortName:"_Result",
                  xAxis:timeline,
                  values:res_sig
                },
              ],
              options:{'_Result':{type:'R'}}
               });
  if (typeof S1E.plots !== 'undefined') plots = plots.concat(S1E.plots);
  if (typeof S2E.plots !== 'undefined') plots = plots.concat(S2E.plots);
  let plotName = lhs.sourceString + op.sourceString + rhs.sourceString;
  return {type:'Signal',value:{
          xAxis:timeline,
          values:res_sig,
          name:plotName,
          shortName:plotName},
          plots:plots};
},/*
Signal  =
           | Num                                                    --numerical
*/
Signal_numerical:function(num){
  //console.log("TearsParser2::Signal_numerical", num);
  var v = num.eval();
  return {type:"Signal",
          const:true,
          value:{
          xAxis:[-Number.MAX_VALUE,Number.MAX_VALUE],
          values:[v,v]}}
},
/*
Signal  =
      | (true | false)                          --boolean
*/
Signal_boolean:function(val){
var b = (val.sourceString === "true")?1:0;
return {type:"Signal",
        const:true,
        value:{
        xAxis:[-Number.MAX_VALUE,Number.MAX_VALUE],
        values:[b,b]}}
},

/*
Signal    =
         | Signal "at" identifier                                 --eventSampled
*/
Signal_eventSampled:function(signal,_,identifier){

  var SIGE = signal.eval();
  var id = identifier.sourceString;
  var P = getConstDefAlias(id);
  if (typeof P === 'undefined'){
    throw (errLocationFromNode(identifier) +
        "^Expected stored timepoints (or Events) but \"" + id + "\" is not defined.")
  }
  console.group("TearsParser2.js::Signal_eventSampled:function(signal,_,identifier");
  console.log("IN  Sampled signal   " + JSON.stringify(SIGE.value))
  console.log("IN  stored timepoints" + JSON.stringify(P))
  if(P.deftype ==="Store")
  console.log("IN  Events           " + JSON.stringify(P.value.events))
  else
  console.log("IN  Events           " + P.value)

  if (!(P.type.substring(0,6)==="Events" || P.deftype === "Store")){
    throw (errLocationFromNode(identifier) +
    "^Expected stored timepoint (Events) but \"" + id + "\" is defined as " +
     P.deftype +" "+ P.type, ".");
  }

  var xAxis  =[0];
  var values =[0];
  if(P.deftype === "Store"){// CAUTION, if P< S or P>S it will be truncated!
        var res = resample_signal(SIGE.value,P.value.events);
         console.log("IN  Sampled          " + JSON.stringify(res))

        // res contains SIGE values for each "middle point".
        //  Now this should be stretched to the left and to the right.
        //
        //          _______                     value at point x
        //        |  |       |
        //------|    |         | -------------  SIGE
        //           x                          Stored timepoint
        //------[              ]                Valid interval

        //      +--------------+                value at point x(as above)
        //      |              |
        //------+              +-------------   SIGE at id
        //       < the whole >
        //        seq interval
        //0,0   s,y            e,0

       for(var i = 0; i < P.value.valid.length; i++){
           var r = P.value.valid[i];
           var y = res[i];   /// UJUJ stämmer detta ?
           // y is the value of the signal during the corresponding sample.
           // start =  r[0], end = r[1]
           xAxis.push(r[0])
           values.push(y);
           xAxis.push(r[1])
           values.push(0);
        }//for
       console.log("---------------------------------------------------------")
       console.log("OUT  Sampled " + JSON.stringify({xAxis:xAxis,values:values}))

       console.groupEnd();
 }else {
   //TODO: CAUTION, if P< S or P>S it will be truncated!
   var samplePoints = P.value.eval().value  //TODO Error if not Events!
   var res = resample_signal(SIGE.value,samplePoints);
   // Reconstruct a signal, only using the points.
   var xAxis  = samplePoints;
   var values = res;
 }
    return {type:"Signal",value:{xAxis:xAxis,values:values}};
},
/*
Signal  =
           | identifier                                           --sigAliasDef
*/
Signal_sigAliasConst: function(identifier){
    //console.log("TEARS-2:Signal_sigAliasConst, looking for ",identifier.sourceString );
    var sigName = identifier.eval();

    // If identifier is an alias, we need to resolve that first:
    var res = resolveAliases("Signal", identifier, true);

    if(typeof res === 'string'){
      // Not const or alias, try to fetch signal from log file:
      var signal = EvalContext.getInstance().getSignal(res);
      if (signal != undefined){
        //console.log("TEARS-2:Signal_sigAliasConst, signal found!",signal);
        moduleContext.usedSignals.push(res);
        return {type:"Signal",value:signal};
      }else {
        throw(errLocationFromNode(identifier) + ' ^ The signal "' + res +
                                                             '" is not defined.')
      }
    }//not const or alias
     res = res.value // unpack const or alias definition. getConstDefAlias(sigName);
    var retVal = undefined;
    switch (res.deftype){
     case "const":
          var val = res.value.eval();
          return {type:"Signal",value:{xAxis:[-Number.MAX_VALUE,Number.MAX_VALUE],
                                values:[val,val]}};
     case "def":
           if (res.type == "Intervals"){ // This fix basically means that Intervals <==> Binary Signal
                var R1 = res.value.eval();
                //console.log("Sigalias_conts_Signal: Intervals conversion",R1,intervalsToSignal(R1.value))
                return {type:"Signal",value:intervalsToSignal(R1.value)};
                } else{
                     throw(errLocationFromNode(identifier) +
                    ' ^ Expected Signal, but identifier "' + sigName +
                        '" is defined as ' + res.type);
                }
           break;
     /*case "alias":  // already taken care of in the beginning of func.
           var signal = EvalContext.getInstance().getSignal(res.value);
           if (signal != undefined){
             //console.log("TEARS-2:Signal_sigAliasConst, signal found!",signal);
             moduleContext.usedSignals.push(res.value);
             return {type:"Signal",value:signal};
           }
           else {
             throw(errLocationFromNode(identifier) + ' ^Alias "' +
             sigName +' is defined as ' + res.value +
             " but that signal cannot be found.");
           }
         break;*/
     case "store":
          throw(errLocationFromNode(identifier) +
           ' ^ Expected Signal, but identifier "' + sigName +
            '" is defined as ' + res.type);
          break;

     default:
     throw(' ^Internal error processing indentifier "' + sigName);
  }//switch
},

/*
SignalFunction =
       derivative "(" (Timeout ",")? Signal ")"          --derivative
     | abs "(" Signal ")"                              --abs
     | bitmask "(" alnum+ "," Signal ")"               --bitmask
     | maxVal "(" NonemptyListOf< Signal, ","> ")"     --maxVal
     | select "(" Signal "," Signal "," Signal ")"     --select
*/
SignalFunction_derivative:function(_keyw, _l,param, _c,signal, _r){
    var p = 0;
    if(param.children.length>0) p = param.children[0].eval();

    var SE = signal.eval();
    var data = SE.value;
    var xThreshold = p;


    var timestamps = [];
    var values = [];
    var len = data.xAxis.length ;
    var leftIx = 0;
    for (let i = 1; i < len; i++) {
       var deltax = data.xAxis[i] - data.xAxis[leftIx];;
       if (deltax < xThreshold) {
         continue; // skip samples in between
       }
       var xt = data.xAxis[leftIx];
       var yt = data.values[leftIx];
       var xt_1 = data.xAxis[i];
       var yt_1 = data.values[i];
       timestamps.push(xt);  // leftmost point with forward approx.
       values.push((yt_1 - yt)/(xt_1 - xt));
       leftIx = i;
    }//endfor
    let paramOption = param.sourceString
    let sigLabel = _keyw.sourceString + " ( "+ paramOption + signal.sourceString + " )";
    var SG = {xAxis:timestamps,
              values:values,
              name:sigLabel,
              shortName:sigLabel
            };

  // We need a plot for this since it may behave strangely.
  // and we may need to fiddle with the parameter to tune the output.

  var options ={};

    //  options["Result"]    = {type:'R',y:min, markers:"S"};

  var plots =[{exprStr: "Signal = derivative(Timout?, Signal): derivative(" +
                         xThreshold + "s, " + signal.sourceString + ")",
                signals:[
                  {name:signal.sourceString, shortName:signal.sourceString,
                   xAxis:data.xAxis,values:data.values
                 },
                 {name:"_Result", shortName:"_Result",
                  xAxis:timestamps,values:values
                 }
                ],
                options:options,
              //  dygraph:{valueRange:[0,4]}
               }];

  if (typeof SE.plots != 'undefined') plots = plots.concat(SE.plots);


  var res = {type:"Signal",
             value:SG,
             plots:plots};

//  console.log("--------------   TearsParser2::derivative  PLOTS ------------->");
  return res;
},
SignalFunction_abs:function(_keyw, _l, signal, _r){
  var SE = signal.eval();
//  console.log("TearsParser2::SignalFunction_abs IN ", JSON.stringify(SE));
  var S = {xAxis:SE.value.xAxis,   // Do not modify the original signal...
           values:SE.value.values};//(we will exchange values pointer)
  var absValues = [];
  S.values.forEach(v => {
    absValues.push(Math.abs(v));
  });
  S.values = absValues;
 let sigLabel = "abs(" + signal.sourceString + ")";
 S.name = sigLabel;
 S.shortName = sigLabel;
// TODO: Do we need plots for such a simple expression ?
  var res = {type:"Signal",value:S};
  if(SE.plots != undefined) res.plots = SE.plots;
//  console.log("TearsParser2::SignalFunction_abs", JSON.stringify(res));
  return res;
},
SignalFunction_bitmask:function(_keyw, _l, mask, _comma, signal, _r){

  var M = mask.eval();
  var SE = signal.eval();
  if(typeof SE.const != 'undefined'){
    // signal argument seems to be a number!
    throw(errLocationFromNode(signal) + ' ^ A Signal is expected as second argument');
  }

  var S = {xAxis:SE.value.xAxis,      // Do not modify the original signal...
           values:SE.value.values};   //(we will exchange values pointer)
  //console.log("TearsParser2::SignalFunction_bitmask IN ", JSON.stringify(SE),mask);
  //console.log("TearsParser2::SignalFunction_bitmask IN ", JSON.stringify(S.values));

  var maskedValues = [];
  S.values.forEach(v => {
  maskedValues.push(v & M);
  //console.log("TearsParser2::SignalFunction_bitmask Masking ", v,"->", v & M);

  });
  S.values = maskedValues;
  let sigLabel = "bitmask(" + mask.sourceString + ", " + signal.sourceString + ")";
  S.name = sigLabel;
  S.shortName = sigLabel;

  var res = {type:"Signal",value:S};

  //console.log("TearsParser2::SignalFunction_bitmask OUT", JSON.stringify(res));

  if(typeof SE.plots != 'undefined') res.plots = SE.plots;
  return res;
},
/*
SignalFunction =
     | count "(" Events "," Intervals ")"              --counts
*/
SignalFunction_counts:function(_kw, _lp, events, _comma, intervals, _rp){
  var P1E = events.eval();
  var P1 = P1E.value;
  var S1E = intervals.eval();
  var S1 = S1E.value;
  var Pskipped = [];

  //console.log("TearsParser2.js::SignalFunction_counts P,S IN ",
  //              JSON.stringify({P1}),JSON.stringify({S1}));
  // Check that the intervals are not overlapping!
  var ok = true;
  var lastEnd  = -Number.MAX_VALUE ;
  // if true =[[-inf,inf]] was given as argument, we need to adjust to
  // current max/min of the loaded signals.

  const minX = EvalContext.getInstance().getXmin();
  S1[0][0] = Math.max(S1[0][0], minX);
  //no problem if last interval ends in inf
  S1.forEach(s => {
    if(s[0] < lastEnd){
      throw(errLocationFromNode(intervals) +
           ' ^ The intervals argument contains overlaps!');
    }
  lastEnd = s[1];
  });

  var parts = partition_events_by_intervals(P1,S1);
//  console.log("TearsParser2.js::SignalFunction_counts Partitions ",
//                JSON.stringify(parts));
  Pskipped = events_and_intervals(P1,complement(S1));

//  console.log("TearsParser2.js::SignalFunction_counts Partitions ",
//                JSON.stringify(Pskipped));

  var xAxis = [];
  var values = [];
  for(var i = 0; i < S1.length;i++){
    var partition = parts[i];
    var interval = S1[i];
    xAxis.push(S1[i][0]);
    values.push(partition.length);

    xAxis.push(S1[i][1]);
    values.push(0);
  }//for
  if(xAxis[0] != 0){ // if first period does not start at 0, we need to add
    xAxis.unshift(0); // signal == 0 until first period.
    values.unshift(0);
  }
  const [lastItem] = xAxis.slice(-1)
  if(lastItem < Number.MAX_VALUE){
    xAxis.push(Number.MAX_VALUE);
    values.push(0);
  }
  //console.log("TearsParser2.js::SignalFunction_counts Partitions ",
  //              JSON.stringify({xAxis:xAxis,values:values}),lastItem);

 // Since the counts is a bit wierd, we add a plot for it:
 var min  = Math.min(...values);
 var max = Math.max(...values);
 var range = min - max;
 var step = range / 3;
var options ={};
var E = "E:(" + events.sourceString + ")";
options[E]           = {type:'r',y:min + step*2 ,markers:'N'};
options["_Skipped E:"]= {type:'r',y:min + step*2 ,markers:'i'};
var I = "I:(" + intervals.sourceString + ")";
options[I]           = {type:'r',y:min + step };
options["_Result"]    = {type:'R',y:min, markers:"S"};

  var plots =[{exprStr: "Signal = Count(Events, Intervals): Count(" +
                  events.sourceString + ", " + intervals.sourceString + ")",
                events:[
                  {name:E,events:P1},
                  {name:"_Skipped E:",events:Pskipped},
                ],
                intervals:[
                  {name:I,intervals:S1}
                ],
                signals:[
                  {name:"_Result", shortName:"_Result",
                   xAxis:xAxis,values:values
                  }
                ],
                options:options,
              //  dygraph:{valueRange:[0,4]}
               }];

  if (typeof P1.plots != 'undefined') plots = plots.concat(P1.plots);
  if (typeof S1.plots != 'undefined') plots = plots.concat(S1.plots);

  let sigLabel = "counts(" + events.sourceString + "," + intervals.sourceString + ")"
  var res = {type:'Signal',
             value:{
                 xAxis:xAxis,
                 values:values,
                 name: sigLabel,
                 shortName: sigLabel
              },
              plots:plots};
  //console.log("TearsParser2.js::SignalFunction_counts OUT",JSON.stringify(res));

  return res;
},
SignalFunction_maxVal(_maxVal,_lp,signals,_rp){

  let signalList = signals.eval();
  //console.log("maxVal for list of signals ",signalList)
  let commonTimeLine  = [];
  signalList.forEach(s => {
    //console.log("Joining timeline for signal ",s.value,name)
    commonTimeLine = EvalContext.getInstance().joinTimelines(commonTimeLine, s.value.xAxis)
  })
  let joinedVals =[]
  signalList.forEach(s => {
    //console.log("Projecting on common timeline, signal= ",s.value.name)
    joinedVals.push(EvalContext.getInstance().projectSignalOnTimeline(s.value,commonTimeLine));
  })
  let transposedVals = [];  // t as row, values as columns.
  for(let i = 0; i < commonTimeLine.length;i++){
    let row = []
    joinedVals.forEach(s => {
      row.push(s[i]);
    });
    //console.log("Transposed row = ",row)
    transposedVals.push(row);
  }
 let res = [];
 transposedVals.forEach(row => {
   let m = Math.max(...row)
   res.push(m);
 });

// Create plots
var plots =[{exprStr: "Signal = maxVal(<list of signals>): maxVal(" + signals.sourceString + ")",
              signals:[
              ]
             }];
for(let i = 0; i < signalList.length; i++){
 console.log("collecting ",signalList[i])
  let se = signalList[i];
  let label = se.value.name ? se.value.name  : "Sub Expression";
  let signal = {
                  name:label,
                  shortName:label,
                  values:se.value.values,
                  xAxis:se.value.xAxis
    }
    plots[0].signals.push(signal);
}

signalList.forEach(s =>{
  if(s.plots) plots = plots.concat(s.plots);
});

  plots[0].signals.push(
          {
            name:"_Result",
            shortName:"_Result",
            xAxis:commonTimeLine,values:res
          }
  )
  console.log("PLOTS ",JSON.stringify(plots))
 return { type: "Signal",
          value: {
            values:res,
            xAxis:commonTimeLine,
            name:"maxVal(" + signals.sourceString + ")",
            shortName:"maxVal(" + signals.sourceString + ")"

          },
          plots:plots,
        };
},
Signal_parentheses:function(_lp,signal,_rp){
    var S1E = signal.eval();
    console.log("Signal_parentheses ", S1E)

    return S1E;
},

/*
SignalFunction =
     | select "(" Signal "," Signal "," Signal ")"     --select

 IF the control signal or the first signal is undefined
*/
SignalFunction_select:function(_fname,_lp,control,_comm1,signal1,_comm2,signal2,_rp){
    try{
      var SCE = control.eval();

    }catch(e){
      //console.log("Select signal does not exist, lets go for signal 2",e)
      return signal2.eval();
    }

    //console.log("Control is", SCE)
    if (SCE.hasOwnProperty("const") && SCE.const == true && SCE.value.values[0] == 1){
      // Only use first signal. No point emitting a plots
      return signal1.eval();
    }

    if (SCE.hasOwnProperty("const") && SCE.const == true && SCE.value.values[0] == 0){
      // Only use second signal. No point emitting a plots
      return signal2.eval();
    }
    // control signal was a real signal. A bit trickier..
    var S1E = signal1.eval();

    var S2E = signal2.eval();
    let commonTimeLine  = [];

    [SCE,S1E,S2E].forEach(s => {
      //console.log("Joining timeline for signal " + s.value.name)
      commonTimeLine = EvalContext.getInstance().joinTimelines(commonTimeLine, s.value.xAxis)
    })

    let joinedVals = [];

   [SCE,S1E,S2E].forEach(s => {
      //console.log("Projecting on  timeline for signal " + s.value.name)
      joinedVals.push(EvalContext.getInstance().projectSignalOnTimeline(s.value, commonTimeLine));
    })

    // JoinedVals contains exactly 3 signals with the same number of data points.
    // select creates a fourth by picking a value from S1 if SC[t] == true and S2 if SC[t] == false
    // for all samples t in comminTimeLine
   var res = []
   for(let i = 0; i < commonTimeLine.length;i++){
       if(joinedVals[0][i] > 0){
         res.push(joinedVals[1][i])
       }else{
         res.push(joinedVals[2][i])
       }
    }


  // PLOTS
  let sigLabel = "select(" + control.sourceString + "," +
                  signal1.sourceString + "," +
                  signal2.sourceString +                   ")"

   // Create return structure with type info

  var SG = {xAxis:commonTimeLine,
              values:res,
                  newName:sigLabel,
                  name:"select",
                  shortName:"select"
                };

      // We need a plot for this since it may behave strangely.
      // and we may need to fiddle with the parameter to tune the output.

      var options ={};

        //  options["Result"]    = {type:'R',y:min, markers:"S"};

      var plots =[{exprStr: "Signal = select(signal_control, signal_true, signal_false): " + sigLabel,
                    signals:[
                      {name:control.sourceString, shortName:"Control Signal",
                       xAxis:SCE.value.xAxis,values:SCE.value.values
                      },
                      {name:signal1.sourceString, shortName:"True Signal",
                       xAxis:S1E.value.xAxis,values:S1E.value.values
                      },
                      {name:signal2.sourceString, shortName:"False Signal",
                       xAxis:S2E.value.xAxis,values:S2E.value.values
                      },
                    {name:"_Result", shortName:"_Result",
                      xAxis:commonTimeLine,values:res
                    }
                    ],
                    options:options,
                  //  dygraph:{valueRange:[0,4]}
                  }];
        // Chain input arg plots
        if (typeof SCE.plots != 'undefined') plots.concat(SCE.plots);
        if (typeof S1E.plots != 'undefined') plots.concat(S2E.plots);
        if (typeof S2E.plots != 'undefined') plots.concat(S2E.plots);


    return {type:"Signal",
                value:SG,
                plots:plots};
},

SignalFunction_exists:function(_fname,_lp,identifier,_rp){
  //console.log("SignalFunction_exists resolving ",identifier.sourceString);

  try{
    var res = resolveAliases("Signal", identifier,true);
  }
  catch(e){
    //console.log("SignalFunction_exists exception when resolving alias:",res,e)
    return {type:"Signal",
            const:true,
            value:{
            xAxis:[-Number.MAX_VALUE,Number.MAX_VALUE],
            values:[0,0]}}
  }

  //console.log("SignalFunction_exists no except when resolving alias: ",res)
  if (res.hasOwnProperty('value')){
    {
         throw(errLocationFromNode(identifier) +
         ' ^Expected Signal or Signal alias, but resolved identifier "' + res.culprit +
         '" is defined as ' + res.value.type + ".");
    };
  }
  // We are pretty sure it is a signal indentifier or an unknown identifier
  res = EvalContext.getInstance().getSignal(res);
  if(res == undefined){
    res = 0;
  }
  else  res =  1 ;

  return {type:"Signal",
          const:true,
          value:{
          xAxis:[-Number.MAX_VALUE,Number.MAX_VALUE],
          values:[res,res]}}
},
EventFunctions_logStart:function(_keyw, _l,signal, _r){

    let SE = signal.eval();
    let data = SE.value;
    let start = 0;
    if (data.xAxis.length >0)
      start = data.xAxis[0]; // Signal log starts at first sample.
     var res = {type:"Events",value:[start]};
  return res;
},
EventFunctions_logEnd:function(_keyw, _l,signal, _r){

    let SE = signal.eval();
    let data = SE.value;
    let end = 0;
    if (data.xAxis.length >0)
      end = data.xAxis[data.xAxis.length - 1]; // Signal log ends at last sample.
     var res = {type:"Events",value:[end]};
  return res;
},
/*
   TimeFilter  =
        "longer than" Timeout                                         --atLeast
*/
TimeFilter_atLeast: function(_lt,to) {
  return {comp:">=",limit:to.eval()};
},
/*
   TimeFilter  =
     |  "shorter than" Timeout                                         --atMost
*/
TimeFilter_atMost: function(_st,to) {
  return {comp:"<=",limit:to.eval()};
},



/*=============================== EVENT ======================================*/
/*
 GuardedAssertion =
                   | when  EventGuard    (shall verify? EventsAssertion)*      --eventGA
*/
GuardedAssertion_eventGA: function(_when, guard, _shall, _verify, assertion) {

    //console.log("TEARS-2:GuardedAssertion_GuardedAssertion_eventGA");
    var GE = guard.eval();
    var G = [];
    var plots    = [];
    //console.log("Current Event Guard is ",G);
    //console.log("Current extra given evaluation is",moduleContext.currentGiven);
    if (moduleContext.currentGiven != undefined){
      var SR = moduleContext.currentGiven.value;
      G = operators.and(GE.value,SR);
      //console.log("resulting Guard           evaluated to:",JSON.stringify(res));
      if (typeof moduleContext.currentGiven.plots != 'undefined'){
        plots = moduleContext.currentGiven.plots;
      }
    } 
    else{
     G = GE.value;
    }


    moduleContext.currentGA ={G:G};
    var retVal = {times: {
               valid: G,
               pass:[],
               fail:[],
               ignored:[]},  // New! Extra assertion events not fail and not pass.
               guards:[],
               assertions:[],
               signals:moduleContext.usedSignals
               };
    var Ppass    = [];
    var Pfail    = [];
    var Pignored = []; // Events in within period that is not the first one.
   
    if (typeof GE.plots != 'undefined') plots.concat(GE.plots);
     
    retVal.guards = plots;
    
    //console.log("TEARS-2:GuardedAssertion_eventGA Guard Evaluated to ",JSON.stringify(GE));

    // TODO, Refuse more than one shall intervallassertion
    if (assertion.children.length >1){
      throw errLocationFromNode(assertion) +
          " ^ A guard can only have zero or one assertion."
    }

    for(var rep = 0; rep < assertion.children.length;rep++){
      var AE = assertion.children[rep].eval();
    //  console.log("GuardedAssertion_eventGA:  AE= ", JSON.stringify(AE));

      var A = AE.value;

      // NOTE 1.
      // Within in practice transforms all event guard events
      // to intervals. As opposed to the intervalGuard, these intervals
      // may overlap if the within timeout (tw) is less than g - g'.
      // C1 - the same assertion interval or event may  apply to several g
      // C2 - each guard must be regarded individually and assertions
      //      intervals or events must be re-considered.
      //
      // NOTE 2
      // An assertion interval may start before a guard, and continue through
      // next guard.
      // C1  we must only consider the part of the assertion interval
      //     that is >= g up to a length of tf.
      // C2  the assertion intervals or guards cannot be modified for all guardStr
      // C3  We should id mark the guards and the responses.

      // NOTE 3
      // There may be several assertion events that occurs within the
      // guards within intervals
      // C1 - We only consider the first event that occurs
      // C2 - As in note 1, it is necessary to look at each guard individually
      // C3 - We duly note the ignoder "passed" events in the tail.

      var case_nr = 0; // see case descriptions
      var tf = 0;   // for timeout
      var tw = 0;   // within timout

      if (AE.type.substring(0,9) == "Intervals"){
        if (typeof AE.within === 'undefined' && typeof AE.for === 'undefined'){
             case_nr = 1;
             // CASE 1 - EventGuard - INTERVALS, no within, no for
             //          For each g in G we have a
             //               pass at g if g is within an interval in A
             //               fail at g if A is within an interval in the complement of A
             //          More formal:
             //            P = G and A
             //            F = G and not A
        }
        else if (typeof AE.within !== 'undefined' && typeof AE.for === 'undefined'){
             case_nr = 2;
             tw = AE.within;
             // CASE 2 - EventGuard - INTERVALS within tw, no for
             //          For each g in G we have a
             //            pass at the leftmost overlap if the intervals
             //                  [[g, g+tw] for g in G] and A overlaps.
             //            Fail occurs at the end of each period [g, g+tw]
             //                  where there were no overlaps.
             //          More formal:
             //            S = A and GW
             //            P = rising_edge(S)
             //            F = [(g + to) for all g in G where p not in S]
        }
        else if (typeof AE.within != 'undefined' && typeof AE.for != 'undefined'){
               case_nr = 3;
               tw = AE.within;
               tf = AE.for;
          }
      } else { // (Events within tw) or (Intervals for ft) within tw
        if (typeof AE.within !== 'undefined' && typeof AE.for === 'undefined'){
               case_nr = 4;
               tw = AE.within;
          }
          else throw (errLocationFromNode(assertion) +
          " ^New case discovered for event G/A \n" + JSON.stringify(GE) +
          "\n" +   JSON.stringify(AE));
      }
      //console.log("GuardedAssertion_eventGA:  CASE NR= ", case_nr);
      if (case_nr < 4 ){
        // CASE 3 - EventGuard - INTERVALS within tw for tf
        //          The for interval must start in [g,g+tw] but
        //          can "stick out" from the that period.
        //          Further, since  (max(a_start,g) + tf) may exceed
        //          with start of next guard
        //          period, we cannot simply truncate the Assertions. (NOTE 2)
        //          If an assertion interval a starts before g + tw and
        //          continues for at least tf, we have a pass.
        //          If there is no assertion interval as above, the guard is
        //          considerd to have failed at g + tw + tf
        //          More formal:
        //          for each g in G we have a
        //            pass at (max(a_start,g) + tf) IF
        //                   a_start <= g + tw and
        //                   a_end >= (max(a_start,g) + tf
        //            fail at g + tw if above cannot be met for any a.

        // NOTE, it turns out that case 1,2 are special cases of case 3.
        /*
        // Smoketest:
        G = [1,4,5,9,20,30,40]
        A = [[0.5,2],
            [3.5,6.5],
            [10,13]];
        tw = 0;
        tf = 0;

        // end testcase
        */
       var res = within_for(G,A,tw,tf);
       Ppass = res.pass;
       Pfail = res.fail;


      }//if case_nr < 4
      else{
        // CASE 4 - EventGuard - INTERVALS for tf within tw
        //          for evaluates to events which makes CASE 4 == CASE 5
        // CASE 5 - EventGuard - EVENTS         within tw
        //          See NOTE 1,2
        //          Given the assertion events a in A partitioned
        //          over G:
        //          (for each g in G, collect all a in A within the interval [g,g+tw])
        //          For each g in G we have
        //             pass at first a occuring in [g,g+tw]
        //             fail if the partition is empty.
        //          More formal:
        //          GP = partition_events_by_intervals(A,G)
        //          P  = head(p) for p in GP
        //          F = G[i] where GP[i] is empty, for all indices i of G

        var GW = create_within_intervals_from_events(G,tw);
        var GP = partition_events_by_intervals(A,GW);

        for(var i = 0;i < GP.length;i++){
            var p = GP[i];
            if(p.length >0){           // if nonempty -> pick first element in each time partition.
              Ppass.push(p[0][0]);      // TODO:, each pass,fail should have a traceback to G.
              p.slice(1);
              p.forEach(e => Pignored.push(e[0])); // Note any igored events.
            }else{
              Pfail.push(G[i] + tw);   // indices for GP and  GW corresponds to G's indices.
            }
        }//for
        // The Pignore events must not be in the pass.(ignored event can be passed of next guard.)
        var reallyIgnored = [];
        Pignored.forEach(p => {
          if(!Ppass.includes(p)) reallyIgnored.push(p);
        });
        Pignored = reallyIgnored;
        var options ={};
        options["Guard"]= {type:'r',y:2 ,markers:'N'};
        options["_GuardW"]= {type:'w',y:2 ,markers:'w'};
        options["Assertion"]= {type:'r',y:1 ,markers:'N'};
        options["_Skipped E:"]= {type:'r',y:1 ,markers:'i'};
        retVal.guards.unshift({exprStr: "Evaluation : when " + guard.sourceString + " " + assertion.sourceString + "",
                      events:[
                        {name:"Guard",events:G},
                        {name:"Assertion",events:A},
                        {name:"_Skipped E:",events:reallyIgnored},
                      ],
                      intervals : [{name:"_GuardW",intervals:GW}],
                      options:options,
                      dygraph:{valueRange:[0,3]}
                    });
      }// case_nr >= 4

    //  console.log("GuardedAssertion_eventGA ",case_nr,"  Ppass= ", JSON.stringify(Ppass));
    //  console.log("GuardedAssertion_eventGA ",case_nr,"  Pfail= ", JSON.stringify(Pfail));

    if (typeof AE.plots != 'undefined'){
                retVal.assertions = AE.plots;
     }

    }// for one assertion

    retVal.times.pass = Ppass;
    retVal.times.ignored = reallyIgnored;
    retVal.times.fail = Pfail;
    //console.log("GuardedAssertion_eventGA:  Final Result retVal= ", JSON.stringify(retVal));

    return retVal;
},
/*   EventsAssertion =
                    | Intervals ForExpression WithinExpression     --forWithin
*/
 EventsAssertion_forWithin:function(intervals,forexp,withinexp) {
      var tw = withinexp.eval();
      var tf = forexp.eval();
      moduleContext.currentGA.tw = tw;

      var SE = intervals.eval()
      var S = SE.value;

      var P =  interval_for(S,tf);

      var res =  {type:"Events",
                  rule:"forWithin",
                  value:P,
                  within:tw
                 };

     res.plots = [];

    // TODO: DISCUSS, should we have assertion and guard plots altogether?

      if(typeof SE.plots !== 'undefined')res.plots =  res.plots.concat(SE.plots);

      return res;
},
/*   EventsAssertion =
                    | Intervals WithinExpression? ForExpression?     --withinFor
*/
 EventsAssertion_withinFor:function(intervals,within,forexp) {

      var tw = undefined;
      var tf = undefined;

      if (within.children.length>0){
        tw = within.children[0].eval();
        moduleContext.currentGA.tw = tw;
      }
      if (forexp.children.length>0){
        tf = forexp.children[0].eval();
        if(tw == undefined){
          throw(errLocationFromNode(within) +" ^Within expected.")
        }
      }

      var SE = intervals.eval()
      var S = SE.value;

      var res=  {type:"Intervals",
                 rule:"withinFor",
                 value:S,
                 within:tw,
                 for:tf};

      if(typeof SE.plots != 'undefined') res.plots = SE.plots;
      return res;
},
/*
EventsAssertion =
             | Events WithinExpression                                  --within
*/
EventsAssertion_within:function (events,within){

    var tw = within.eval();
    moduleContext.currentGA.tw = tw;

  //  console.log("EventsAssertion_within:function (events,within=",tw);

    var PE = events.eval()
    var P = PE.value;
    var res =  {type:"Events",
               rule:"within",
               value:P,
               within:tw};

    if(typeof PE.plots != 'undefined') res.plots = PE.plots;

    return res;
},
/*
    Events (Event Expression)=
           Events   and  Intervals                                --andIntervals
*/
Events_andIntervals:function(events,_and,intervals){
  // Keep all points in P that occurs within an interval in S
  var PE = events.eval();
  var P = PE.value;
  var SE = intervals.eval();
  var S = SE.value;
  var ret = events_and_intervals(P,S);



  var options ={};
      var L = "L:(" +  events.sourceString + ")";
      var R = "R:(" + intervals.sourceString + ")";
      options[L]           = {type:'r',y:3, markers:'N'};
      options[R]           = {type:'r',y:2,};
      options["_Result"]    = {type:'R',y:1, markers:"S"};

  var plots =[{exprStr: "Events = Events and Intervals: (" +
              events.sourceString + ") and (" + intervals.sourceString + ")" ,
                events:[
                  {name:L,events:P},
                  {name:"_Result", events:ret}
                ],
                intervals:[
                  {name:R,intervals:S}
                ],
                options:options,
                dygraph:{valueRange:[0,4]}
               }];


   if(typeof PE.plots != 'undefined') plots = plots.concat(PE.plots);
   if(typeof SE.plots != 'undefined') plots = plots.concat(SE.plots);
  return {type:"Events",value:ret,plots:plots};
},



/*   //  prohibit I or E, E or I, E and E
    Events=
             | Events   EventsConj  Events                                --conj
   EventsConj = or
             | after
*/
Events_conj:function(events1,conj,events2){
  var P1E = events1.eval();
  var P1 = P1E.value;
  var P2E = events2.eval();
  var P2 = P2E.value;

  var op = conj.sourceString;
  // TODO support after.
  if(op !== "or") throw(errLocationFromNode(conj) + " ^Operator " + op + " not yet implemented.")
   // OR
  var Pret = events_or_events(P1,P2);

  var options ={};
      var L = "L:(" +  events1.sourceString + ")";
      var R = "R:(" + events2.sourceString + ")";
      options[L]           = {type:'r',y:3, markers:'N'};
      options[R]           = {type:'r',y:2, markers:'N'};
      options["_Result"]    = {type:'R',y:1, markers:"N"};

  var plots =[{exprStr:"Events = Events "+ op + " Events:(" +
  events1.sourceString + ") " + op + " (" + events2.sourceString + ")",
                events:[
                  {name:L,events:P1},
                  {name:R,events:P2},
                  {name:"_Result", events:Pret}
                ],
                options:options,
                dygraph:{valueRange:[0,4]}
               }];

   if(typeof P1E.plots != 'undefined') plots = plots.concat(P1E.plots);
   if(typeof P2E.plots != 'undefined') plots = plots.concat(P2E.plots);

  return {type:'Events',value:Pret,plots:plots};
},
/*
Events=
     | Events ("+"|"-") Timeout                           --nudge
*/
Events_nudge:function(events, op, timeout){
  var P1E = events.eval();
  var P1 = P1E.value;
  var plus = false;
  if(op.sourceString === '+'){
    plus = true;
  }
  var to  = timeout.eval();
  var res = [];
  P1.forEach(p => {
    if(plus)
     res.push(p + to);
    else
     res.push(p - to);
  });
  if(typeof P1E.plots == 'undefined'){
    return {type:"Events",value:res}
  }else{
      return {type:"Events",value:res,plots:P1E.plots}
  }

},
/*
Sequence =  "sequence" Events WithinExpression? Store? ("->" Events WithinExpression Store? )*
*/
Sequence:function(_seq, events1, withins1,stores1, _arrow, events2, withins2, stores2){


  function P_to_T(P){   // Events to Trace vector
    var T =[];
    for (var i = 0 ; i < P.length; i++){
      T.push([[P[i],i]]);
    }
    return T;
  }
  function T_to_P(T){
    // Picks out the values of a trace.
    // The last value in each trace chain is selected.
    var P = [];
    T.forEach(t => {
      p.push(t[t.length -1][0]);
    });
    return P;
  }


var  traceSeq = false;       // Extended trace information on the console for debug.
if(traceSeq){
  console.group("TearsParser2.js::sequence");
}

 var seq_ctx = undefined; // Context of the evaluation /guard or assertion
 var fails   = [];        // Trace entries (starts at T0 and ends the node before fail)
                          // Fails are ackumulated over the iterations.
 var Ign     = [];        // Traces of events that matched on 1 but were ignored.
 var stored_timepoints = []; //{node (as 0->1->2),id, expr, value, valid, seqnrs}
 var plots = []; // Sub expression plots collected from E0 and E1...n-1

 // Starting points for the expression evaluations:
 var E0str  = events1.sourceString;
 var Pv0 =  [];       // Event of lefthand node P0
 var T0  =  [];       // Trace vector of the events of P0

 var E1 = undefined;
 var T1      = [];    // Trace (T0->T1) to be accumulated over all nodes.
 var t1       = evalOptional(withins1); // within timeout between P0 and P1
 var store_id = evalOptional(stores1);


 // PHASE 1 - Preparations
 // decide if the guard should be evaluated first.


 // sequence context impacts evaluation of for expressions.
 if(moduleContext.currentGA != undefined){
    // The sequence is evaluated in an assertion expression
    // We consider G as the starting point in the sequence.
    seq_ctx = "assertion";
    if(traceSeq){
      console.log("Sequence is evaluated within an ASSERTION. "+
                  "A->B becomes G->A->B (i.e.) Guard is implicit.")
    }
    if(t1 == undefined){
      throw (errLocationFromNode(withins1) + "^ A sequence in an assertion is "+
      "required to have a within statement for its first event");
    }

    Pv0 = moduleContext.currentGA.G;    // A->B->C effectively becomes G->A->B->C
    T0  = P_to_T(Pv0);    // Initial trace vector
    E1  =  events1;       // Next node to be evaluated (A in example above)

    if(traceSeq){
      console.log("Guard is implicit  Pv0 = ",JSON.stringify(Pv0),t1)
      console.log("                    T0 = ",JSON.stringify(T0))
    }
    var res = evaluate_transition("Guard",Pv0,T0,E1,t1);
    fails = fails.concat(res.failTraces);
    T1 = res.passTraces;

    if(typeof res.plots != 'undefined') plots = plots.concat(res.plots);

    if(store_id != undefined){
      stored_timepoints.push({node:0,id:store_id, expr:E1, events:res.passes,
                              valid:undefined, seqnrs:undefined});
    }

    Pv0 =  res.passes;      // New Pv0 (starting point for next iteration).
    T0  =  T1;             // starting point for next iteration (trace part)
    if(traceSeq){
      console.log("G->A resut         Pv1 = ",JSON.stringify(Pv0))
      console.log("                    T1 = ",JSON.stringify(T0))
    }
}else{
  // The sequence is in a guard expression
  // No extra node in the beginning,
  // but the tw argument imposes a limitation of the first
  // sequence node, meaning that we only consider events in the first tw seconds.

  seq_ctx = "guard";
  if(t1 == undefined){
    t1 = Number.MAX_VALUE; // Do not limit starting events.
  }
  var E0E = events1.eval(); // 0 since its the left in P0->P1
  if(typeof E0E.plots != 'undefined') plots = plots.concat(E0E.plots);
  Pv0 = E0E.value;
  E0str = events1.sourceString;

  if(traceSeq){
  console.log("When             Pv0 = ",JSON.stringify(Pv0));}
   Pv0 = events_and_intervals(Pv0,[[0,t1]]);  // First sequence node adjusted.
   T0 = P_to_T(Pv0);
  if(traceSeq){
     console.log("Within adjusted  Pv0 = ",JSON.stringify(Pv0),t1)
     console.log("Within adjusted   T0 = ",JSON.stringify(T0))}

  if(store_id != undefined){
    stored_timepoints.push({node:0,id:store_id, expr:E1, events:Pv0,
                            valid:undefined, seqnrs:undefined});
  }
}//is guard

// Phase 2 - evaluation of the remaining sequence nodes.

for (var node_ix = 0; node_ix < events2.children.length; node_ix++ ){
    // Now Pv0 and T0 contains the timebase and trace for lefthand side argument.
    // E0  ==> Pv0
    // Pv0 ==> T0

    E1 = events2.children[node_ix];
    t1 = withins2.children[node_ix].eval();

    res = evaluate_transition(E0str,Pv0,T0,E1,t1);

//  :evaluate_transition OUT: = fails: passes:, passTraces:, plot1

    fails = fails.concat(res.failTraces);

    if(typeof res.plots != 'undefined') plots = plots.concat(res.plots);
    /*
    console.group("TearsParser2.js::sequence  iteration results: ", node_ix + 1,);
    console.log( "Transition result: ",JSON.stringify(res,null, "...."));
    console.log( "Accumulated fails: ",JSON.stringify(fails));
    console.log( "Accumulated plots: ",JSON.stringify(plots));
    console.log( "Passes           : ",JSON.stringify(Pv0));
    console.log( "Passes (Traces)  : ",JSON.stringify(res.T1));
    */
    // Prepare for next iteration:
    Pv0 =  res.passes;
    T0  = res.passTraces;
    E0str = E1.sourceString;
    var stores2_eval = stores2.children[node_ix].eval();
    if(stores2_eval.length>0){
      stored_timepoints.push({node:node_ix + 1,
                              id:stores2_eval[0],
                              expr:E1,
                              events:Pv0,
                              valid:undefined,
                              seqnrs:undefined});
    }//store timepoints?
  }// foreachg seq node

if(traceSeq){
  console.group("TearsParser2.js::sequence  FINAL results: ");
//  console.log("Accumulated fails:   ",JSON.stringify(fails));

  console.log( "Accumulated  plots: ",JSON.stringify(plots));
  console.log( "Passes           :  ",JSON.stringify(Pv0));
  console.log( "Passes (Traces)  :  ",JSON.stringify(T0));
  console.groupEnd();
}
// Phase 4 - Package the results:

// Store the (guard / first assertion) node index for completed sequences.
var seq_nrs = [];
T0.forEach(trace => {
  seq_nrs.push(trace[0][1]);
});

// If the context is a guard, we have an extra node in the traces that we need
// to get rid of when presenting the results.
if(seq_ctx == 'assertion'){
  fails.forEach(trace => {trace.shift()});
  T0.forEach(trace    => {trace.shift()});
}

var expr = this.source.sourceString.substring(this.source.startIdx,
                                              this.source.endIdx);
if(stored_timepoints.length>0){
  // The stored timepoints are only valid during complete sequences
  var seq_intervals = [];
  T0.forEach(trace => {
    var s = trace[0][0];
    var e = trace[trace.length -1 ][0];
    seq_intervals.push([s,e]);            // Note does not contain potential guard.
  });
  stored_timepoints.forEach(store =>{
      store.valid = seq_intervals;
      store.seqnrs = seq_nrs;
      store.expr = expr;
      // Only keep events for valid sequences.
      var P = store.valid.slice(0);// Nudge start so start events are included.
      P.forEach(p => p[0] = p[0]-0.00000000001);
      store.events = events_and_intervals(store.events,store.valid);
      addConstDefAlias("Store","Events",store.id,store);
      if(traceSeq){
      console.log("TearsParser2.js::Sequence  Storing Timepoints ",
                   store.id,  JSON.stringify(store));}
  })
}//process stores

// The end result is a series of pass events. i.e all sequences ends in Pv0
// To be compatible with the old stuff, this is the main result.
// passes however contains the whole trace back to the G

// The fail vector contains traces (starting at P0, ending wherever it failed).
fails = fails.sort(function(a,b){
                      return a[0][0] - b[0][0];
                    });

  var res = Pv0;
  if(traceSeq){
  console.log("----------------- Final Result    ---------------------------\n");
  console.log("Result ", JSON.stringify(res));
  console.log("------------------------------------------------------------\n");
  console.groupEnd();}

  return{type:"Events",value:Pv0,plots:plots}
},

/*
Store =
        "store value" identifier "as" identifier              --val   <--- We should skip this one.
       |"store timepoint" "as" identifier                     --time
*/
Store_time:function(_store, _as, identifier){
    // Sequence evaluation is responsible for the details.
    return identifier.sourceString;
},
/*EventsExpr   =
            "(" Events ")"                                         --parentheses
*/
EventsExpr_parentheses:function(_lp,events,_rp){
    var P1E = events.eval();

    return P1E;
},

/*
    EventsExpr  =
              | Intervals and   Events                             --intervalAnd
*/
EventsExpr_intervalAnd:function(intervals,_and,events){
  // Keep all points in P that occurs within an interval in S
  var PE = events.eval();
  var P = PE.value;
  var SE = intervals.eval();
  var S = SE.value;
  var ret = events_and_intervals(P,S);

  var options ={};
      var L = "L:(" + intervals.sourceString + ")";
      var R = "R:(" +  events.sourceString + ")";
      options[L]           = {type:'r',y:3 };
      options[R]           = {type:'r',y:2 ,markers:'N'};
      options["_Result"]    = {type:'R',y:1, markers:"S"};

  var plots =[{exprStr: "Events = Intervals and Events: (" +
              intervals.sourceString + ")  and (" + events.sourceString + ")",
                events:[
                  {name:R,events:P},
                  {name:"_Result", events:ret}
                ],
                intervals:[
                  {name:L,intervals:S}
                ],
                options:options,
                dygraph:{valueRange:[0,4]}
               }];

  if(typeof SE.plots != 'undefined') plots = plots.concat(SE.plots);
  if(typeof P.plots != 'undefined')  plots = plots.concat(P.plots);

  return {type:"Events",value:ret,plots:plots};
},
/*
   EventsExpr (Event Expression) =
              | IntervalsExpr ForExpression                        --intervalFor
*/
EventsExpr_intervalFor:function(intervals,forexp){
  var tf = forexp.eval();
  var SE = intervals.eval();

  var S = SE.value;

  var P = interval_for(S,tf)

  var options ={};
      var L = "L:(" + intervals.sourceString + ")";
      options[L]           = {type:'r',y:2 };
      options["_Result"]    = {type:'R',y:1, markers:"S"};

  var plots =[{exprStr: "Events = Intervals for: (" + intervals.sourceString +
   ") " + forexp.sourceString,
                events:[
                    {name:"_Result", events:P}
                ],
                intervals:[
                  {name:L,intervals:S}
                ],
                options:options,
                dygraph:{valueRange:[0,3]}
               }];


   if(typeof SE.plots != 'undefined') plots  = plots.concat(SE.plots);

  return {type:"EventGuard",value:P,plots:plots};
},
/*
EventsExpr (Event Expression) =
              | definedEvents                                             --def
*/
EventsExpr_def: function(definedEvents){
  //console.log("EventsExpr_def: function(definedEvents){")
  // Outer level recursion protection (def-alias-def)
/*
  if(this._semantics.operations.eval.actionDict.EventsExpr_def.recursionStop != undefined)
   this._semantics.operations.eval.actionDict.EventsExpr_def.recursionStop += 1;
   else {
     this._semantics.operations.eval.actionDict.EventsExpr_def.recursionStop = 1;
   }
  if(this._semantics.operations.eval.actionDict.EventsExpr_def.recursionStop > 100){
    throw(errLocationFromNode(definedEvents) +
          ' ^Event definition "'  + definedEvents.sourceString +
          '" seems to be infinitly recursive!');
  }*/
  /*
  var identifier = definedEvents.sourceString;
  var res = {type:'idstring',value:identifier};
  var recursionLevels = []
  while (res.type === 'idstring'){
      recursionLevels.push(res.value);
      res = getConstDefAlias(res.value);
      if (res == undefined){
        console.log("EventsExpr_def: res == undefined")
        throw(errLocationFromNode(definedEvents) +
              ' ^Event definition expected, but identifier "'  + identifier +
              '" is not defined as an event expression.');
      }else if (recursionLevels.length > 15){
          var evals = "";

          recursionLevels.forEach(s=>evals = evals + "->" + s);
          throw(errLocationFromNode(definedEvents) +
                ' ^Event definition "'  + identifier +
                '" seems to be recursive!' + evals);
        }

  }*/
    var res = resolveAliases("Events", definedEvents)
    // res.culprit is the eval chain
    // res.value is either a const, or def. if const it is always wrong in this context.

    if (res.value.deftype === 'const'){
      throw(errLocationFromNode(definedEvents) + ' ^"' + res.culprit +
      '" defines a(n) ' + res.value.type + " expression, but an Events"+
      " expression was expected.");
    }

  // We only accept definitions of Events or the type Store
  // TODO: we could wrap this in a try block to ignore subseqent error msgs.
  var SE = undefined;
  if(res.value.deftype === 'Store'){
    SE = {value:res.value.value.events,type:"Events"};
  }else {
    SE =   res.value.value.eval();    // We evaluate regardless of definition type.
  }                                   // but the end result must be Events

  if (SE.type.substring(0,5) !== "Event"){
    throw(errLocationFromNode(definedEvents) + ' ^"' + res.culprit +
     '" defines a(n) ' + res.value.type.substring(0,9) +
     " expression, but an Events expression was expected.");
  }

  let plots = [];
  var res = {type:"Events",
            value:SE.value,
            }

 var options ={};
     options[definedEvents.sourceString]  = {type:'R',y:1, markers:"S"};

// A def truncates all its subplots (abstraction)  // TODO: Needs discussion.
 res.plots = [{exprStr: "Events = Def: " + definedEvents.eval(),
             events:[
               {name:definedEvents.sourceString,events:res.value}
             ],
             options:options,
             dygraph:{valueRange:[0,2]}
              }];
//  this._semantics.operations.eval.actionDict.EventsExpr_def.recursionStop -= 1;
//  console.log("EventsExpr_def evaluated ",res);
  return res;
},
/*
EventsExpr (Event Expression) =
              |"[" ListOf<Timeout, ","> "]"                              --list
*/

EventsExpr_list:function(_l,items,_r){

  var P = items.eval();
  if (P == undefined){
    P = [];
  }
  return {type:"Events",value:P};
},
NonemptyListOf:function(first,_, rest){
  var elements = [first].concat(rest.children);
  var A = [];
  elements.forEach(pex => {
    A.push(pex.eval())
  });

  return A;
},
EmptyListOf:function(){
  return undefined;
},
/*
    EventFunctions =
                risingEdge  "(" Intervals ")"                      --risingEdge
*/
EventFunctions_risingEdge:function(_re, _lp, intervals, _rp){
  var SE = intervals.eval();
  var S = SE.value;
  var P =  operators.rising_edge(S); // TODO:strip implementation

  var options ={};
      options[intervals.sourceString]  = {type:'r',y:2};
      options["_Result"]                = {type:'R',y:1, markers:"S"};
  var plots = [{exprStr: "Events = rising_edge(Intervals|Signal): rising_edge("
                + intervals.sourceString + ")" ,
              events:[
                {name:"_Result",events:P}
              ],
              intervals:[
                {name:intervals.sourceString,intervals:S}
              ],
              options:options,
              dygraph:{valueRange:[0,4]}
               }];
  if(typeof SE.plots != 'undefined') plots = plots.concat(SE.plots);
  return {type:"Events",
          value:P,
          plots:plots};
},
/*
    EventFunctions =
              | fallingEdge "(" Intervals ")"                      --fallingEdge
*/
EventFunctions_fallingEdge:function(_fe, _lp, intervals, _rp){
  var SE = intervals.eval();
  var S = SE.value;
  var P =  operators.falling_edge(S);// TODO:strip implementation

  var options ={};
      options[intervals.sourceString]  = {type:'r',y:2};
      options["_Result"]                = {type:'R',y:1, markers:"S"};
  var plots = [{exprStr: "Events = rising_edge(Intervals|Signal): rising_edge(" +
               intervals.sourceString + ")" ,
              events:[
                {name:"_Result",events:P}
              ],
              intervals:[
                {name:intervals.sourceString,intervals:S}
              ],
              options:options,
              dygraph:{valueRange:[0,4]}
               }];
  if(typeof SE.plots != 'undefined') plots = plots.concat(SE.plots);

  return {type:"Events",
          value:P,plots:plots};
},
/*
EventFunctions =
   | cycle"(" (Events ",")? Timeout ")"                --cycle
*/
EventFunctions_cycle:function(_keyw,_lp, events,_comma,timeout, _rp){

    var P = [EvalContext.getInstance().getXmin()];
    var plots = undefined;
    if(events.children.length>0){
      var PE = events.children[0].eval();
      plots = P.plots;
      P = PE.value;
      if(P.length>0)
        P = [P[0]];
    }//optional start Event
    var step = timeout.eval();
    var end = EvalContext.getInstance().getXmax();
    //console.log("TearsParser2.js::EventFunctions_cycle: END AT MAX ",step, end);
    for(var t = P[0] + step; t < end ; t = t + step){
      P.push(t);
    }

    // THIS ONE SHOULD NOT NEED A PLOT.
    //console.log("TearsParser2.js::EventFunctions_cycle RESULT:", step, JSON.stringify(P));
  return {type:'Events',value:P,plots:plots}
},


/*
   ForExpression    = for    Timeout
*/
 ForExpression: function(_for, timeout){
   return timeout.eval();
 },
 /*
     WithinExpression = within Timeout
 */
WithinExpression: function(_within, timeout){
  return timeout.eval();
},
/*
   Timeout (Timeout) = sign? inf                                  --inf
*/
Timeout_inf :function(sign, inf){
  //console.log("TEARS-2:Timout_inf",sign.sourceString);
  var s = sign.sourceString ;
  if (s == "" || s == "+")
  return Number.MAX_VALUE;
  else
   return -Number.MAX_VALUE;
},
/*

Timeout (Time and unit) = sign? inf               --inf
             | FloatOrConst TimeUnit?             --floatOrConst
*/
Timeout_floatOrConst: function (timeOrId, timeUnit ) {
    //console.log("TEARS-2:Timeout_floatOrConst",
    //            timeOrId.sourceString, ",",timeUnit.sourceString);
  var res = timeOrId.eval();
  var unit = timeUnit.sourceString;
  if(unit === 'ms'){
    return res = res/1000.0;
  }
//  console.log("TEARS-2:Timeout_floatOrConst",
//              timeOrId.sourceString, ",",timeUnit.sourceString, "RESULT:", res);
  return res; // Time and number are primitives (no return structure)
} ,
FloatOrConst_constOrAlias:function(identifier ){
 //console.log("TearsParser2::FloatOrConst_constOrAlias trying to resolve ", floatOrId.eval());
  var res = resolveAliases("Number or Timeout",identifier);
  if (res.value.type !== "Num_float" && res.value.type !== "Timeout"){
       throw(errLocationFromNode(identifier) +
       ' ^Expected Number or Timeout, but identifier "' + res.culprit +
       '" is defined as ' + res.value.type);
  }
  var v = res.value.value.eval();
  // console.log("TearsParser2::FloatOrConst_constOrAlias aliases resolved to", JSON.stringify(v));
  if (typeof v !== "number"){
           throw(errLocationFromNode(identifier) +
           ' ^Expected Number or Timeout, but identifier "' + res.culprit +
           '" is defined as ' + typeof v + ".");
   }

return v;
},/*
FloatOrConst_number:function(float ){
return float.eval();

},*/
/*Time  =   Float TimeUnit

Time:function (fval,timeUnit){
  var val = fval.eval();
  if(timeUnit.sourceString =="ms")
    val = val / 1000.0;    // TODO: Decide to always use seconds or milliseconds.
  return val;
},*/
  identifier:function(id){
    var ret = id.eval();
    //console.log("TEARS-2:identifier returning",ret );
    return ret;
  },
/*
  identifier ="'" idstring_quoted "'"                                   --quoted
*/
  identifier_quoted:function(lq, idstring_quoted, rq){
//    console.log("TEARS-2:idstring_quoted",idstring_quoted.sourceString );
    return idstring_quoted.sourceString; // {type:"identifier",value:idstring_quoted.sourceString};
  },
  /*
      idstring = ~digit ~keyword letter+ (specialChar | alnum)*
  */
  idstring :function(head,tail){
    var id = head.sourceString + tail.sourceString;
    //console.log("TEARS-2:idstring",id );

    return id;
  },
  idstring_quoted :function(str){
    var id = str.sourceString;
//    console.log("TEARS-2:idstring_quoted",id );
    return id;
  },

/*
    Num = FloatOrConst                                                    --float
*/
Num_float : function (floatOrConst){
  return floatOrConst.eval();
},
/*
    Num =
         | true | false                                                --boolean

Num_boolean : function (val){
  //console.log("TEARS-2:Num_boolean",val.sourceString )
  var valstr = val.sourceString
  if(valstr == "true"){
    return 1;
  }
  if(valstr == "false"){
    return 0;
  }
},*/
/*  TODO: This has been removed in current grammar. Probably better to use a
    Num_function =
          sample(Signal,Timout)
     Num =
         | Signal "at" identifier                                       --sample

Num_singleSample:function(signal, _at, identifier){

},
*/
/*
    Float = sign? digit+ ("." digit+)?
*/
  Float:function(sign,intPart,dot,fraction){
    var s = sign.sourceString ;
    var valstr = intPart.sourceString + dot.sourceString + fraction.sourceString
    var val = parseFloat(valstr)
    //console.log("TEARS-2:Integer",val );
    if (s == "" || s == "+")
      return val;
    else
      return -val;
  },
  IntegerOrConst_constOrAlias:function(identifier ){
   //console.log("TearsParser2::FloatOrConst_constOrAlias trying to resolve ", floatOrId.eval());
    var res = resolveAliases("Integer",identifier);
    if (res.value.type !== "Num_float" && res.value.type !== "Timeout"){
         throw(errLocationFromNode(floatOrId) +
         ' ^Expected Integer, but identifier "' + res.culprit +
         '" is defined as ' + res.value.type);
    }
    var v = parseInt(res.value.value.eval());
    // console.log("TearsParser2::FloatOrConst_constOrAlias aliases resolved to", JSON.stringify(v));
    if (typeof v !== "number"){
             throw(errLocationFromNode(floatOrId) +
             ' ^Expected Number or Timeout, but identifier "' + res.culprit +
             '" is defined as ' + typeof v + ".");
     }

  return v;
  },
  Integer:function(sign, intPart){
    var s = sign.sourceString ;

    var val = parseInt(intPart.sourceString )
    //console.log("TEARS-2:Integer",val );
    if (s == "" || s == "+")
      return val;
    else
      return -val;
  },


}); // semantics definition block.
    return semantics2;
}//end semantics
