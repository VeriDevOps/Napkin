//import bus from './EventBus.vue';
import * as operators from './Operators.js';
import * as Util from './Util.js';
import * as EvalContext from './EvalContext.js'
/******************************************************************************/
class Expression {
    constructor(jsonExpr, parent) {
        this.jsonExpr = jsonExpr;
        this.children = [];
        this.invalidityCause = [];
        this.linkTo(parent);
        this.evalContext = EvalContext.getInstance();
        this.exprType = "Expression";
    }

    evaluate() { throw "abstract function evaluate() not implemented"; }

    getNumPlots() {
        throw "Must be used in a subclass";
    }

    getTimestamps(index) {
        throw "Must be used in a subclass";
    }

    getValues(index) {
        throw "Must be used in a subclass";
    }

    getShortName(index) {
        return this.getLhs();
    }

    toString() {
        return JSON.stringify(this.jsonExpr);
    }

    linkTo(parent) {
        if(parent !== undefined) {
            this.parent = parent;
            this.parent.children.push(this);
        }
    }

    isValid() {
        return this.areChildrenValid();
    }

    areChildrenValid() {
        var valid = true;
        this.children.forEach(child => {
                                  valid = child.isValid() && valid;
                              });
        return valid;
    }

    getValidTimes() {
        return this.validTimes;
    }

    getPlottableExpressions() {
        var plottableExpr = [];
        for(let child of this.children) {
            plottableExpr = plottableExpr.concat(child.getPlottableExpressions());
        }
        if(this instanceof PlottableExpression) {
            plottableExpr.push(this);
        }
        return plottableExpr;
    }

    getInvalidityCauses() {
        var causes = this.invalidityCause;
        for(let child of this.children) {
            causes = causes.concat(child.getInvalidityCauses());
        }
        return causes;
    }

    getDefBodyIfExists(name) {
        if(this.parent !== undefined)
            return this.parent.getDefBodyIfExists(name);
    }

    getConstIfExists(name) {
        if(this.parent !== undefined)
            return this.parent.getConstIfExists(name);
    }

    getAliasIfExists(name) {
        if(this.parent !== undefined)
            return this.parent.getAliasIfExists(name);
    }

    getConsts() {
        if(this.parent === undefined) {
            // can only do this on the root parent
            for(var i = 0; i < this.children.length; i++) {
                var child = this.children[i];
                if(child instanceof ConstantsExpression) {
                    return child.getConsts();
                }
            }
            return [];
        }
        else {
            return [];
        }
    }

    getAliases() {
        if(this.parent === undefined) {
            for(var i = 0; i < this.children.length; i++) {
                var child = this.children[i];
                if(child instanceof AliasesExpression) {
                    return child.getAliases();
                }
            }
            return [];
        }
        else {
            return [];
        }
    }

    //TODO: Currently the for- and within-method implementations seems to be identical. Hmm...
    getForAdjustedIntervals(originalTimes) {
        var forTime = this.getTimeExpressionsInS().for;
        if(forTime === undefined)
            return originalTimes;

        var adjustedTimes = [];
        originalTimes.forEach(originalTime => {
            var adjustedTime = originalTime.map((x, index) => index === 0 ? (x + forTime) : x);
            if(adjustedTime[0] <= adjustedTime[1])
                adjustedTimes.push(adjustedTime);
        });
        return adjustedTimes;
    }

    /**
     * Checks if this Expression has a 'within'-timing-term and returns its value, if so.
     * If unsuccessful, it continues the search in child expressions.
     *
     * //TODO: Currently it returns the first 'within'-term found. Should it be so?
     */
    getWithinTimeInS() {
        var timeout = this.getTimeExpressionsInS().within;
        if(timeout !== undefined)
            return timeout;
        for(let child of this.children) {
            let timeout = child.getWithinTimeInS();
            if(timeout !== undefined)
                return timeout;
        }
    }

    getTimeExpressionsInS() {
        if(this.jsonExpr.timing === undefined)
            return {
            };

        var timeValues = {
        };

        for(let timingExpr of this.jsonExpr.timing) {
            let scalingFactor = 1;
            if(timingExpr.unit === 'ms') {
                scalingFactor = 1e-3;
            }
            //console.log("Expressions.js::getTimeExpressionsInS:" + "Checking Timing expr " , this.jsonExpr.timing)
            var texpr =  parseFloat(timingExpr.value)
            if(isNaN(texpr)){
              // if is a constant. get it via signals itf
              texpr = this.evalContext.getSignal(timingExpr.value);
              if(texpr == undefined ||  !texpr.hasOwnProperty("isConst")){
                this.invalidityCause.push("Timing expr constant " + timingExpr.value + " not found.");
                return {};
              }
              texpr = texpr.values[0]
            }
            timeValues[timingExpr.type] = texpr * scalingFactor;
        }
        //console.log("Expressions.js::getTimeExpressionsInS:",timeValues);
        return timeValues;
    }//getTimeExpressionsInS

  /* Old impl without const support.
    getTimeExpressionsInS() {
        if(this.jsonExpr.timing === undefined)
            return {
            };

        var timeValues = {
        };
        for(let timingExpr of this.jsonExpr.timing) {
            let scalingFactor = 1;
            if(timingExpr.unit === 'ms') {
                scalingFactor = 1e-3;
            }
            timeValues[timingExpr.type] = parseFloat(timingExpr.value) * scalingFactor;
        }
        return timeValues;
    }*/



}//class

/******************************************************************************/
export class RootExpression extends Expression {
    constructor(jsonExpr) {
        super(jsonExpr);
        this.exprType = "RootExpression";
        for([key, value] of Object.entries(this.jsonExpr)) {
            let expr = ExprFactory.create({ [key]: value}, this);
            this[key] = expr;
        }
        // this.evaluate();
    }

    evaluate() {
        if(this.guard !== undefined) {
            this.validTimes = this.guard.evaluate();
        }
        else {
            this.validTimes = [ [0, this.evalContext.getXmax()]];
        }

        if(this.assertion !== undefined) {
            this.assertionValidityTimes = this.assertion.evaluate();
        }
        else {
            this.assertionValidityTimes = [];
        }

        if(Util.areIntervals(this.validTimes) &&
            Util.areEvents(this.assertionValidityTimes)) {
            throw "InvalidArgumentException: state-based guard (while) cannot lead to event-based assertion";
        }
    }

    getGuard() {
        return this.guard;
    }

    getAssertion() {
        return this.assertion;
    }

    getDefBodyIfExists(name) {
        if(this.defines !== undefined)
            return this.defines.getDefBodyIfExists(name);
    }

    getConstIfExists(name) {
        if(this.constants !== undefined)
            return this.constants.getConstIfExists(name);
    }

    getAliasIfExists(name) {
        if(this.aliases !== undefined)
            return this.aliases.getAliasIfExists(name);
    }

    getPassTimes() {
        if(this.assertion === undefined)
            return [];
        if(Util.areIntervals(this.validTimes))
            return operators.and(this.validTimes, this.assertionValidityTimes);
        else {
            var withinAdjustedGuardTimes = this.getWithinAdjustedTimestamps(this.validTimes);
            let x = operators.rising_edge(
                operators.and(withinAdjustedGuardTimes, this.assertionValidityTimes))
                .filter(res => res !== undefined);
            return x;
        }
    }

    getFailTimes() {
        if(this.assertion === undefined)
            return [];
        var invalidityTimes = operators.complement(this.assertionValidityTimes, 0, this.evalContext.getXmax());
        if(Util.areIntervals(this.validTimes)) {
            var withinAdjustedGuardTimes = this.getWithinAdjustedIntervals(this.validTimes);
            return operators.and(withinAdjustedGuardTimes, invalidityTimes);
        }
        else {
            var withinAdjustedGuardTimes = this.getWithinAdjustedTimestamps(this.validTimes);
            var potentialFailIntervals = operators.and(withinAdjustedGuardTimes, invalidityTimes);
            var timeout = this.getWithinTimeInS();
            if(timeout === undefined)
                timeout = 0;

            var failTimestamps = [];
            potentialFailIntervals.forEach(interval => {
                                               let timeoutExpiration = interval[0] + timeout;
                                               if(interval[1] >= timeoutExpiration)
                                                   failTimestamps.push(timeoutExpiration);
                                           });
            return failTimestamps;
        }
    }

    getWithinAdjustedTimestamps(originalTimes) {
        var timeout = this.getWithinTimeInS();
        if(timeout === undefined)
            timeout = 0;

        var adjustedTimes = [];
        originalTimes.forEach(originalTime => {
                                  adjustedTimes.push([originalTime, originalTime + timeout]);
                              });
        return adjustedTimes;
    }

    getWithinAdjustedIntervals(originalTimes) {
        var timeout = this.getWithinTimeInS();
        if(timeout === undefined)
            return originalTimes;

        var adjustedTimes = [];
        originalTimes.forEach(originalTime => {
                                  var adjustedTime = originalTime.map((x, index) => index === 0 ? (x + timeout) : x);
                                  if(adjustedTime[0] <= adjustedTime[1])
                                      adjustedTimes.push(adjustedTime);
                              });
        return adjustedTimes;
    }
}

/******************************************************************************/
class DefinesExpression extends Expression {
    constructor(jsonExpr,parent) {
        super(jsonExpr,parent);
        this.createNameBodyMap();
        this.exprType = "DefinesExpression";
    }

    createNameBodyMap() {
        this.defs = [];
        for(let def of this.jsonExpr.defines) {
            this.defs.push({name: def.name, body: def.body});
        }
    }

    getDefBodyIfExists(name) {
        var found = false;
        for(var i = 0; i < this.defs.length; i++)
            if(this.defs[i].name === name)
                return this.defs[i].body;
    }

    isValid() {
        var ret = true;
        for(var i = 0; i < this.defs.length; i++) {
            var name = this.defs[i].name;
            for(var j = 0; j < this.defs.length; j++) {
                if(i !== j && name === this.defs[j].name) {
                    this.invalidityCause.push(name);
                    ret = false;
                }
            }
            if(this.getConstIfExists(name) !== undefined) {
                this.invalidityCause.push(name);
                ret = false;
            }
            if(this.getAliasIfExists(name) !== undefined) {
                this.invalidityCause.push(name);
                ret = false;
            }
            if(this.evalContext.getSignal(name) !== undefined) {
                this.invalidityCause.push(name);
                ret = false;
            }
        }
        return ret;
    }
}

/******************************************************************************/
class ConfigExpression extends Expression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "ConfigExpression";
        ExprFactory.create(this.jsonExpr.config, this);
    }
}

/******************************************************************************/
class ConstantsExpression extends Expression {
    constructor(jsonExpr,parent) {
        super(jsonExpr, parent);
        this.exprType = "ConstExpression";
        this.createNameBodyMap();
    }

    createNameBodyMap() {
        this.consts = [];
        for(let c of this.jsonExpr.constants)
            this.consts.push({name: c.name, c: new ConstExpression(c, this)});
    }

    getConstIfExists(name) {
        for(var i = 0; i < this.consts.length; i++)
            if(this.consts[i].name === name)
                return this.consts[i].c;
    }

    getConsts() {
        var ret = [];
        for(var i = 0; i < this.consts.length; i++)
            ret.push(this.consts[i].name);
        return ret;
    }

    isValid() {
        // check that names are unique within const block and also does not clash with defs
        var ret = true;
        for(var i = 0; i < this.consts.length; i++) {
            var name = this.consts[i].name;
            for(var j = 0; j < this.consts.length; j++) {
                if(i !== j && name === this.consts[j].name) {
                    this.invalidityCause.push(name);
                    ret = false;
                }
            }
            if(this.parent.getDefBodyIfExists(name) !== undefined) {
                this.invalidityCause.push(name);
                ret = false;
            }
            if(this.parent.getAliasIfExists(name) !== undefined) {
                this.invalidityCause.push(name);
                ret = false;
            }
            var signal = this.evalContext.getSignal(name);
            if(signal !== undefined && !signal.hasOwnProperty("isConst")) {
                this.invalidityCause.push(name);
                ret = false;
            }
        }
        return ret;
    }
}

/******************************************************************************/
class AliasesExpression extends Expression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "AliasesExpression";
        this.createNameBodyMap();
    }

    createNameBodyMap() {
        this.aliases = [];
        for(let a of this.jsonExpr.aliases) {
          //console.log("Expressions.js::AliasesExpression::createNameBodyMap  " +   a.aliasName);
          let alias = {name: a.aliasName, alias: new AliasExpression(a, this)};
          //console.log("Expressions.js::AliasesExpression::createNameBodyMap ", alias);
          this.aliases.push(alias);
        }
    }

    getAliasIfExists(name) {
        //console.log("Expressions.js::AliasesExpression::getAliasIfExists ",this.aliases);
        for(var i = 0; i < this.aliases.length; i++) {
            if(this.aliases[i].name === name)
                return this.aliases[i];
        }
    }

    getAliases() {
        var ret = [];
        for(var i = 0; i < this.aliases.length; i++)
            ret.push(this.aliases[i].name);
        return ret;
    }

    isValid() {
        var ret = true;
        for(var i = 0; i < this.aliases.length; i++) {
            var name = this.aliases[i].name;
            for(var j = 0; j < this.aliases.length; j++) {
                if(i !== j && name === this.aliases[j].name) {
                    this.invalidityCause.push(name);
                    ret = false;
                }
            }
            if(this.getConstIfExists(name) !== undefined) {
                this.invalidityCause.push(name);
                ret = false;
            }
            if(this.getDefBodyIfExists(name) !== undefined) {
                this.invalidityCause.push(name);
                ret = false;
            }
            var signal = this.evalContext.getSignal(name);
            if(signal !== undefined && signal.shortName === name) {
                this.invalidityCause.push(name);
                ret = false;
            }
        }
        return ret;
    }
}

/******************************************************************************/
class AliasExpression extends Expression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "AliasExpression";
        this.name = jsonExpr.aliasName;
        this.alias = jsonExpr.signalName;
    }

    getNumPlots() {
        return 1;
    }

    getTimestamps(index) {
        var signal = this.evalContext.getSignal(this.name);
        return signal.xAxis;
    }

    getValues(index) {
        console.log("Expressions.js::AliasExpression::getValues ",this.name,this.alias);
        var signal = this.evalContext.getSignal(this.name);
        return signal.values;
    }
}

/******************************************************************************/
class FileExpression extends Expression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "FileExpression";
    }
}

/******************************************************************************/
class AssertionExpression extends Expression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "AssertionExpression";
        ExprFactory.create(this.jsonExpr.assertion, this);
    }

    evaluate() {
        this.validTimes = this.children[0].evaluate();
        return this.validTimes;
    }
}

/******************************************************************************/
class GuardExpression extends Expression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "GuardExpression";
        for([key, value] of Object.entries(this.jsonExpr.guard)) {
            this[key] = ExprFactory.create({ [key]: value}, this);
        }
    }

    evaluate() {
        var validTimes;
        if(this.state !== undefined) {
            validTimes = this.state.evaluate();
            if(this.event !== undefined) {
                validTimes = operators.and(validTimes, this.event.evaluate());
            }
        }
        else {
            validTimes = this.event.evaluate();
        }
        this.validTimes = validTimes;
        return this.validTimes;
    }
}

/******************************************************************************/
class StateExpression extends Expression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "StateExpression";
        ExprFactory.create(this.jsonExpr.state, this);
    }

    evaluate() {
        this.validTimes = this.children[0].evaluate();
        return this.validTimes;
    }
}

/******************************************************************************/
class EventExpression extends Expression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "EventExpression";
        ExprFactory.create(this.jsonExpr.event, this);
    }

    evaluate() {
        this.validTimes = this.children[0].evaluate();
        if(!Util.areEvents(this.validTimes)) {
            this.validTimes = operators.rising_edge(this.validTimes);
        }
        return this.validTimes;
    }
}

/******************************************************************************/
class ConnectiveExpression extends Expression {
    constructor(jsonExpr, parent, connective) {
        super(jsonExpr, parent);
        this.exprType = "ConnectiveExpression";
        this.connective = connective;
        ExprFactory.create(this.jsonExpr[connective][0], this);
        ExprFactory.create(this.jsonExpr[connective][1], this);
    }

    evaluate() {
        this.validTimes = operators[this.connective](this.children[0].evaluate(),
                                                     this.children[1].evaluate());
        //TODO: This should be standardized (lifted up in the hierarchy)
        console.log("ConnectiveExpression::this.validTimes = this.getForAdjustedIntervals(this.validTimes);")
        this.validTimes = this.getForAdjustedIntervals(this.validTimes);
        return this.validTimes;
    }

    getTimestamps(index) {
        return [];
    }

    getValues(index) {
        return [];
    }

    getLhs() {
        return this.children[0].getLhs() + " " + this.connective + " " + this.children[1].getLhs();
    }

    getExprStr() {
        return "(" + this.children[0].getExprStr() + ") " + this.connective + " (" + this.children[1].getExprStr() + ")";
    }
}

/******************************************************************************/
class AndExpression extends ConnectiveExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent, 'and');
        this.exprType = "AndExpression";
    }
}

/******************************************************************************/
class OrExpression extends ConnectiveExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent, 'or');
        this.exprType = "OrExpression";
    }
}

/******************************************************************************/
class SequenceExpression extends ConnectiveExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent, '->');
        this.exprType = "SequenceExpression";
    }

    evaluate() {
        var timeout = this.children[1].getTimeExpressionsInS().within;
        var precEvents = this.children[0].evaluate();
        if(Util.areIntervals(precEvents)) {
            precEvents = operators.rising_edge(precEvents);
        }
        var followEvents = this.children[1].evaluate();
        if(Util.areIntervals(followEvents)) {
            followEvents = operators.rising_edge(followEvents);
        }
        this.validTimes = operators.sequence(precEvents, followEvents, timeout);
        return this.validTimes;
    }

    getLhs() {
        return this.children[0].getLhs() + " -> " + this.children[1].getLhs();
    }
}

/******************************************************************************/
class PlottableExpression extends Expression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "PlottableExpression";
    }

    getLhs() {
        return this.toString();
    }

    getExprStr() {
        return this.getLhs();
    }

    getRhs() {
        return;
    }
}

/******************************************************************************/
class BasicExpression extends PlottableExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "BasicExpression";
        if(jsonExpr.lhs.hasOwnProperty("function"))
            ExprFactory.create(jsonExpr.lhs, this);
    }

    evaluate() {
        var xAxis = [];
        var lhsValues = [];
        var rhsValues = [];
        var intervals = [];
        var lastTickWasValid = false;
        var thisTickIsValid = false;
        var intervalStart = -1;

        if(Util.isNumeric(this.jsonExpr.lhs) && Util.isNumeric(this.jsonExpr.rhs)) {
            throw "Not implemented: BasicExpression.evaluate(constant <> constant)";
        }
        else if(Util.isNumeric(this.jsonExpr.rhs)) {
            [xAxis, lhsValues, rhsValues] = this.prepareForEvaluation(this.jsonExpr.lhs, this.jsonExpr.rhs);
        }
        else if(Util.isNumeric(this.jsonExpr.lhs)) {
            [xAxis, rhsValues, lhsValues] = this.prepareForEvaluation(this.jsonExpr.rhs, this.jsonExpr.lhs);
        }
        else {
            // For convenience, alias and const are treated as signals in the evaluation Context
            // rather that using the evaluate() function on the expressions.
            //console.log("Expressions.js::evaluate() ",this.jsonExpr.lhs,this.jsonExpr.rhs)
            let lhsSignal = this.evalContext.getSignal(this.jsonExpr.lhs);
            let rhsSignal = this.evalContext.getSignal(this.jsonExpr.rhs);
            if(lhsSignal === undefined || rhsSignal === undefined || lhsSignal == null || rhsSignal == null)
                return;

            xAxis = EvalContext.joinTimelines(lhsSignal.xAxis, rhsSignal.xAxis);
            lhsValues = this.evalContext.interpolateDataToTimeline(lhsSignal, xAxis);
            rhsValues = this.evalContext.interpolateDataToTimeline(rhsSignal, xAxis);
        }

        for(let i = 0; i < xAxis.length; i++) {
            thisTickIsValid = isExpressionValid[this.jsonExpr.operator](lhsValues[i], rhsValues[i]);
            if(thisTickIsValid && !lastTickWasValid) { // A new valid interval starts just now
                intervalStart = xAxis[i];
            }
            else if(!thisTickIsValid && lastTickWasValid) { // A valid interval is finished just now
                intervals.push([intervalStart, xAxis[i]]);
            }
            lastTickWasValid = thisTickIsValid;
        }
        if(thisTickIsValid) {
            let lastIndex = xAxis.length - 1;
            intervals.push([intervalStart, this.evalContext.getXmax()]);
        }
        this.validTimes = intervals;
        //console.log("BasicExpression::  this.validTimes = this.getForAdjustedIntervals(this.validTimes);");
        this.validTimes = this.getForAdjustedIntervals(this.validTimes);
        return this.validTimes;
    }

    getLhs() {
        if(this.jsonExpr.lhs.hasOwnProperty("function")) {
            return this.children[0].getLhs();
        }
        else {
            return this.jsonExpr.lhs;
        }
    }

    getExprStr() {
        return this.getLhs() + " " + this.jsonExpr.operator + " " + this.getRhs();
    }

    getRhs() {
        return this.jsonExpr.rhs;
    }

    getNumPlots() {
        return 2;
    }

    getShortName(index) {
        if(index === 1)
            return this.getLhs();
        else if(index === 2)
            return this.getRhs();
    }

    getTimestamps(index) {
        var side;
        if(index === 1) {
            side = this.jsonExpr.lhs;
        }
        else if(index === 2) {
            side = this.jsonExpr.rhs;
        }

        if(Util.isNumeric(side)) {
            return [this.evalContext.getXmin(), this.evalContext.getXmax()];
        }
        else if(side.hasOwnProperty("function")) {
            return this.children[0].getTimestamps(index);
        }
        else {
            var signal = this.evalContext.getSignal(side);
            if(signal !== undefined) {
                return signal.xAxis;
            }
        }
    }

    getValues(index) {
        var side;
        if(index === 1) {
            side = this.jsonExpr.lhs;
        }
        else if(index === 2) {
            side = this.jsonExpr.rhs;
        }

        if(Util.isNumeric(side)) {
            return [parseFloat(side), parseFloat(side)];
        }
        else if(side.hasOwnProperty("function")) {
            return this.children[0].getValues(index);
        }
        else {
            var signal = this.evalContext.getSignal(side);
            if(signal !== undefined) {
                return signal.values;
            }
        }
    }

    prepareForEvaluation(signalStr, constantStr) {
        var signal;

        if(signalStr.hasOwnProperty("function")) {

            this.children[0].evaluate();
            signal = {xAxis: this.children[0].getTimestamps(), values: this.children[0].getValues()};
        }
        else {
            signal = this.evalContext.getSignal(signalStr);
        }
        var constantValue = Number.parseFloat(constantStr);
        if(signal !== undefined && signal != null) {
            let xAxis = signal.xAxis;
            let signalValues = signal.values;
            let constantValues = Array(xAxis.length).fill(constantValue);
            return [xAxis, signalValues, constantValues];
        }
        else {
            return Array(3).fill([]);
        }
    }

    isValid() {
        var valid = true;
        for(let c of this.children)
            valid = valid && c.isValid();

        if(typeof this.jsonExpr.lhs === "string" && !Util.isNumeric(this.jsonExpr.lhs) && this.jsonExpr.lhs !== "defined") {
            if(this.evalContext.getSignal(this.jsonExpr.lhs) === undefined) {
                valid = false;
                this.invalidityCause.push(this.jsonExpr.lhs);
            }
        }
        if(typeof this.jsonExpr.rhs === "string" && !Util.isNumeric(this.jsonExpr.rhs) && this.jsonExpr.rhs !== "defined") {
            if(this.evalContext.getSignal(this.jsonExpr.rhs) == undefined) {
                valid = false;
                this.invalidityCause.push(this.jsonExpr.rhs);
            }
        }
        return valid;
    }
}

/******************************************************************************/
class FunctionExpression extends PlottableExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "FunctionExpression";
        var args = this.jsonExpr.function.args;
        for(let i = 0; i < args.length; i++) {
            ExprFactory.create(args[i], this);
        }
    }

    evaluate() {
        throw "Expression.js::evaluate: Cannot evalute. Must overload the FunctionExpression class for expression" + JSON.stringify(this.jsonExpr);
    }

    getLhs() {
        var fullName = this.jsonExpr.function.name + "(";
        for(let i = 0; i < this.children.length - 1; i++)
            fullName += this.children[i].getLhs() + ", ";
        fullName += this.children.slice(-1)[0].getLhs() + ")";
        return fullName;
    }

    getNumPlots() {
        return 1;
    }

    getTimestamps(index) {
        throw "Expression.js::getTimeStamps Must overload the FunctionExpression class";
    }

    getValues(index) {
        throw "Expression.js::getValues Must overload the FunctionExpression class";
    }

    getPlottableExpressions() {
        throw "Expression.js::getPlottableExpression Must overload the FunctionExpression class";
    }

    isValid() {
        var valid = Util.isFunctionDefined(this.jsonExpr.function.name);
        if(!valid) {
            this.invalidityCause.push(this.jsonExpr.function.name);
        }
        valid = this.areChildrenValid() && valid;
        return valid;
    }
}

/******************************************************************************/
class EdgeFunctionExpression extends FunctionExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "EdgeFunctionExpression";
    }

    evaluate() {
        var inputData = [];
        for(let i = 0; i < this.children.length; i++) {
            inputData.push(this.children[i].evaluate());
        }
        this.validTimes = operators[this.jsonExpr.function.name].apply(null, inputData);
        return this.validTimes;
    }

    /**
     *  Overrides the default behavior, by hiding *_edge-functions (and only
     *  showing their children). Other functions are plotted as normally.
     */
    getPlottableExpressions() {
        var plottableExpr = [];
        for(let child of this.children) {
            plottableExpr = plottableExpr.concat(child.getPlottableExpressions());
        }
        return plottableExpr;
    }

    isValid() {
        var valid = super.isValid() && this.children.length === 1;
        if (!valid){
          this.validTimes = undefined;
          this.invalidityCause.push("Edge functions take exactly one argument.");
          return false;

        }
        var arg1 = this.children[0].evaluate();
        console.log("EdgeFunctionExpression::isValid",this.children[0],arg1);

        if (this.children[0] instanceof NumericArgumentExpression){
          this.validTimes = undefined;
          this.invalidityCause.push("Argument is not an event series." + JSON.stringify(arg1));
          return false;
        }

        if (!Util.areEvents(arg1)){
          return valid;
        }else{
          this.invalidityCause.push("Edges cannot be detected on event series.")
        return false;
        }
    }
}

/******************************************************************************/
class DerivateFunctionExpression extends FunctionExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "DerivateFunctionExpression";
        this.timestamps = [];
        this.values = [];
    }

    evaluate() {
      var signal = {xAxis: this.children[0].getTimestamps(), values: this.children[0].getValues()};

      let xThreshold = 0;
      if (this.children.length == 2){
        // FIXME: this.children[1] = {"0":"1","1":"0"}
        // So we only get the first digit :/
        xThreshold =  this.children[1].evaluate();
      }
      var timestamps;
      var values;
      [timestamps, values] = operators.derivate(signal,xThreshold);
      this.timestamps = timestamps;
      this.values = values;

      return [];
    }

    getTimestamps(index) {
        return this.timestamps;
    }

    getValues(index) {
        return this.values;
    }

    getPlottableExpressions() {
        return [];
    }

    isValid() {
        if (this.children.length == 0){
          valid = false;
        }
        if (!this.children[0].jsonExpr.hasOwnProperty("def")){
            this.invalidityCause.push("First argument must be a signal name");
          return false;
        }
        if(this.children.length == 2 ){
          let c = this.children[1]
          if(!c.jsonExpr.hasOwnProperty("0")){
              this.invalidityCause.push("Second argument, x threshold should be a number");
              return false;
          }//&& Util.isNumeric(c.jsonExpr["0"]);
        }
        return super.isValid() && (this.parent instanceof BasicExpression ||
                                   this.parent instanceof FunctionExpression);
    }
}

/******************************************************************************/
class ApplyBitMaskFunctionExpression extends FunctionExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "ApplyBitMaskFunctionExpression";
        this.values = undefined;
        this.timestamps = undefined;
        this.validTimes = undefined;
        //console.log("Expression.js::ApplyBitMaskFunctionExpression ",jsonExpr);
    }

    evaluate() {
        this.mask   = this.children[0].evaluate();
        this.signal = this.children[1].evaluate();

        var timestamps;
        var values;
        [timestamps, values] = operators.apply_bit_mask(this.mask, this.signal);
        this.timestamps = timestamps;
        this.values = values;
        this.validTimes = timestamps;
        return this.validTimes;
    }

    getTimestamps(index) {
        return this.timestamps;
    }

    getValues(index) {
        return this.values;
    }

    getPlottableExpressions() {
        var plottableExpr = [];
        for(let child of this.children) {
            plottableExpr = plottableExpr.concat(child.getPlottableExpressions());
        }
        return plottableExpr;
    }

    isValid() {

      if (this.children.length != 2){

        this.invalidityCause.push("Wrong number of arguments to apply_bit_mask function");
        return false;
      }
      if(!this.children[0].hasOwnProperty("number")){
        this.invalidityCause.push("First argument to apply_bit_mask must be a number");
        return false
      }
      if(!this.children[1].hasOwnProperty("name")){
        this.invalidityCause.push("Second argument to apply_bit_mask must be a signal name");
        return false
      }
      if(  this.signal = this.children[1].evaluate() == undefined){
          this.invalidityCause.push("Second argument to apply_bit_mask must be a VALID signal name");
          return false;
      }

        return true;
    }
}
/******************************************************************************/
class BetweenFunctionExpression extends FunctionExpression {


    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.valid = undefined;
        this.exprType = "BetweenFunctionExpression";
    }

    _mark_invalid(cause){
      this.valid = false;
      this.timestamps = undefined;
      this.validTimes = undefined;
      this.invalidityCause.push(cause);
      return;
    }
    evaluate() {
      /// The between function accepts :
      // between (EventExpression,EventExpression)
      // between(absolute time in seconds, absolute time in seconds)
      // between(eventExpression, relative time in seconds (+-))
      // between(absolute time, eventExpression) ?

      var self = this;
      if (this.valid == undefined){
        // The arguments are adapted and checked extensively in isValid.
        // Make sure that isValid was really called.
        if(!this.isValid())
          return; // Abort evaluation.
      }

      var timestamps = operators.between(self.startEvents, self.endEvents);
      self.timestamps = timestamps;
      self.validTimes = timestamps; // TODO what is the difference?
      return self.validTimes;
    }

    getTimestamps(index) {
        return this.timestamps;
    }

    getValues(index) {
      return  undefined;
    }

    getPlottableExpressions() {
        var plottableExpr = [];
        for(let child of this.children) {
            plottableExpr = plottableExpr.concat(child.getPlottableExpressions());
        }
        return plottableExpr;
    }

    isValid() {
      var self = this;
      self. valid = super.isValid();

      if (self.children.length != 2){
        self.valid = false;
        self._mark_invalid("Expected 2 arguments but got " + self.children.length+ " arguments");
        return;
      }

      //console.log("Expression.js::BetweenFunctionExpression raw args1: " ,self.children[0], "=>", self.children[0].evaluate());
      //console.log("Expression.js::BetweenFunctionExpression raw args2: " ,self.children[1], "=>", self.children[1].evaluate());

      self.startEvents = self.children[0].evaluate();
      self.endEvents   = self.children[1].evaluate();

      if( self.startEvents == undefined ||
          self.endEvents   == undefined){
        self._mark_invalid("One of the arguments was evaluated to undefined. Given input:("+
                                  JSON.stringify(self.startEvents)+","+
                                  JSON.stringify(self.endEvents)+")");
        return;
      }

      if(self.startEvents.hasOwnProperty("shortName") ||
         self.endEvents.hasOwnProperty("shortName")) {
          self.valid = false;
          self._mark_invalid("Between cannot work directly with Signals. Did you mean rising_edge("+ self.startEvents.shortName+") ?");
          return;
      }
      // arg1 can be event serie, numeric or constant
      if(self.children[0] instanceof NumericArgumentExpression){
          self.startEvents = [self.startEvents];
      }
      if(self.children[0] instanceof ConstExpression){
          self.startEvents = [self.children[0].float];
      }
      // arg2 can be serie, numeric or constant
      if(self.children[1] instanceof NumericArgumentExpression ||
         self.children[1] instanceof ConstExpression){
        console.log("creating new series offset by", self.endEvents);

        var offset = 0;
        if(self.children[1] instanceof NumericArgumentExpression)
          offset = parseFloat(self.endEvents);
        else
          offset = self.children[1].float
        self.endEvents = [];
        self.startEvents.forEach(function(startEvent){
                self.endEvents.push(startEvent + offset);
        });

        if(offset<0){
          // We swap to get the expected behavior
          // i.e intervals beginning offset before and up to the event.
          var tmp = self.endEvents;
          self.endEvents = self.startEvents;
          self.startEvents = tmp;
        }
      }//arg2 is offset

      //console.log("Expression.js::BetweenFunctionExpression arg1 " ,self.startEvents ,self.endEvents, Util.areEvents(self.startEvents), Util.areEvents(self.endEvents));


      self.valid = Util.areEvents(self.startEvents) &&
                   (Util.areEvents(self.endEvents) || self.endEvents.length == 0);

      if(!self.valid){
      self._mark_invalid("Could not convert arguments to event series "+
                           JSON.stringify(self.startEvents)+","+
                           JSON.stringify(self.endEvents));
        return;
      }
      self.valid = true;
      return self.valid;
    }//isValid
}//class

/******************************************************************************/
class NotExpression extends PlottableExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "NotExpression";
        ExprFactory.create(this.jsonExpr.not, this);
    }

    evaluate() {
        var validTime = this.children[0].evaluate();
        this.validTimes = operators.complement(validTime, this.evalContext.getXmin(), this.evalContext.getXmax());
        return this.validTimes;
    }

    getLhs() {
        return "not (" + this.children[0].getExprStr() + ")";
    }

    getNumPlots() {
        return 1;
    }

    getTimestamps(index) {
        return this.children[0].getTimestamps(index);
    }

    getValues(index) {
        return this.children[0].getValues(index);
    }
}

/******************************************************************************/
class DefExpression extends PlottableExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "DefExpression";
        this.name = this.jsonExpr.def;
        this.body = this.getDefBodyIfExists(this.name);
        if(this.body !== undefined) {
            ExprFactory.create(this.body, this);
        }
        else {
            if(this.parent.getConstIfExists(this.name) !== undefined) {
                var c = new ConstExpression(this.parent.getConstIfExists(this.name),this);
                // now link in this expression instead of the DefExpression
                // find the DefExpression in the parent's children list
                var index = this.parent.children.findIndex(element => element === this);
                // then assign that element the new ConstExpression object
                this.parent.children[index] = c;
                // finally, set this nodes parent to the ConstExpression's parent
                c.parent = this.parent;
            }
            else
                ExprFactory.create(this.name, this);
        }
    }

    evaluate() {
        //console.log("DefExpression::evaluate evaluating ",this.children[0]);
        this.validTimes = this.children[0].evaluate();
        return this.validTimes;
    }

    getLhs() {
        return this.name;
    }

    getNumPlots() {
        return 1;
    }

    getTimestamps(index) {
        return this.children[0].getTimestamps(index);
    }

    getValues(index) {
        return this.children[0].getValues(index);
    }

    /**
     * Overrides the default behavior, by hiding def-children, if def represents
     * a real def{}-block.
     */
    getPlottableExpressions() {
        if(this.body !== undefined) {
            return [this];
        }
        else {
            return this.children[0].getPlottableExpressions();
        }
    }
}

/******************************************************************************/
class ConstExpression extends PlottableExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "ConstExpression";
        this.name = this.jsonExpr.name;
        this.float = this.jsonExpr.float;
    }

    getLhs() {
        return this.name;
    }

    getNumPlots() {
        return 1;
    }

    getTimestamps(index) {
        return [this.evalContext.getXmin(), this.evalContext.getXmax()];
    }

    getValues(index) {
        return [this.float, this.float];
    }
    evaluate(){
      return this.jsonExpr.float;
    }

}

/******************************************************************************/
class NumericArgumentExpression extends Expression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "NumericArgumentExpression";
        this.number = parseFloat(jsonExpr);
    }

    getLhs() {
        return this.number;
    }

    evaluate() {
        return this.number;
    }

    isValid() {
        return Util.isNumeric(this.number);
    }
}

/******************************************************************************/
class SignalExpression extends PlottableExpression {
    constructor(jsonExpr, parent) {
        super(jsonExpr, parent);
        this.exprType = "SignalExpression";
        this.signal = this.evalContext.getSignal(jsonExpr);
    }

    evaluate() {
        if(this.isValid() && this.signal) { // a signal

            this.validTimes = this.signal;
            return this.validTimes;
        }
        else if(this.isValid() && !this.signal) { // a constant
            if(this.jsonExpr.hasOwnProperty("0")) {
                this.validTimes = [];
                return parseFloat(this.jsonExpr[0]);
            }
        }
    }

    getNumPlots() {
        return 1;
    }

    getTimestamps(index) {
        return this.signal.xAxis;
    }

    getValues(index) {
        return this.signal.values;
    }

    /**
     * Returns true if there is a signal with this name AND it is a part of a
     * function expression.
     */
    isValid() {
        if(this.signal !== undefined && this.signal != null) {
            var ancestor = this;
            while(ancestor !== undefined) {
                ancestor = ancestor.parent;
                if(ancestor instanceof FunctionExpression) {
                    return true;
                }
            }
        }
        else if(this.signal === undefined) {
            if(Util.isNumeric(this.jsonExpr[0])) { // check if a number is part of a function's arguments. That should be ok
                var ancestor = this;
                while(ancestor !== undefined) {
                    ancestor = ancestor.parent;
                    if(ancestor instanceof FunctionExpression) {
                        return true;
                    }
                }
            }
        }
        this.invalidityCause.push(this.jsonExpr);
        return false;
    }

    getPlottableExpressions() {
        return [this];
    }
}

/******************************************************************************/
var isExpressionValid = {
    '<': function(left, right) { return left < right;},
    '>': function(left, right) { return left > right;},
    '==': function(left, right) { return left == right;},
    '<=': function(left, right) { return left <= right;},
    '>=': function(left, right) { return left >= right;},
    '!=': function(left, right) { return left != right;},
};

/******************************************************************************/
export class ExprFactory {
    static create(jsonExpr, parent) {
        switch(Object.keys(jsonExpr)[0]) {
        case 'root':
            return new RootExpression(jsonExpr.root);
        case 'file':
            return new FileExpression(jsonExpr, parent);
        case 'defines':
            return new DefinesExpression(jsonExpr, parent);
        case 'config':
            return new ConfigExpression(jsonExpr, parent);
        case 'constants':
            return new ConstantsExpression(jsonExpr, parent);
        case 'aliases' :
            return new AliasesExpression(jsonExpr, parent);
        case 'guard':
            return new GuardExpression(jsonExpr, parent);
        case 'assertion':
            return new AssertionExpression(jsonExpr, parent);
        case 'state':
            return new StateExpression(jsonExpr, parent);
        case 'event':
            return new EventExpression(jsonExpr, parent);
        case 'function': {
                if(jsonExpr.function.name === "derivate") {
                    return new DerivateFunctionExpression(jsonExpr, parent);
                }
                else if(jsonExpr.function.name === "apply_bit_mask") {
                    return new ApplyBitMaskFunctionExpression(jsonExpr, parent);
                }
                else if(jsonExpr.function.name.endsWith("_edge")) {
                    return new EdgeFunctionExpression(jsonExpr, parent);
                }
                else if(jsonExpr.function.name === ("between")) {
                    return new BetweenFunctionExpression(jsonExpr, parent);
                }
                return new FunctionExpression(jsonExpr, parent);
        }
        case 'def':
            return new DefExpression(jsonExpr, parent);
        case 'lhs':
            return new BasicExpression(jsonExpr, parent);
        case 'and':
            return new AndExpression(jsonExpr, parent);
        case 'or':
            return new OrExpression(jsonExpr, parent);
        case '->':
            return new SequenceExpression(jsonExpr, parent);
        case 'not':
            return new NotExpression(jsonExpr, parent);
        default:
            if(typeof jsonExpr === "object" && jsonExpr.hasOwnProperty("0")) {
                return new NumericArgumentExpression(jsonExpr[0], parent);
            }
            else if (!isNaN(parseFloat(jsonExpr))){
              new NumericArgumentExpression(jsonExpr, parent);
            }
            else {
              //console.log("ExpressionFactory:: creating signal from ",jsonExpr);
                return new SignalExpression(jsonExpr, parent);
            }
        }
    }
}

    // module.exports = {
    //   RootExpression: RootExpression,
    //   ExprFactory: ExprFactory
    // }
