
const parser = require('../js/TearsParser.js');
import bus from '../js/EventBus.vue';
import * as E from '../js/Expressions.js';
describe('TearsParser grammar, parsing', function() {
    var signal1 = {shortName: 'v_Vehicle_Ref', timestamps: [], data: {newName: 'v_Vehicle_Ref', xAxis: [], values: []}};
    beforeAll(function() {
        bus.$emit('signal-list-updated', [signal1]);
    });


    // A typical EARS-expression, involving WHILE
    it('simple while/shall EARS expressions', function() {
        expect(parser.match("while x==3 shall y==2").succeeded()).toBe(true);
        expect(parser.match("while x==3 shall y<-2").succeeded()).toBe(true);
        expect(parser.match("while x>-3 shall y<-2").succeeded()).toBe(true);
    });

    // A typical EARS-expression, involving WHEN (plus some typos)
    it('simple (but typoed) when/shall EARS expressions', function() {
        expect(parser.match("WheN x ==3 shall y==2").succeeded()).toBe(true);
    });

    // A typical TEARS-expression (corresponds to REG 13 & 15)
    it('simple while/shall/within TEARS expressions (REG 13 & 15), no space in time expression', function() {
        expect(parser.match("while x==3 shall y==2 within 5ms").succeeded()).toBe(true);
    });

    // A typical TEARS-expression (corresponds to REG 13 & 15)
    it('simple while/shall/within TEARS expressions (REG 13 & 15), space in time expression', function() {
        expect(parser.match("while x==3 shall y==2 within 5 ms").succeeded()).toBe(true);
    });

    // Line breaks are skipped
    it('Line breaks and tabs are ignored when parsing TEARS expressions', function() {
        expect(parser.match("while \n\tx==3 \nshall \n\ty==2 \nwithin 5ms").succeeded()).toBe(true);
    });

    // Alphanumeric parameter names accepted
    it('alphanumeric parameter names', function() {
        expect(parser.match("when x1==1 shall y3==2").succeeded()).toBe(true);
        expect(parser.match("when _x1==1 shall __y3==2").succeeded()).toBe(true);
        expect(parser.match("when x1==1 shall y==y3").succeeded()).toBe(true);
    });

    // Logical conjunctions are accepted
    it('logical conjunctions in TEARS expressions', function() {
        expect(parser.match("when x==1 and x1==1 shall y==2 within 5 ms").succeeded()).toBe(true);
    });

    // REG-pattern 1 & 2: "It is never/always the case that P holds".
    it('REG 1 & 2 as TEARS', function() {
        expect(parser.match("shall y==2").succeeded()).toBe(true);
    });

    // REG-pattern 3: "P eventually holds".
    it('REG 3 as TEARS', function() {
        expect(parser.match("shall y==1 within inf").succeeded()).toBe(true);
    });

    // REG4 is similar to REG 1 & 2, assuming that local parameters can be defined

    // REG-pattern 5: "It is always the case that if P holds, then S previously held".
    it('REG 5 as TEARS', function() {
        expect(parser.match("when x==1 shall y==2 within -inf").succeeded()).toBe(true);
    });

    // REG-pattern 6: "It is always the case that if P holds an is succeeded by S, then T previously held".
    it('REG 6 as TEARS', function() {
        expect(parser.match("when x==1 -> x1==1 shall y==2 within -inf").succeeded()).toBe(true);
        expect(parser.match("when x1==1 after x==1 shall y==2 within -inf").succeeded()).toBe(true);
    });

    // REG-pattern 7: "It is always the case that if P holds, then S previously held and was preceeded / succeeded by T".
    it('REG 7 as TEARS', function() {
        expect(parser.match("when x==1 shall y==1 -> y3==1 within -inf").succeeded()).toBe(true);
        expect(parser.match("when x==1 shall y3==1 after y==1 within -inf").succeeded()).toBe(true);
    });

    // REG-pattern 8: "It is always the case that if P holds, then S eventually holds".
    it('REG 8 as TEARS', function() {
        expect(parser.match("when x==1 shall y==2 within Inf").succeeded()).toBe(true);
    });

    // REG-pattern 9: "It is always the case that if P holds and is succeeded by S, then T eventually holds after S".
    it('REG 9 as TEARS', function() {
        expect(parser.match("when x==1 -> x1==1 shall y3==1 within inf").succeeded()).toBe(true);
    });

    // REG-pattern 10: "It is always the case that if P holds, then S eventually holds and is succeeded by T".
    it('REG 10 as TEARS', function() {
        expect(parser.match("when x==1 shall y==1 -> y3==1 within inf").succeeded()).toBe(true);
    });

    // REG-pattern 14: "If P holds, then S holds for at least c time units".
    it('REG 14 as TEARS', function() {
        expect(parser.match("shall y==2 within 3ms").succeeded()).toBe(true);
    });

    // REG-pattern 12 & 16: "If P holds, then S holds for at least c time units".
    it('REG 12 & 16 as TEARS', function() {
        expect(parser.match("when x==1 shall y==2 for 3 s").succeeded()).toBe(true);
    });

    it('event duration (for)', function() {
        expect(parser.match("when x==1 for 5ms shall y==1").succeeded()).toBe(true);
    });

    it('parentesis', function() {
        expect(parser.match("when (x1>1 and x2==0) or x3>0 shall y==3 within 5s").succeeded()).toBe(true);
    });

    it('the name of the GA-file', function() {
        expect(parser.match("@ga_1_2_3 shall y==1").succeeded()).toBe(true);
        expect(parser.match("@ga1.2.3 shall y==1").succeeded()).toBe(true);
    });

    it('"where"', function() {
        expect(parser.match("where signal == 1\nwhen (x1>1 and x2==0) or x3>0 shall y==3 within 5s").succeeded()).toBe(true);
        expect(parser.match("where signal == defined\nwhen (x1>1 and x2==0) or x3>0 shall y==3 within 5s").succeeded()).toBe(true);
        expect(parser.match("where\n\tsignal1 == defined and\n\tsignal2 == 0\nwhen (x1>1 and x2==0) or x3>0 shall y==3 within 5s").succeeded()).toBe(true);
    });

    it('Line break within subexpressions (e.g. "when\n\tx1>1 and\n x2>2") are parsed correctly', function() {
        expect(parser.match("@ga_1_2_3\nwhen\n\tx1>0 and\n\t x2==1\nshall\n\ty<-2\nwithin\n\t3ms").succeeded()).toBe(true);
    });

    it('"where", incomplete "config"-description should fail', function() {
      expect(parser.match("where\n\tsignal1 == defined and\n\tsignal2 >\nwhile\n\tx == 1\nshall\n\ty==3").succeeded()).toBe(false);
    });

    it('derive function in greater operation', function() {
        var expr = parser.match("where derive(v_Vehicle_Ref) > 1");
        expect(expr.succeeded()).toBe(true);
    });

    it('define a constant', function() {
	expect(parser.match("const kalle = 1").succeeded()).toBe(true);
    });

    it('intermix const and def', function() {
        expect(parser.match("const kalle = 1\ndef olle v > 2\nconst n2 = 4\ndef d5 v > 4").succeeded()).toBe(true);
    });

    it('define an alias', function() {
        expect(parser.match("alias speed = v_Vehicle_Ref").succeeded()).toBe(true);
    });

    it('alias followed by guard', function() {
        expect(parser.match("alias speed = v_Vehicle_Ref\nwhile speed > 10").succeeded()).toBe(true);
    });

    it('alias followed by const and guard', function() {
        expect(parser.match("alias speed = v_Vehicle_Ref\nconst speed_limit = 11\nwhile speed > speed_limit").succeeded()).toBe(true);
    });

    it('alias followed by const and guard is valid', function() {
        bus.addConsts([{name: "speed_limit", float: 11}]);
        bus.addAliases([{name: "speed", alias: {}}])
		var rootExpr = new E.RootExpression(JSON.parse(parser.parse("alias speed = v_Vehicle_Ref\nconst speed_limit = 11\nwhile speed > speed_limit")));
        expect(rootExpr.isValid()).toBe(true);
    });
});
