var g={"editorText":"while A > 0 shall B>0",
"parseTree" : "{\"guard\":{\"state\":{\"lhs\":\"A\",\"operator\":\">\",\"rhs\":\"0\"}},\"assertion\":{\"lhs\":\"B\",\"operator\":\">\",\"rhs\":\"0\"}}",
"signals" :{"Signal_1":{"pretty_print":"A","newName":"A","xAxis":[-0.010000000009313226,62.820000000006985,131.48000000001048,150,259.47000000000116],"values":[0,16.666666666666664,-2.7777777777777777,2,0]},"Signal_2":{"pretty_print":"B","newName":"B","xAxis":[-0.010000000009313226,62.820000000006985,131.48000000001048,150,259.47000000000116],"values":[0,16.666666666666664,-2.7777777777777777,2,0]},"TimeStamps":{"pre":0.11999999999534339,"act01":8.389999999984866,"post":259.45000000001164}},
"evaluation": {"times":{"valid":[[62.820000000006985,131.48000000001048],[150,259.47000000000116]],"pass":[[62.820000000006985,131.48000000001048],[150,259.47000000000116]],"fail":[]},"guards":[{"exprStr":"A > 0","shortnames":["A","0"],"numPlots":2,"timelines":[[-0.010000000009313226,62.820000000006985,131.48000000001048,150,259.47000000000116],[-0.010000000009313226,259.47000000000116]],"values":[[0,16.666666666666664,-2.7777777777777777,2,0],[0,0]],"lhs":"A","rhs":"0","valid":[[62.820000000006985,131.48000000001048],[150,259.47000000000116]]}],"assertions":[{"exprStr":"B > 0","shortnames":["B","0"],"numPlots":2,"timelines":[[-0.010000000009313226,62.820000000006985,131.48000000001048,150,259.47000000000116],[-0.010000000009313226,259.47000000000116]],"values":[[0,16.666666666666664,-2.7777777777777777,2,0],[0,0]],"lhs":"B","rhs":"0","valid":[[62.820000000006985,131.48000000001048],[150,259.47000000000116]]}]}


var editorText = g.editorText;
var parseTree = g.parseTree;
var signals = g.signals;
var evaluation = g.evaluation

import * as Util        from '../js/Util.js';
import * as EvalContext from '../js/EvalContext.js';
import * as  tears      from '../js/Tears.js';
import * as parser      from  '../js/TearsParser.js';


describe('Full Test of custom Expression: ' + editorText, function() {
  beforeAll(function() {
      let ctx = EvalContext.getInstance()
      ctx.forceUnitTestSetTimeStamps(signals['TimeStamps']);
      for (let s in signals){
        console.log("Creating signal :",s,signals[s].pretty_print)
         if( s !== 'TimeStamps')
           ctx.createNewSignal(signals[s]);
      }
  });

    it('Syntax check.', function() {
        expect(parser.match(editorText).succeeded()).toBe(true);
    });

    it('Parse Tree:Assertion check', function() {
        var parseTree2 = JSON.parse(parser.parse(editorText));

        var expected = JSON.stringify(parseTree.assertion);
        var value = JSON.stringify(parseTree2.assertion);
        expect(value).toEqual(expected);
    });
    it('Parse Tree:Guard check', function() {
        var parseTree2 = JSON.parse(parser.parse(editorText));
        var expected = JSON.stringify(parseTree.guard);
        var value = JSON.stringify(parseTree2.guard);
        expect(value).toEqual(expected);
    });

    it('Valid Evaluation Check', function() {
      var res = tears.evaluate_tears_expression(editorText);

      var expected = evaluation;
      var value    = res.evaluation;
          expect(value).toEqual(expected);
    }); //it



}); // describe
