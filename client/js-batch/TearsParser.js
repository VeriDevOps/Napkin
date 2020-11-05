// const ohm = require('../assets/ohm.min.js');
// const tearsGrammar = require('../assets/tears_grammar.ohm');

// The ohm-grammar file needs to be loaded differently, depending on whether
// this is run from a command terminal or in a browser
var contents;

contents = "TearsGrammar {\n" +
		"GA = filename* Defines* Config* Guard? Assertion?\n" +
		"Defines = Define+\n" +
		"Define = caseInsensitive<\"def\"> defname  \"{\" Expr \"}\"\n" +
		"defname = param\n" +
		"Config = caseInsensitive<\"where\"> ComplexExpr\n" +
		"Guard = (caseInsensitive<\"while\"> | caseInsensitive<\"when\">) ComplexExpr\n" +
		"Assertion = caseInsensitive<\"shall\"> ComplexExpr\n" +
		"ComplexExpr = Expr\n" +
		"TimeExpr = TimeType sign TimeValue\n" +
		"TimeType = (caseInsensitive<\"within\"> | caseInsensitive<\"for\">)\n" +
		"TimeValue = (TimeValue2 | caseInsensitive<\"inf\">)\n" +
		"TimeValue2 = Float TimeUnit\n" +
		"Float = digit+ (\".\" digit+)?\n" +
		"TimeUnit = (\"s\" | \"ms\")\n" +
		"sign = (\"+\" | \"-\" | \"\")\n" +
		"Expr = LogicExpr (Conj LogicExpr)*\n" +
		"LogicExpr = (NonPara  | Para | Gafunction | defname) TimeExpr*\n" +
		"Para = \"(\" Expr \")\"\n" +
		"NonPara = Lhs Operator Rhs\n" +
		"Operator = (\"==\" | \"!=\" | \"~=\" | \">=\" | \">\" | \"<=\" | \"<\")\n" +
		"Lhs = Rhs\n" +
		"Rhs = param | limit\n" +
		"Gafunction = param (\" \" | \"\\n\" | \"\\t\")* \"(\" (\" \" | \"\\n\" | \"\\t\")* Funcargs (\" \" | \"\\n\" | \"\\t\")* \")\"\n" +
		"Funcargs = Expr (\",\" Expr)*\n" +
		"param = ~(caseInsensitive<\"while\"> | caseInsensitive<\"when\"> | caseInsensitive<\"shall\"> | caseInsensitive<\"for\"> | caseInsensitive<\"within\">) (\"_\" | letter)+ (\"_\" | alnum)*\n" +
		"limit = sign digit+ (\".\" digit+)?\n" +
		"Conj = (\"and\" | \"or\" | \"->\" | \"after\")\n" +
		"filename = \"@\" (alnum | \"_\" | \".\")+\n" +
		"}\n";


const ohm = require('../assets/ohm.min.js');
const grammar = ohm.grammar(contents);
const semantics = createSemantics();

module.exports = {
  parse(tearsExpr) {
    var matchResult = grammar.match(tearsExpr);
    if (matchResult.succeeded()) {
      return semantics(matchResult).parseTree();
    } else {
      console.log("parse: " + matchResult);
    }
  },
  match(expr) {
    return grammar.match(expr);
  },
}

/**
 * Rules for how to convert the result of GA-text parsing into a
 * json-representation of the parse tree.
 */
function createSemantics() {
  var self = this;
  var pCount = 0;
  var semantics = grammar.createSemantics();
  semantics.addOperation('parseTree', {
    GA: function(file, defines, config, guard, assertion) {
      pCount = 0;
      let fileStr = file.parseTree();
      let defStr = defines.parseTree();
      let configStr = [{}];
      try
      {
        configStr = config.parseTree();
      }
      catch(error)
      {
      }
      let guardStr = guard.parseTree();
      let assertionStr = assertion.parseTree();
      let ret = Object.assign({}, defStr[0], configStr[0], guardStr[0], assertionStr[0], fileStr[0]);
      ret = JSON.stringify(ret);
      // console.log("GA: " + ret);
      return ret;
    },
    Defines: function(def) {
      var d = def.parseTree();
      var ret = {};
      var ds = [];
      for (var i = 0; i < d.length; i++) {
        ds.push(d[i]);
      }
      ret["defines"] = ds;
      // console.log("defines: " + ret);
      return ret;
    },
    Define: function(def, defname, lcurly, expr, rcurly) {
      var e = expr.parseTree();
      var ret = {};
      ret["name"] = getLeafNodeName(defname);
      ret["body"] = e;
      // console.log("define: " + ret);
      return ret;
    },
    Config: function(key, complexExpr) {
      return {config: complexExpr.parseTree()};
    },
    Guard: function(key, complexExpr) {
      var ret = {};
      var item = {};
      var ce = complexExpr.parseTree();
      if(ce.hasOwnProperty("is") && Array.isArray(ce["is"][0][Object.keys(ce["is"][0])[0]]))
      {
        ce = ce["is"][0];
      }
      switch(getLeafNodeName(key))
      {
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
      // console.log("Guard: " + JSON.stringify(ret));
      return ret;
    },
    Assertion: function(key, complexExpr) {
      var ce = complexExpr.parseTree();
        var ret = { assertion: ce };
      // console.log("Assertion: " + JSON.stringify(ret));
      return ret;
    },
    ComplexExpr: function(expr/*, time*/) {
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
      var ret = {timing: {}};
      ret["timing"]["type"] = getLeafNodeName(type);

      let valueUnitStr = valueAndUnit.parseTree(); // No unit found
      if (valueUnitStr.length < 2)
      {
        valueUnitStr.push("-");
      }
      ret["timing"]["unit"] = valueUnitStr[1];
      ret["timing"]["value"] = getLeafNodeName(sign) + valueUnitStr[0];
      // console.log("TimeExpr: " + JSON.stringify(ret));
      return ret;
    },
    TimeValue: function(value) {
       let v = value.parseTree();
      return v;//[getLeafNodeName(value)].concat(unit.parseTree());
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
          ret=ret+"."+getLeafNodeName(dig2);
        }
        return ret;
    },
    Expr: function(llogicexpr, conj, rlogicexpr) {
      var left = llogicexpr.parseTree();
      var c = conj.parseTree();
      var ret;
      if(c.length > 0)
      {
        var right = rlogicexpr.parseTree();
        ret = createConj(left, c, right);
      }
      else
      {
        ret = left;
      }
      // console.log("Expr: " + JSON.stringify(ret));
      return ret;
    },
    LogicExpr: function(p, time) {
      var r = p.parseTree();
        var ret = Object.assign({ }, r);
        var parsedTime = time.parseTree();
        if (parsedTime.length > 0) {
          ret["timing"] = [ ];
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
      if(t.hasOwnProperty("rhs"))
      {
        t = t["rhs"];
      }
      var ret = {"lhs" : t};
      // console.log("lhs: " + JSON.stringify(ret));
      return ret;
    },
    Operator: function(op) {
      var ret = {operator: getLeafNodeName(op)};
      // console.log("operator: " + JSON.stringify(ret));
      return ret;
    },
    Rhs: function(rhs) {
      var t = rhs.parseTree();
      var ret = {rhs : t};
      // console.log("rhs: " + JSON.stringify(ret));
      return ret;
    },
    Conj: function(conj) {
      var ret = getLeafNodeName(conj);
      // console.log("Conj: " + ret);
      return ret;
    },
    defname: function(param) {
       return {def: getLeafNodeName(param)};
    },
    filename: function(trash, name) {
      var ret = {file: getLeafNodeName(name)};
      // console.log("file: " + JSON.stringify(ret));
      return ret;
    },
    Gafunction: function(functionname, ws1, lpar, ws2, args, ws3, rpar) {
      var ret = {};
      ret["function"] = {name: getLeafNodeName(functionname)};
      var retargs = [ ];

      var a = args.parseTree();
      //var ar = [];
      //for(var i = 0; i < a.length; i++)
      //{
      //	retargs.push(getLeafNodeName(a[i]));
      //}
      ret["function"]["args"] = a;
      // console.log("gafunction: " + JSON.stringify(ret));
      return ret;
    },
    Funcargs: function(param, comma, otherparams) {
      var op = otherparams.parseTree();
      var ret = createFuncArgs(param.parseTree(), op);
      // console.log("funcargs: " + JSON.stringify(ret));
      return ret;
    },
    param: function(key, p) {
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
function getLeafNodeName(node)
{
	let nodeName = "";
	if (node.isTerminal()) {
		// This is a leaf, return its name
		nodeName += node.primitiveValue;
	}
	else
	{
		// Search down the tree, until a leaf is found
		for(let i = 0; i < node.numChildren; i++) {
			nodeName += getLeafNodeName(node.child(i));
		}
	}
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
  }
  else {
    return left;
  }
}

function createFuncArgs(left, right) {
  var ret = [];
  ret.push(left);
  for(var i = 0; i < right.length; i++) {
    ret.push(right[i]);
  }
  return ret;
}
