
const parser = require('../js/TearsParser.js');

/**
 * Tests that the parsing results in a correct json-structure.
 */

describe('TearsParser semantics, generating parse tree structure for', function() {
    const xExpr = {"lhs": "x", "operator": ">", "rhs": "1"};
    const yExpr = { "lhs": "y", "operator": "==", "rhs": "3"};
    const yExprWithTimeout = {"lhs": "y", "operator": "==", "rhs": "3",
                              "timing": [{"type": "within", "unit": "ms", "value": "3"}]};

    it('simple assertion', function() {
        var ga = "shall y==3";
        var expectedJson = JSON.stringify({ "assertion": yExpr });
        expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('simple timed assertion', function() {
        var ga = "shall y==3 within 3 ms";
        var expectedJson = JSON.stringify({ "assertion": yExprWithTimeout });
        expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('simple negatively timed assertion', function() {
        var ga = "shall y==3 within -3 ms";
        var yExprWithNegativeTimeout = modifyTiming(yExprWithTimeout, "value", "-3");
        var expectedJson = JSON.stringify({ "assertion": yExprWithNegativeTimeout });
        expect(parser.parse(ga)).toEqual(expectedJson);
    });

    xit('simple inf-timed assertion', function() {
        var ga = "shall y==3 within inf";
        var yExprWithInfTimeout = modifyTiming(yExprWithTimeout, "unit", "-");
        yExprWithInfTimeout = modifyTiming(yExprWithInfTimeout, "value", "inf");
        var expectedJson = JSON.stringify({ "assertion": yExprWithInfTimeout });
        expect(parser.parse(ga)).toEqual(expectedJson);
    });

    xit('simple negatively inf-timed assertion', function() {
        var ga = "shall y==1 within -inf";
        var yExprWithNegativeInfTimeout = modifyTiming(yExprWithTimeout, "unit", "-");
        yExprWithNegativeInfTimeout = modifyTiming(yExprWithNegativeInfTimeout, "value", "-inf");
        var expectedJson = JSON.stringify({ "assertion": yExprWithNegativeInfTimeout });
        expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('multiple assertions', function() {
        var ga = "shall y1==1 and y2>0";
        var expectedJson = JSON.stringify({
          "assertion": {
            "and": [{"lhs": "y1", "operator": "==", "rhs": "1"},
                    {"lhs": "y2", "operator": ">", "rhs": "0"}]
          }
        });
        expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('simple timed guard and assertion', function() {
      var ga = "when x>1 shall y==3 within 3ms";
	    var expectedJson = JSON.stringify({
        "guard": {"event": xExpr},
        "assertion": yExprWithTimeout
      });
      expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('simple ga with float values', function() {
      var ga = "when x>1.2 shall y==3.1 within 0.5s";
	var expectedJson = JSON.stringify({
            "guard": {"event": {"lhs": "x", "operator": ">", "rhs": "1.2"}},
            "assertion":
            {"lhs": "y", "operator": "==", "rhs": "3.1",
             "timing": [{"type": "within", "unit": "s", "value": "0.5"}]}
        });
        expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('file path', function() {
      var ga = "@ga_1_2_3\nwhen x>1 shall y==3";
	    var expectedJson = JSON.stringify({
        "guard": {"event": xExpr},
        "assertion": yExpr,
        "file": "ga_1_2_3"
      });
      expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('file path, including dots', function() {
      var ga = "@ga_1.2.3\nwhen x>1 shall y==3";
	    var expectedJson = JSON.stringify({
        "guard": { "event": xExpr},
        "assertion": yExpr,
        "file": "ga_1.2.3"
      });
      expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('no parentheses', function() {
      var ga = "when x1>1 and x2==0 or x3>0 shall y==3 within 5s";
	    var expectedJson = JSON.stringify({
        "guard": {"event": {
          "or": [
            {"and": [
              {"lhs":"x1", "operator":">", "rhs":"1"},
              {"lhs":"x2", "operator":"==", "rhs":"0"}]},
            {"lhs":"x3", "operator":">", "rhs":"0"}]}},
        "assertion": {"lhs":"y" ,"operator":"==", "rhs":"3",
                      "timing": [{"type":"within", "unit":"s", "value":"5"}]}});
      expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('parentheses, test 1', function() {
      var ga = "when (x1>1 and x2==0) or x3>0 shall y==3 within 3ms";
		  var expectedJson = JSON.stringify({
        "guard": { "event": {
          "or": [{
            "and": [{"lhs": "x1", "operator": ">", "rhs": "1"},
                    {"lhs": "x2", "operator": "==", "rhs": "0"} ]},
            {"lhs": "x3", "operator": ">", "rhs": "0"} ]}},
        "assertion": yExprWithTimeout
      });
      expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('parentheses, test 2', function() {
      var ga = "when ((x1>1 and x2==0) or ((x3>0 or x4==5) and x5>4)) shall y==3 within 3ms";
      var expectedJson = JSON.stringify({
        "guard": {"event": {
          "or": [{
            "and": [
              {"lhs": "x1", "operator": ">", "rhs": "1"},
              {"lhs": "x2", "operator": "==", "rhs": "0"} ]},
            {"and":
              [{"or": [
                  {"lhs": "x3", "operator": ">", "rhs": "0"},
                  {"lhs": "x4", "operator": "==", "rhs": "5"} ]},
               {"lhs": "x5", "operator": ">", "rhs": "4"}]
             }]
           }},
        "assertion": yExprWithTimeout
      });
      expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('"where", single "config"-signal', function() {
      var ga = "where\n\tsignal1 == defined\nshall\n\ty==3";
		  var expectedJson = JSON.stringify({
        "config": {"lhs": "signal1", "operator": "==", "rhs": "defined"},
        "assertion": yExpr
      });
      expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('"where", multiple "config"-signals', function() {
      var ga = "where\n\tsignal1 == defined and\n\tsignal2 > 1\nshall\n\ty==3";
		  var expectedJson = JSON.stringify({
        "config": {
          "and": [{"lhs": "signal1", "operator": "==", "rhs": "defined"},
                  {"lhs": "signal2", "operator": ">", "rhs": "1"}]},
        "assertion": yExpr
      });
      expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('def, one def and use it in a when', function() {
        var ga = "def kalle  x1 > 0 and x2 > 3 when kalle and x3 == 0 shall y == 3";
        var expectedJson = JSON.stringify({
          "defines":[{
            "name": "kalle",
            "body": {
              "and": [{"lhs":"x1","operator":">","rhs":"0"},
                      {"lhs":"x2","operator":">","rhs":"3"}]}}],
          "guard": {"event":{
            "and": [{"def":"kalle"},
                    {"lhs":"x3","operator":"==","rhs":"0"}]}},
          "assertion": yExpr
        });
        expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('def, two defs and use them in a while', function() {
	    var ga = "def kalle x1 > 0 def olle x2 < 6 while kalle or olle and x2 > 0 shall y == 3";
	    var expectedJson = JSON.stringify({
        "defines": [
          {"name": "kalle",
           "body": {"lhs":"x1","operator":">","rhs":"0"}},
          {"name":"olle",
           "body": {"lhs":"x2","operator":"<","rhs":"6"}}],
        "guard": {"state": {
          "and": [
            {"or": [{"def":"kalle"}, {"def":"olle"}]},
            {"lhs":"x2","operator":">","rhs":"0"}]}},
        "assertion": yExpr
      });
	    expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('use method call in a while', function() {
	var ga = "while between(A,B) shall y==3";
	var expectedJson = JSON.stringify({
            "guard": {"state": {"function": {
                "name":"between",
                "args": [{"def":"A"}, {"def":"B"}]}}},
            "assertion": yExpr
        });
        var p = parser.parse(ga);
	expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('nested method calls', function() {
	    var ga = "when between(A, rising(B), C) shall y==3";
	    var expectedJson = JSON.stringify({
        "guard": {"event": {"function": {
            "name":"between",
            "args": [{"def": "A"},
                     {"function": {
                       "name":"rising",
                       "args": [{"def": "B"}]}},
                     {"def": "C"}]}}},
        "assertion": yExpr
      });
	    expect(parser.parse(ga)).toEqual(expectedJson);
    });

    it('multiple operators, evaluation order from left to right', function() {
      const ga = "when x1>1 -> x2>2 -> x3>3";
	    const expectedJson = JSON.stringify({"guard": {"event": {
        "->": [{"->": [{"lhs": "x1", "operator": ">", "rhs": "1"},
                       {"lhs": "x2", "operator": ">", "rhs": "2"}]},
               {"lhs": "x3", "operator": ">", "rhs": "3"}]}}});
      expect(parser.parse(ga)).toEqual(expectedJson);
    });
});

function modifyTiming(timedExpr, key, value) {
  var modifiedExpr = JSON.parse(JSON.stringify(timedExpr));
  modifiedExpr.timing[0][key] = value;
  return modifiedExpr;
}
