import * as EvalContext from './EvalContext.js'
import tearsparser from './TearsParser.js';
import * as Util from './Util.js';
var thrift = require('thrift');
var parser = require('./gen-nodejs/parser.js'),
	ttypes = require('./gen-nodejs/parser_types');
const Expressions = require('./Expressions.js');
var server = thrift.createServer(parser, {
    parse_tree: function(ga) {
//      console.log("parse_tree: " + ga);
        let tearsExpr = ga.replace(/\s*\/\/.*\n/g, '\n').replace(/\/\*.*?\*\//g, "").replace(/\s*\/\*[\s\S]*?(\*\/|$)/g, '\n');
//      console.log("parse_tree: tearsExpr: " + tearsExpr);
        var matchResult = {succeeded: function() {return false;
            }};
        try {
            matchResult = tearsparser.match(tearsExpr);
            if(!matchResult.succeeded()) {
                return {status: 'FAIL_SYNTAX', result: matchResult.message, evaluation: empty_evaluation};
            }
        }
        catch(error) {
            // Usually this is due to a syntax error, so we treat it as such but log it on console.
            return {status: 'FAIL_SYNTAX', result: matchResult.message, evaluation: empty_evaluation};
        }
        // correct syntax, time to check semantics
        let parseTree  = tearsparser.getParseTree(matchResult);
        return JSON.stringify(parseTree);
    },
    quit: function() {
        process.exit(0);
    },
    test: function(ga, capture) {
        let evalContext =  EvalContext.getInstance();
//      console.log("test: now parse on capture");
        evalContext.setSignalsFromSagaJSONDIFF(JSON.parse(capture));
//      console.log("finished. now we have an EvalContext with loaded jsondiff data");


        let tearsExpr = ga.replace(/\s*\/\/.*\n/g, '\n').replace(/\/\*.*?\*\//g, "").replace(/\s*\/\*[\s\S]*?(\*\/|$)/g, '\n');
        var matchResult = {succeeded: function() {return false;
            }};
        try {
            matchResult = tearsparser.match(tearsExpr);
            if(!matchResult.succeeded()) {
                return {status: 'FAIL_SYNTAX', result: matchResult.message, evaluation: empty_evaluation};
            }
        }
        catch(error) {
            // Usually this is due to a syntax error, so we treat it as such but log it on console.
            return {status: 'FAIL_SYNTAX', result: matchResult.message, evaluation: empty_evaluation};
        }
//      console.log("We have a parse tree");
        // correct syntax, time to check semantics
        let parseTree  = tearsparser.getParseTree(matchResult);

        if(!evalContext.isValid()) {
//          console.groupEnd();
            return {status: 'FAIL_EVAL', causes: [], evaluation: empty_evaluation};
        }
//      console.log("evalContext is valid");
        var rootExpr = new Expressions.RootExpression(JSON.parse(parseTree));
//      console.log("we have a root expression");
        // Add consts in expression to event bus
        var consts = rootExpr.getConsts();
        //console.log("Tears.js::evaluate_tears_expression current consts " , consts);
        if(consts.length > 0) {
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

        if(aliases.length > 0) {
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
        if(!rootExpr.isValid()) {
            let causes = rootExpr.getInvalidityCauses();
            return {status: 'FAIL_EVAL', causes: causes, evaluation: empty_evaluation};
        }

        rootExpr.evaluate();
        let result = {"times": {
            }, "guards": [], "assertions": []};
        result.times.valid = rootExpr.getValidTimes();
        result.times.pass = rootExpr.getPassTimes();
        result.times.fail = rootExpr.getFailTimes();

        var ret = new ttypes.TestResult;
        ret.pass_intervals = result.times.pass;
        ret.fail_intervals = result.times.fail;
        return ret;
    }
}, {
    transport: thrift.TBufferedTransport,
    protocol: thrift.TBinaryProtocol
});

server.on('listening', function(e) {
        console.log(server.address().port);
        console.log("started");
    });

server.listen(0);
