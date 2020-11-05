// The ohm-grammar file needs to be loaded differently, depending on whether
// this is run from a command terminal or in a browser
var contents = require('../assets/tears_grammar.ohm');
//if (typeof window === 'undefined') {
//    const fs = require('fs');
//    contents = fs.readFileSync(__dirname + '/../assets/tears_grammar.ohm');
//} else {
//    contents = require('../assets/tears_grammar.ohm');
//}
const Expressions = require('./Expressions.js');
//const bus = require('./EventBus.vue');
//import bus from "./EventBus.vue"
const ohm = require('../assets/ohm.min.js');
const grammar = ohm.grammar(contents);
const semantics = createSemantics();

module.exports = {

    // TODO Make this one obsolete since it does not return any useful syntax error info.
    parse(tearsExpr) {
        //console.log("TearsParser.js::parse parsing tearsExpr " + tearsExpr);
        var matchResult = grammar.match(tearsExpr);
        if (matchResult.succeeded()) {
            return semantics(matchResult).parseTree();
        } else {

            console.log("TearsParser.js::TEARS grammar match failed on the expression [" + tearsExpr + "], with msg " + matchResult.message);
        }
    },
    // Example call: checksyntax("while kalle").suceeded()==true;
    getParseTree(matchResult) {
        //console.log("TearsParser.js::getSemantics() " + JSON.stringify(matchResult));
        let pt = semantics(matchResult).parseTree();
        //console.log("TearsParser.js::getSemantics() got semantic tree" + JSON.stringify(pt));
        return pt;
    },

    match(expr) {
        //console.log("TearsParser.js::match() " + JSON.stringify());
      return grammar.match(expr);
    }
}//exports

/**
 * Rules for how to convert the result of GA-text parsing into a
 * json-representation of the parse tree.
 */
function createSemantics() {
    var self = this;
    var pCount = 0;
    var semantics = grammar.createSemantics();
    semantics.addOperation('parseTree', {
        GA: function(file, definesAndConstantsAndAlias, config, guard, assertion) {
            pCount = 0;
            let fileStr = file.parseTree();
            // let defStr = defines.parseTree();
            // let constsStr = constants.parseTree();
            let defsAndConstsAndAliasStr = definesAndConstantsAndAlias.parseTree();
            let configStr = [{}];
            try {
                configStr = config.parseTree();
            } catch (error) {}
            let guardStr = guard.parseTree();
            let assertionStr = assertion.parseTree();
            let ret = Object.assign({}, defsAndConstsAndAliasStr[0], configStr[0], guardStr[0], assertionStr[0], fileStr[0]);
            ret = JSON.stringify(ret);
            // console.log("GA: " + ret);
            return ret;
        },
        DefinesAndConstsAndAlias: function(elem) {
            var ret = {};
            var dc = elem.parseTree();
            var defs = [];
            var consts = [];
            var aliases = [];
            for (var i = 0; i < dc.length; i++) {
                if (dc[i].hasOwnProperty("name") && dc[i].hasOwnProperty("body"))
                    defs.push(dc[i]);
                else if (dc[i].hasOwnProperty("name") && dc[i].hasOwnProperty("float"))
                    consts.push(dc[i]);
                else if (dc[i].hasOwnProperty("aliasName") && dc[i].hasOwnProperty("signalName"))
                    aliases.push(dc[i]);
                else
                    throw ("Can't find expected sub element");
            }
            if (defs.length > 0)
                ret["defines"] = defs;
            if (consts.length > 0)
                ret["constants"] = consts;
            if (aliases.length > 0) {
                ret["aliases"] = aliases;
                //console.log("TearsParser::DefinesAndConstsAndAlias NEW ALIASES FOUND")
                //console.log(JSON.stringify(aliases));
            }
            return ret;
        },
        Define: function(def, defname, expr) {
            var e = expr.parseTree();
            var ret = {};
            ret["name"] = defname.parseTree().def; //because we have a rule for defname
            ret["body"] = e;
            //console.log("Tearsparser.js::Define, got new define as : " + JSON.stringify(ret));
            return ret;
        },
        Config: function(key, complexExpr) {
            return {
                config: complexExpr.parseTree()
            };
        },
        Constant: function(key, param, eq, limit) {
            return {
                name: param.parseTree(),
                float: parseFloat(limit.parseTree())
            };
        },
        Alias: function(key, name, eq, signalName) {
            return {
                aliasName: name.parseTree().def,  //because we have a rule for defname
                signalName: signalName.parseTree()
            };
        },
        Guard: function(key, complexExpr) {
            var ret = {};
            var item = {};
            var ce = complexExpr.parseTree();
            if (ce.hasOwnProperty("is") && Array.isArray(ce["is"][0][Object.keys(ce["is"][0])[0]])) {
                ce = ce["is"][0];
            }
            switch (getLeafNodeName(key)) {
                case "while":
                    item["state"] = ce;
                    break;
                case "when":
                    item["event"] = ce;
                    break;
                default:
                    item["undef"] = {};
            }
            ret["guard"] = item;
            //console.log("Guard: " + JSON.stringify(ret));
            return ret;
        },
        Assertion: function(key, complexExpr) {
            var ce = complexExpr.parseTree();
            var ret = {
                assertion: ce
            };
            // console.log("Assertion: " + JSON.stringify(ret));
            return ret;
        },
        ComplexExpr: function(expr /*, time*/ ) {
            var e = expr.parseTree();
            var ret = Object.assign({}, e);
            /*var parsedTime = time.parseTree();
        if (parsedTime.length > 0)
      {
          ret["timing"] = [ ];
          for (let i = 0; i < parsedTime.length; i++) {
            ret["timing"].push(parsedTime[i]["timing"]);
          }
        } */
            // console.log("ComplexExpr: " + JSON.stringify(ret));
            return ret;
        },
        TimeExpr: function(type, sign, valueAndUnit) {

            var ret = {
                timing: {}
            };
            ret["timing"]["type"] = getLeafNodeName(type);

            let valueUnitStr = valueAndUnit.parseTree(); // No unit found

            if (valueUnitStr.length < 2) {
                valueUnitStr.push("-");
            }
            ret["timing"]["unit"] = valueUnitStr[1];
            ret["timing"]["value"] = getLeafNodeName(sign) + valueUnitStr[0];
            // console.log("TimeExpr: " + JSON.stringify(ret));
            return ret;
        },
        TimeValue: function(value) {
            //console.log("TimeValue",value, getLeafNodeName(value));
            let v = getLeafNodeName(value);    // If we allow constants we probably need to use this instead: value.parseTree();
            if (v === "inf"){
               v = Number.MAX_VALUE;
                 return [v]; //[getLeafNodeName(value)].concat(unit.parseTree());
            }
            else{
               return value.parseTree();
            }
        },
        TimeValue2: function(value, unit) {
            return [getLeafNodeName(value)].concat(unit.parseTree());
        },
        TimeUnit: function(unit) {
            return getLeafNodeName(unit);
        },
        Float: function(dig1, dot, dig2) {
            var ret = getLeafNodeName(dig1);
            // if (typeof dot.sourceString !== "undefined") {
            if (isNotEmpty(dot.SourceString)) {
                ret = ret + "." + getLeafNodeName(dig2);
            }
            return ret;
        },
        NegatedLogicExpr: function(not, expr) {
            var e = expr.parseTree();
            return {
                not: e
            };
        },

        Expr: function(llogicexpr, conj, rlogicexpr) {
            var left = llogicexpr.parseTree();
            var c = conj.parseTree();
            var ret;
            if (c.length > 0) {
                var right = rlogicexpr.parseTree();
                ret = createConj(left, c, right);
            } else {
                ret = left;
            }
            // console.log("Expr: " + JSON.stringify(ret));
            return ret;
        },
        LogicExpr2: function(p, time) {
            var r = p.parseTree();
            var ret = Object.assign({}, r);
            var parsedTime = time.parseTree();
            if (parsedTime.length > 0) {
                ret["timing"] = [];
                for (let i = 0; i < parsedTime.length; i++) {
                    ret["timing"].push(parsedTime[i]["timing"]);
                }
            }
            // console.log("LogicalExpr: " + JSON.stringify(r));
            return ret;
        },
        NonPara: function(lhs, operator, rhs) {
            let lhsStr = lhs.parseTree();
            let opStr = operator.parseTree();
            let rhsStr = rhs.parseTree();
            var ret = Object.assign({}, lhsStr, opStr, rhsStr);
            // console.log("NonPara: " + JSON.stringify(ret));
            return ret;
        },
        Para: function(leftp, p, rightp) {
            var e = p.parseTree();
            // console.log("Para: " + JSON.stringify(e));
            return e;
        },
        Lhs: function(lhs) {
            var t = lhs.parseTree();
            if (t.hasOwnProperty("rhs")) {
                t = t["rhs"];
            }
            var ret = {
                "lhs": t
            };
            // console.log("lhs: " + JSON.stringify(ret));
            return ret;
        },
        Operator: function(op) {
            var ret = {
                operator: getLeafNodeName(op)
            };
            // console.log("operator: " + JSON.stringify(ret));
            return ret;
        },
        Rhs: function(rhs) {
            var t = rhs.parseTree();
            var ret = {
                rhs: t
            };
            // console.log("rhs: " + JSON.stringify(ret));
            return ret;
        },
        Conj: function(conj) {
            var ret = getLeafNodeName(conj);
            // console.log("Conj: " + ret);
            return ret;
        },
        defname: function(param) {
            //return {def: getLeafNodeName(param)};
            return {
                def: param.parseTree().replace("/s'/g'", "")
            };
        },
        filename: function(trash, name) {
            var ret = {
                file: getLeafNodeName(name)
            };
            // console.log("file: " + JSON.stringify(ret));
            return ret;
        },
        Gafunction: function(functionname, ws1, lpar, ws2, args, ws3, rpar, operator, rhs) {
            var op = operator.parseTree();
            var r = rhs.parseTree();
            var ret = {};
            ret["function"] = {
                name: getLeafNodeName(functionname)
            };
            var retargs = [];

            var a = args.parseTree();
            ret["function"]["args"] = a;
            if (op.length > 0 && r.length > 0) {
                ret["lhs"] = {};
                ret["lhs"]["function"] = JSON.parse(JSON.stringify(ret["function"]));
                delete ret["function"];
                ret["operator"] = op[0].operator;
                ret["rhs"] = r[0].rhs;
            }
            // console.log("gafunction: " + JSON.stringify(ret));
            return ret;
        },
        Funcargs: function(param, comma, otherparams){
            console.log("TearsParser::FuncArgs",param);
            var op = otherparams.parseTree();
            var ret = createFuncArgs(param.parseTree(), op);
            // console.log("funcargs: " + JSON.stringify(ret));
            return ret;
        },
        FuncArg:function(arg){
          //console.log("TearsParser::FuncArg",arg,arg.sourceString);
          if (arg.sourceString.toLowerCase() === "inf")
             return 200000000;// How long is infinity for a log file ? Number.MAX_VALUE;
          else if (arg.sourceString.toLowerCase() === "neginf")
             return -100000000;//Number.MAX_VALUE;
          var num = parseFloat(arg.sourceString);
          if (!isNaN(num))
            return num;

          return arg.parseTree();
        },
        param: function(param) {
            var temp = param.parseTree().replace("/s'/g","");
            // console.log("param: " + temp);
            return temp;
        },
        quotedparam: function(lquote, qparamstr, rquote) {
            var temp = qparamstr.parseTree();
            // console.log("param: " + temp);
            return temp;
        },
        paramstr: function(key, p) {
            var temp = key.sourceString;
            if (isNotEmpty(p.sourceString)) {
                temp = temp + p.sourceString;
            }
            // console.log("param: " + temp);
            return temp;
        },
        qparamstr: function(key, p) {
            var temp = key.sourceString;
            if (isNotEmpty(p.sourceString)) {
                temp = temp + p.sourceString;
            }
            // console.log("param: " + temp);
            return temp;
        },
        limit: function(sign, digit, dot, fraction) {
            var ret = getLeafNodeName(digit);
            if (isNotEmpty(dot.sourceString)) {
                ret = ret + "." + getLeafNodeName(fraction);
            }
            if (isNotEmpty(sign.sourceString)) {
                ret = sign.sourceString + ret;
            }
            return ret;
        }
    });
    return semantics;
}

/**
 * Find the leaf name for a node returned by the grammar
 */
function getLeafNodeName(node) {
    //console.log("getLeafNodeName:: reading type of node :: " + JSON.stringify(node.ctorName) );

    let nodeName = "";
    if (node.isTerminal()) {
        // This is a leaf, return its name
        nodeName += node.primitiveValue;
    } else {
        // Search down the tree, until a leaf is found
        for (let i = 0; i < node.numChildren; i++) {
            nodeName += getLeafNodeName(node.child(i));
            //console.log("function getLeafNodeName(node):: building[" + nodeName + "]") ;

        }
    }
    //console.log("function getLeafNodeName(node):: Returning [" + nodeName.trim() + "]") ;

    return nodeName.trim();
}

function isNotEmpty(str) {
    return str !== undefined && str.length > 0;
}

function createConj(left, conj, right) {
    if (conj.length > 0) {
        var temp = {};
        var lastConj = conj.splice(-1)[0];
        var lastRight = right.splice(-1)[0];
        temp[lastConj] = [createConj(left, conj, right), lastRight];
        return temp;
    } else {
        return left;
    }
}

function createFuncArgs(left, right) {
    var ret = [];
    ret.push(left);
    for (var i = 0; i < right.length; i++) {
        ret.push(right[i]);
    }
    return ret;
}
