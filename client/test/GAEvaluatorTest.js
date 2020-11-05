// TODO This should be rewritten to Tears.js

import Vue from 'vue';
import bus from '../js/EventBus.vue';
import * as Tears from '../js/Tears.js';
import * as EvalContext from '../js/EvalContext.js';

describex('Tears.js', function() {
  //const evaluator = new Vue(evaluatorVue);
  const XMAX = 265.53;
  const tcoVehSpeedExpr = {"lhs":"TCOVehSpeed", "operator":">", "rhs":"45"};
  const engSpeedExpr = {"lhs": "EngineSpeed", "operator": ">", "rhs": "1000"};
  const accPedalPosExpr = {"lhs": "AcceleratorPedalPosition", "operator": ">=", "rhs": "20"};

  beforeAll(function() {
    const testSignals = readJSON('test/json/SimpleLogWithGear.jsondiff');
    EvalContext.getInstance().setSignalsFromSagaJSONDIFF(testSignals);
    bus.$emit('signal-list-updated')
  });

  it('Tears.js evaluates expression correctly', function() {

    var parseTree = {
      "guard": {"state": {"and": [engSpeedExpr, accPedalPosExpr]}},
      "assertion": tcoVehSpeedExpr
    }
    //console.log("PARSE TREE ",JSON.stringify(parseTree))
    var result =  Tears.evaluate_tears_expression("while EngineSpeed > 1000 and AcceleratorPedalPosition >= 20 shall TCOVehSpeed > 45", true);
    //console.log("GOT RESULT ", JSON.stringify(result))
    // These make no sense to compare (tons of blurry data)
    delete result.timelines;
    delete result.values;
    var expectedResult =   {"status":"OK","evaluation":
                             {"times":
                             {"valid":[[66.71,69.57],[70.31,70.43],[70.67,73.21],[74.49,80.19],[95.44,107.44],[120.34,125.55]],
                              "pass":[[75.76,80.19],[95.44,107.44],[120.34,125.55]],
                              "fail":[[66.71,69.57],[70.31,70.43],[70.67,73.21],[74.49,75.76]]},
                              "guards":[{"exprStr":"EngineSpeed > 1000",
                                        "shortnames":["EngineSpeed","1000"],
                                        "numPlots":2,
                                        "lhs":"EngineSpeed",
                                        "rhs":"1000",
                                        "valid":[[66.71,69.57],[70.31,70.43],[70.67,73.21],[74.49,125.55],[132.57,133.07],[133.13,133.33]]},
                                        {"exprStr":"AcceleratorPedalPosition >= 20",
                                        "shortnames":["AcceleratorPedalPosition","20"],
                                        "numPlots":2,
                                        "lhs":"AcceleratorPedalPosition",
                                        "rhs":"20",
                                        "valid":[[63.29,80.19],[95.44,107.44],[120.34,125.99],[152.59,156.09],[162.64,163.19],[257.99,259.49]]}],
                              "assertions":[{"exprStr":"TCOVehSpeed > 45",
                                            "shortnames":["TCOVehSpeed","45"],
                                            "numPlots":2,
                                            "lhs":"TCOVehSpeed",
                                            "rhs":"45",
                                            "valid":[[0,0.35],[75.76,131.8],[132.66,132.98],[264.74,265.53]]}]}};//expected result
      expect(result).toEqual(expectedResult);
  });
});
