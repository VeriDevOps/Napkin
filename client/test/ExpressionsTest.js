
import * as E from '../js/Expressions.js';
import * as Util from '../js/Util.js';
import bus from '../js/EventBus.vue';
import * as Operators from '../js/Operators.js'
import * as EvalContext from '../js/EvalContext.js';


function checkContext(){
  //  console.log("Current context is ")
  //  EvalContext.getInstance().dumpToConsole();
}
function beforeAll_global(){

}
describe('Expressions.', function() {
  console.group("ExpressionTest.js:::Expressions first level of describe... ");
  const XMAX = 265.53;
  const selectorLeverExpr = {"lhs": "SelectorLever", "operator": "==", "rhs": "0"};
  const tcoVehSpeedExpr = {"lhs":"TCOVehSpeed", "operator":">", "rhs":"45"};
  const accPedalPosExpr = {"lhs": "AcceleratorPedalPosition", "operator": ">=", "rhs": "20"};
  const engSpeedExpr = {"lhs": "EngineSpeed", "operator": ">", "rhs": "1000"};
  const retarderExpr = {"lhs": "TransmissionOutputRetarder", "operator": "==", "rhs": "1"};
  const selectorLeverIntervals = [[-0.01, 7.57], [13.75, XMAX]];
  const accPedalPosIntervals = [[63.29, 80.19], [95.44, 107.44], [120.34, 125.99],
                                [152.59, 156.09], [162.64, 163.19], [257.99, 259.49]];
  const engSpeedIntervals = [[66.71, 69.57], [70.31, 70.43], [70.67, 73.21],
                             [74.49, 125.55], [132.57, 133.07], [133.13, 133.33]];
  const retarderIntervals = [[87.29, 96.29], [112.29, 118.29], [128.29, 133.29]];

  beforeAll(function() {
      //console.log("ExpressionTest.js:::beforeAll ");
      const testSignals = readJSON('test/json/SimpleLogWithGear.jsondiff');
      /*var signalList = [];
      for (let signalId in testSignals) {
      	  let signal = testSignals[signalId];
      	  let shortName = Util.getShortName(signal.pretty_print);
      	  signalList.push({ 'shortName': shortName, 'data': signal });
      }
      */
      EvalContext.getInstance().setSignalsFromSagaJSONDIFF(testSignals);
      //console.log("ExpressionTest.js:::beforeAll resulting evaluation context:")
      //EvalContext.getInstance().dumpToConsole();
      bus.$emit('signal-list-updated');

  });

  /****************************************************************************/
  /* Valid times tests                                                        */
  /****************************************************************************/
  describe('Valid-times evaluation.', function() {
    console.log("ExpressionTest.js::'Second level describe Valid-times evaluation.'");
    checkContext();
    it('SimpleExpression evaluates', function() {

      var expr = E.ExprFactory.create(engSpeedExpr);
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), engSpeedIntervals);
    });

    it('SimpleExpression with reverserd order (const to the left) evaluates', function() {
      var expr = E.ExprFactory.create({"lhs": "1000", "operator": "<", "rhs": "EngineSpeed"});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), engSpeedIntervals);
    });

    it('AndExpression evaluates', function() {
      var expr = E.ExprFactory.create({"and": [engSpeedExpr, accPedalPosExpr]});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(),
                      [[66.71, 69.57], [70.31, 70.43], [70.67, 73.21],
                       [74.49, 80.19], [95.44, 107.44], [120.34, 125.55]]);
      assertIntervals(expr.children[0].getValidTimes(), engSpeedIntervals);
      assertIntervals(expr.children[1].getValidTimes(), accPedalPosIntervals);
    });

    it('OrExpression evaluates', function() {
      var expr = E.ExprFactory.create({"or": [engSpeedExpr, accPedalPosExpr]});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(),
                      [[63.29, 125.99], [132.57, 133.07], [133.13, 133.33],
                       [152.59, 156.09], [162.64, 163.19], [257.99, 259.49]]);
      assertIntervals(expr.children[0].getValidTimes(), engSpeedIntervals);
      assertIntervals(expr.children[1].getValidTimes(), accPedalPosIntervals);
    });

    it('Nested And/Or-Expressions evaluate', function() {
      var expr = E.ExprFactory.create({"and": [
        {"or": [retarderExpr, accPedalPosExpr]},
        engSpeedExpr]});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(),
                      [[66.71, 69.57], [70.31, 70.43], [70.67, 73.21],
                       [74.49, 80.19], [87.29, 107.44], [112.29, 118.29],
                       [120.34, 125.55], [132.57, 133.07], [133.13, 133.29]]);
      assertIntervals(expr.children[0].children[0].getValidTimes(), retarderIntervals);
      assertIntervals(expr.children[0].children[1].getValidTimes(), accPedalPosIntervals);
      assertIntervals(expr.children[1].getValidTimes(), engSpeedIntervals);
    });

    it('Function taking a SimpleExpression as argument evaluates', function() {
      var expr = E.ExprFactory.create({"function": {
        "name": "rising_edge", "args": [engSpeedExpr]}});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), [66.71, 70.31, 70.67, 74.49, 132.57, 133.13]);
      assertIntervals(expr.children[0].getValidTimes(), engSpeedIntervals);
    });

    it('Function taking a discrete signal as argument evaluates', function() {
      checkContext();
      var expr = E.ExprFactory.create({"function": {
        "name": "rising_edge", "args": [{"def": "SelectorLever_Mode"}]}});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), [5.55, 10.49, 17.02, 62.82]);
    });

    it('Between()-function evaluates', function() {
      var expr = E.ExprFactory.create({"function": {"name":
        "between", "args": [
          {"function": {"name": "rising_edge", "args": [{"def":"SelectorLever_Mode"}]}},
          {"function": {"name": "rising_edge", "args": [{"lhs":"Gear", "operator":">", "rhs":"5"}]}}]}});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), [[5.55, 8.311], [10.49, 12.711], [17.02, 63.421]]);
    });

    it('DefExpression evaluates', function() {
      var rootExpr = new E.RootExpression({"defines": [{"name": "kalle", "body": engSpeedExpr}]});
      var expr = E.ExprFactory.create({"def": "kalle"}, rootExpr);
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), engSpeedIntervals);
      assertIntervals(expr.children[0].getValidTimes(), engSpeedIntervals);
    });

    it('Nested And/Or/Def-Expressions evaluate', function() {
      var rootExpr = new E.RootExpression({"defines": [{"name": "kalle", "body": engSpeedExpr}]});
      var expr = E.ExprFactory.create({"and": [{"def": "kalle"}, accPedalPosExpr]}, rootExpr);
      expr.evaluate();
      assertIntervals(expr.getValidTimes(),
                      [[66.71, 69.57], [70.31, 70.43], [70.67, 73.21],
                       [74.49, 80.19], [95.44, 107.44], [120.34, 125.55]]);
      assertIntervals(expr.children[0].getValidTimes(), engSpeedIntervals);
      assertIntervals(expr.children[0].children[0].getValidTimes(), engSpeedIntervals);
      assertIntervals(expr.children[1].getValidTimes(), accPedalPosIntervals);
    });


    it('DefExpression containing a function evaluates', function() {
      var rootExpr = new E.RootExpression({"defines": [{
        "name": "kalle",
        "body": {"function": {
          "name": "rising_edge",
          "args": [{"def": "SelectorLever_Mode"}]}}}]});
      var expr = E.ExprFactory.create({"def": "kalle"}, rootExpr);
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), [5.55, 10.49, 17.02, 62.82]);
      assertIntervals(expr.children[0].getValidTimes(), [5.55, 10.49, 17.02, 62.82]);
    });

    it('StateExpression evaluates', function() {
      var expr = E.ExprFactory.create({"state": engSpeedExpr});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), engSpeedIntervals);
    });

    it('EventExpression evaluates', function() {
      var expr = E.ExprFactory.create({"event": {"function": {
        "name": "rising_edge", "args": [engSpeedExpr]}}});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(),
                      [66.71, 70.31, 70.67, 74.49, 132.57, 133.13]);
    });

    it('EventExpression evaluates to events (even if intervals are supplied)', function() {
      var expr = E.ExprFactory.create({"event": engSpeedExpr});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), [66.71, 70.31, 70.67, 74.49, 132.57, 133.13]);
      assertIntervals(expr.children[0].getValidTimes(), engSpeedIntervals);
    });

    it('GuardExpression, containing a StateExpression, evaluates', function() {
      var expr = E.ExprFactory.create({"guard": {"state": engSpeedExpr}});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), engSpeedIntervals);
    });

    it('GuardExpression, containing an EventExpression, evaluates', function() {
      var expr = E.ExprFactory.create({"guard": {"event": {"function": {
        "name": "rising_edge", "args": [engSpeedExpr]}}}});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(),
                      [66.71, 70.31, 70.67, 74.49, 132.57, 133.13]);
    });

    it('GuardExpression, containing both Event- and StateExpressions, evaluates', function() {
      var expr = E.ExprFactory.create({"guard": {
        "state": {"lhs": "SelectorLever", "operator": "==", "rhs": "1"},
        "event": {"function": {"name": "rising_edge", "args": [{"def": "SelectorLever_Mode"}]}}}});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), [10.49]);
    });

    it('AssertionExpression evaluates', function() {
      var expr = E.ExprFactory.create({"assertion": {"and": [engSpeedExpr, accPedalPosExpr]}});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(),
                      [[66.71, 69.57], [70.31, 70.43], [70.67, 73.21],
                       [74.49, 80.19], [95.44, 107.44], [120.34, 125.55]]);
    });

    it('Unfinished valid intervals are extrapolated to XMAX', function() {
      var expr = E.ExprFactory.create(selectorLeverExpr);
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), selectorLeverIntervals);
    });

    it('RootExpression with no guards evaluates to the entire x-axis', function() {
      var expr = new E.RootExpression({"assertion": tcoVehSpeedExpr});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), [[0, XMAX]]);
      assertIntervals(expr.children[0].getValidTimes(),
                      [[0, 0.35], [75.76, 131.8],[132.66, 132.98], [264.74, 265.53]]);
      assertIntervals(expr.children[0].children[0].getValidTimes(),
                    [[0, 0.35], [75.76, 131.8],[132.66, 132.98], [264.74, 265.53]]);
    });

    it('SequenceExpression evaluates', function() {
      var expr = E.ExprFactory.create({"->": [
        {"function": {"name":"rising_edge", "args": [{"lhs":"EngineSpeed", "operator":">", "rhs":"1000"}]}},
        {"function": {"name":"rising_edge", "args": [{"lhs":"Gear", "operator":">=", "rhs":"12"}]}}]});
        expr.evaluate();
        assertIntervals(expr.getValidTimes(), [79.27, 125.44]);
    });

    it('Timed SequenceExpression evaluates', function() {
      var expr = E.ExprFactory.create({"->": [
        {"function": {"name":"rising_edge", "args": [{"lhs":"EngineSpeed", "operator":">", "rhs":"1000"}]}},
        {"function": {"name":"rising_edge", "args": [{"lhs":"Gear", "operator":">=", "rhs":"12"}]},
                      "timing": [{"type":"within", "unit":"s", "value":"5"}]}]});
        expr.evaluate();
        assertIntervals(expr.getValidTimes(), [79.27]);
    });

    it('Chained timed SequenceExpression evaluates, there is no sequence', function() {
      var expr = E.ExprFactory.create({"->": [
        {"->": [{"function": {"name":"rising_edge", "args": [{"def":"SelectorLever_Mode"}]}},
                {"function": {"name":"rising_edge", "args": [{"lhs":"EngineSpeed", "operator":">", "rhs":"1000"}]},
                              "timing": [{"type":"within", "unit":"s", "value":"5"}]}]},
        {"function": {"name":"rising_edge", "args": [{"lhs":"Gear", "operator":">=", "rhs":"12"}]},
                      "timing": [{"type":"within", "unit":"s", "value":"10"}]}]});
        expr.evaluate();
        assertIntervals(expr.getValidTimes(), []);
    });

    it('Chained timed SequenceExpression evaluates, there is one sequence', function() {
      var expr = E.ExprFactory.create({"->": [
        {"->": [{"function": {"name":"rising_edge", "args": [{"def":"SelectorLever_Mode"}]}},
                {"function": {"name":"rising_edge", "args": [{"lhs":"EngineSpeed", "operator":">", "rhs":"1000"}]},
                              "timing": [{"type":"within", "unit":"s", "value":"10"}]}]},
        {"function": {"name":"rising_edge", "args": [{"lhs":"Gear", "operator":">=", "rhs":"12"}]},
                      "timing": [{"type":"within", "unit":"s", "value":"10"}]}]});
        expr.evaluate();
        assertIntervals(expr.getValidTimes(), [79.27]);
    });

    it('SequenceExpression converts its operands to rising_edge', function() {
      var expr = E.ExprFactory.create({"->": [
        {"lhs":"EngineSpeed", "operator":">", "rhs":"1000"},
        {"lhs":"Gear", "operator":">=", "rhs":"12"}]});
        expr.evaluate();
        assertIntervals(expr.getValidTimes(), [79.27, 125.44]);
    });

    it('BasicExpression with two signals evaluates', function() {
      var expr = E.ExprFactory.create(
        {"lhs":"fb_btn_pressed", "operator":"==", "rhs":"ready_to_run"});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(),
                      [[bus.getXmin(), 30], [35, 40], [45, 50], [90, 95], [130, 135], [180, 265.53]]);
    });

    //TODO: it('BasicExpression with a def and a signal evaluates')
  });

  /****************************************************************************/
  /* Pass/fail times tests                                                    */
  /****************************************************************************/
  describe('Pass/fail-times evaluation.', function() {
    it('No assertions (should be empty)', function() {
      var rootExpr = new E.RootExpression({"guard": {"state": engSpeedExpr}});
      rootExpr.evaluate();
      expect(rootExpr.getPassTimes()).toEqual([]);
      expect(rootExpr.getFailTimes()).toEqual([]);
    });

    it('Single assertion (no guards)', function() {
      var rootExpr = new E.RootExpression({"assertion": tcoVehSpeedExpr});
      rootExpr.evaluate();
      assertIntervals(rootExpr.getPassTimes(),
                      [[0, 0.35], [75.76, 131.8],[132.66, 132.98], [264.74, 265.53]]);
      assertIntervals(rootExpr.getFailTimes(),
                      [[0.35, 75.76], [131.8, 132.66], [132.98, 264.74]]);
    });

    it('interval-based assertion (state guards)', function() {
      var rootExpr = new E.RootExpression({
        "guard": {"state": {"and": [
          {"or": [retarderExpr, accPedalPosExpr]},
          engSpeedExpr]}},
        "assertion": tcoVehSpeedExpr
      });
      rootExpr.evaluate();
      assertIntervals(rootExpr.getPassTimes(),
                  [[75.76, 80.19], [87.29, 107.44], [112.29, 118.29],
                   [120.34, 125.55], [132.66, 132.98]]);
      assertIntervals(rootExpr.getFailTimes(),
                  [[66.71, 69.57], [70.31, 70.43], [70.67, 73.21],
                   [74.49, 75.76], [132.57, 132.66], [132.98, 133.07], [133.13, 133.29]]);
    });

    it('interval-based assertion having within-timing', function() {
      var tcoVehSpeedExprWithTiming = JSON.parse(JSON.stringify(tcoVehSpeedExpr));
      tcoVehSpeedExprWithTiming.timing = [{"type": "within", "unit": "s", "value": "2"}];
      var rootExpr = new E.RootExpression({
       "guard": {"state": engSpeedExpr},
       "assertion": tcoVehSpeedExprWithTiming
      });
      rootExpr.evaluate();
      assertIntervals(rootExpr.getPassTimes(),
                  [[75.76, 125.55], [132.66, 132.98]]);
      assertIntervals(rootExpr.getFailTimes(),
                  [[68.71, 69.57], [72.67, 73.21]]);
    });

    it('event-based assertion (guarded by a rising_edge-event + timeout)', function() {
      var tcoVehSpeedExprWithTiming = JSON.parse(JSON.stringify(tcoVehSpeedExpr));
      tcoVehSpeedExprWithTiming.timing = [{"type": "within", "unit": "s", "value": "3"}];
      var rootExpr = new E.RootExpression({
        "guard": {"event": {"function": {
            "name": "rising_edge",
            "args": [engSpeedExpr]}}},
        "assertion": tcoVehSpeedExprWithTiming
      });
      rootExpr.evaluate();
      assertIntervals(rootExpr.getPassTimes(), [75.78, 132.64]);
      assertIntervals(rootExpr.getFailTimes(), [69.70, 73.31, 73.67, 136.13]);
    });

    it('event sequence in assertion, timeout on the whole sequence', function() {
      var rootExpr = new E.RootExpression({
        "guard": {"state": {"->": [
          engSpeedExpr, {"lhs":"Gear", "operator":">=", "rhs":"11"}]}},
        "assertion":
          {"->": [
            {"lhs":"TCOVehSpeed", "operator":">", "rhs":"45"},
            {"lhs":"TCOVehSpeed", "operator":">", "rhs":"49", "timing": [{"type":"within", "unit":"s", "value":"2"}]}],
          "timing": [{"type":"within", "unit":"s", "value":"3"}]}
      });
      rootExpr.evaluate();
      assertIntervals(rootExpr.getPassTimes(), [132.74]);
      assertIntervals(rootExpr.getFailTimes(), [76.04, 82.27, 128.44]);
    });

    it('not gives the complement of the time interval', function() {
        var expr = E.ExprFactory.create({"not": {"lhs": "1000", "operator": "<", "rhs": "EngineSpeed"}});
        expr.evaluate();
        var validTimes = expr.getValidTimes();
        var compl = Operators.complement(engSpeedIntervals, bus.getXmin(), bus.getXmax());
        assertIntervals(expr.getValidTimes(), Operators.complement(engSpeedIntervals, bus.getXmin(), bus.getXmax()));
    });


    // it('event sequence in assertion, timeout on the first event in sequence', function() {
    //   var rootExpr = new E.RootExpression({
    //     "guard": {"state": {"->": [
    //       engSpeedExpr, {"lhs":"Gear", "operator":">=", "rhs":"11"}]}},
    //     "assertion": {"->": [
    //       {"lhs":"TCOVehSpeed", "operator":">", "rhs":"45", "timing": [{"type":"within", "unit":"s", "value":"3"}]},
    //       {"lhs":"TCOVehSpeed", "operator":">", "rhs":"49", "timing": [{"type":"within", "unit":"s", "value":"2"}]}]}
    //   });
    //   console.log("G-VALID: " + rootExpr.getValidTimes());
    //   console.log("A-VALID: " + rootExpr.getAssertion().getValidTimes());
    //   console.log("A[0]-VALID: " + JSON.stringify(rootExpr.getAssertion().children[0].children[0].getValidTimes()));
    //   console.log("A[1]-VALID: " + JSON.stringify(rootExpr.getAssertion().children[0].children[1].getValidTimes()));
    //   console.log("PASS: " + rootExpr.getPassTimes());
    //   assertIntervals(rootExpr.getPassTimes(), [76.86, 132.74]);
    //   assertIntervals(rootExpr.getFailTimes(), [82.27, 128.44]);
    // });
  });

  describe('Timing adjustments.', function() {
    it('for-adjustment in a basic expression', function() {
      var expr = E.ExprFactory.create(
        {"lhs": "EngineSpeed", "operator": ">", "rhs": "1000",
         "timing": [{"type":"for", "unit":"s", "value":"5"}]});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(), [[79.49, 125.55]]);
    });

    it('for-adjustment in a connective expression', function() {
      var expr = E.ExprFactory.create(
        {"and": [engSpeedExpr, accPedalPosExpr],
         "timing": [{"type":"for", "unit":"s", "value":"5"}]});
      expr.evaluate();
      assertIntervals(expr.getValidTimes(),
                      [[79.49, 80.19], [100.44, 107.44], [125.34, 125.55]]);
    });
  });

  describe('Validity checks.', function() {
    it('Known function of a valid expression is valid', function() {
      var expr = E.ExprFactory.create(
        {"function": {"name": "rising_edge", "args": [engSpeedExpr]}});
      expect(expr.isValid()).toBe(true);
    });

    it('Known function of an existing signal is valid', function() {
      var expr = E.ExprFactory.create(
        {"function": {"name": "rising_edge", "args": [{"def": "SelectorLever"}]}});
      expect(expr.isValid()).toBe(true);
    });

    it('Unknown function is invalid', function() {
      var expr = E.ExprFactory.create(
        {"function": {"name": "ris_edge", "args": [engSpeedExpr]}});
      expect(expr.isValid()).toBe(false);
    });

    it('Stand-alone signal outside a function is invalid', function() {
      var expr = E.ExprFactory.create(
        {"guard": {"event": {"def": "SelectorLever"}}});
      expect(expr.isValid()).toBe(false);
    });

    it('Valid configuration', function() {
      var expr =  E.ExprFactory.create({
        "config": {"lhs":"EngineSpeed", "operator":"==", "rhs":"defined"}});
      expect(expr.isValid()).toBe(true);
    });

    it('Invalid configuration', function() {
      var expr = E.ExprFactory.create({
        "config": {"lhs":"Engine", "operator":"==", "rhs":"defined"}});
      expect(expr.isValid()).toBe(false);
    });

    it('Valid parse tree', function() {
      var expr = new E.RootExpression({
        "defines": [{"name":"Se", "body": {"lhs":"SelectorLever", "operator":">", "rhs":"0"}}],
        "config": {"lhs":"Gear", "operator":"==", "rhs":"defined"},
        "constants": [{"name":"c", "float":1}],
        "aliases": [{"aliasName": "a", "signalName": "b.c.d"}],
        "guard": {"state": {"and": [{"lhs":"EngineSpeed", "operator":">", "rhs":"1000"}, {"def":"Se"}]}},
        "assertion": {"lhs":"TCOVehSpeed", "operator":">", "rhs":"45",
                      "timing": [{"type":"within", "unit":"s", "value":"3"}]},
        "file":"ga_1_2_3"
      });
      expect(expr.isValid()).toBe(true);
    });

    it('Invalid parse tree', function() {
      var expr = new E.RootExpression({
        "config": {"lhs":"Gear", "operator":"==", "rhs":"defined"},
        "guard": {"state": {"and": [{"lhs":"EngineSpeed", "operator":">", "rhs":"1000"}, {"def":"Se"}]}},
        "assertion": {"lhs":"TCOVehSpeed", "operator":">", "rhs":"45",
                      "timing": [{"type":"within", "unit":"s", "value":"3"}]},
        "file":"ga_1_2_3"
      });
    expect(expr.isValid()).toBe(false);
    });

    it('Defs with different names gives alid', function() {
        var expr = new E.RootExpression({
            "defines": [{"name": "the", "body" : {"lhs":"SelectorLever", "operator":">", "rhs":"0"}},
                        {"name": "thedef", "body" : {"lhs":"SelectorLever", "operator":">", "rhs":"0"}}]
        });
        expect(expr.isValid()).toBe(true);
    });

    it('Defs with same name gives inValid', function() {
        var expr = new E.RootExpression({
            "defines": [{"name": "thedef", "body" : {"lhs":"SelectorLever", "operator":">", "rhs":"0"}},
                        {"name": "thedef", "body" : {"lhs":"SelectorLever", "operator":">", "rhs":"0"}}]
        });
        expect(expr.isValid()).toBe(false);
    });

    it('Consts with different name gives valid', function() {
        var expr = new E.RootExpression({
            "constants": [{"name": "theconst", "float" : 1},
                        {"name": "thedef", "float" : 2}]
        });
        expect(expr.isValid()).toBe(true);
    });

    it('Consts with same name gives inValid', function() {
        var expr = new E.RootExpression({
            "constants": [{"name": "theconst", "float" : 1},
                        {"name": "theconst", "float" : 2}]
        });
        expect(expr.isValid()).toBe(false);
    });

    it('Alises with different names gives valid', function() {
        var expr = new E.RootExpression({
            "aliases": [{"aliasName": "thealias", "signalName": "sig1"},
                        {"aliasName": "thealias2", "signalName": "sig2"}]
        });
        expect(expr.isValid()).toBe(true);
    });

    it('Alises with same names gives invalid', function() {
        var expr = new E.RootExpression({
            "aliases": [{"aliasName": "thealias", "signalName": "sig1"},
                        {"aliasName": "thealias", "signalName": "sig2"}]
        });
        expect(expr.isValid()).toBe(false);
    });

    it('def in And/Or expr is valid expression', function() {
        var rootExpr = new E.RootExpression({"defines": [{"name": "kalle", "body": engSpeedExpr}]});
        var expr = E.ExprFactory.create({"and": [{"def": "kalle"}, accPedalPosExpr]}, rootExpr);
        expect(expr.isValid()).toBe(true);
    });

    it('Const in And/Or expr is valid expression', function() {
        var rootExpr = new E.RootExpression({"constants": [{"name": "kalle", "float": 2}]});
        var expr = E.ExprFactory.create({"and": [{"def": "kalle"}, accPedalPosExpr]}, rootExpr);
        expect(expr.isValid()).toBe(true);
    });

    it('not expression is valid', function() {
        var rootExpr = new E.RootExpression({"state": {"not": {"lhs": "SelectorLever", "operator": ">", "rhs": 10}}});
        expect(rootExpr.isValid()).toBe(true);
    });

  });

  describe('Auxiliary methods.', function() {
    it('Finds the body of a given def', function() {
      var rootExpr = new E.RootExpression({"defines": [{"name": "kalle", "body": engSpeedExpr}]});
      rootExpr.evaluate();
      expect(rootExpr.getDefBodyIfExists("kalle")).toEqual(engSpeedExpr);
      expect(rootExpr.getDefBodyIfExists("pelle")).toBeUndefined();
    });

    it('Extracts an s-valued "within"-term', function() {
      var expr = E.ExprFactory.create({"assertion":
        {"lhs": "EngineSpeed", "operator": ">", "rhs": "1000",
         "timing": [{"type":"within", "unit":"s", "value":"3"}]}});
      expect(expr.getWithinTimeInS()).toEqual(3);
    });

    it('Extracts an ms-valued "within"-term', function() {
      var expr = E.ExprFactory.create({"assertion":
        {"lhs": "EngineSpeed", "operator": ">", "rhs": "1000",
         "timing": [{"type":"within", "unit":"ms", "value":"3"}]}});
      expect(expr.getWithinTimeInS()).toEqual(3e-3);
    });

    it('Finds plottable expressions', function() {
      var expectedNames = ["AcceleratorPedalPosition", "kalle"];
      var rootExpr = new E.RootExpression({
        "defines": [{
          "name": "kalle",
          "body": {"lhs":"EngineSpeed", "operator":">", "rhs":"1000"}}],
        "guard": {"state": {"and": [
          {"def": "kalle"},
          {"lhs":"AcceleratorPedalPosition","operator":">=","rhs":"20"}]}}});
      rootExpr.evaluate();
      var actualNames = [];
      for (let expr of rootExpr.getPlottableExpressions()) {
        actualNames.push(expr.getLhs());
      }
      expect(actualNames.sort()).toEqual(expectedNames);
    });

    it('Stores RHS values for plottable expressions', function() {
      var expectedRhs = ["1000", "20", "45"];
      var rootExpr = new E.RootExpression({
       "guard": {"state": {"and": [engSpeedExpr, accPedalPosExpr]}},
       "assertion": tcoVehSpeedExpr
      });
      rootExpr.evaluate();
      var actualRhs = [];
      for (let expr of rootExpr.getPlottableExpressions()) {
        actualRhs.push(expr.getRhs());
      }
      expect(actualRhs.sort()).toEqual(expectedRhs);
    });
  });

  function assertIntervals(actual, expected) {
    const accuracy = 3;
    expect(actual).toBeDefined();
    expect(actual.length).toEqual(expected.length);
    for (let i=0; i<actual.length; i++) {
      for (let j=0; j<actual[i].length; j++) {
        expect(actual[i][j]).toBeCloseTo(expected[i][j], accuracy);
      }
    }
  }
});
