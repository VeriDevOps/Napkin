var bus = require('./EventBus.vue');
var Util = require('./Util.js');

var operators = require('./Operators.js');

/******************************************************************************/
class Expression {
  constructor(jsonExpr, parent) {
    this.jsonExpr = jsonExpr;
    this.children = [];
    this.invalidityCause = [];
    this.linkTo(parent);
  }

  evaluate() { throw "abstract function evaluate() not implemented"; }

  toString() {
    return JSON.stringify(this.jsonExpr);
  }

  linkTo(parent) {
    if (parent !== undefined) {
      this.parent = parent;
      this.parent.children.push(this);
    }
  }

  isValid() {
      //console.log("isvalid2");
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
    for (let child of this.children) {
      plottableExpr = plottableExpr.concat(child.getPlottableExpressions());
    }
    if (this instanceof PlottableExpression) {
      plottableExpr.push(this);
    }
    return plottableExpr;
  }

  getInvalidityCauses() {
    var causes = this.invalidityCause;
    for (let child of this.children) {
      causes = causes.concat(child.getInvalidityCauses());
    }
    return causes;
  }

  getDefBodyIfExists(name) {
    if (this.parent !== undefined)
      return this.parent.getDefBodyIfExists(name);
  }

  //TODO: Currently the for- and within-method implementations seems to be identical. Hmm...
  getForAdjustedIntervals(originalTimes) {
    var forTime = this.getTimeExpressionsInS().for;
    if (forTime === undefined)
      return originalTimes;

    var adjustedTimes = [];
    originalTimes.forEach(originalTime => {
      var adjustedTime = originalTime.map((x, index) => index === 0 ? (x + forTime) : x);
      if (adjustedTime[0] <= adjustedTime[1])
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
    if (timeout !== undefined)
      return timeout;
    for (let child of this.children) {
      let timeout = child.getWithinTimeInS();
      if (timeout !== undefined)
        return timeout;
    }
  }

  getTimeExpressionsInS() {
    if (this.jsonExpr.timing === undefined)
      return {};

    var timeValues = {};
    for (let timingExpr of this.jsonExpr.timing) {
      let scalingFactor = 1;
      if (timingExpr.unit === 'ms') {
        scalingFactor = 1e-3;
      }
      timeValues[timingExpr.type] = parseFloat(timingExpr.value) * scalingFactor;
    }
    return timeValues;
  }
}

/******************************************************************************/
class RootExpression extends Expression {
  constructor(jsonExpr) {
    super(jsonExpr);

      var key, value;
      //console.log("RootE0 " + this.jsonExpr);
      //console.log("RootE " + JSON.stringify(Object.entries(this.jsonExpr)));
    for ([key, value] of Object.entries(this.jsonExpr)) {
      this[key] = ExprFactory.create({[key]: value}, this);
    }
    // this.evaluate();
  }

  evaluate() {
    if (this.guard !== undefined) {
      this.validTimes = this.guard.evaluate();
    }
    else {
      this.validTimes = [[0, bus.getXmax()]];
    }

    if (this.assertion !== undefined) {
      this.assertionValidityTimes = this.assertion.evaluate();
    }
    else {
      this.assertionValidityTimes = [];
    }

    if (Util.areIntervals(this.validTimes) &&
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
    if (this.defines !== undefined)
      return this.defines.getDefBodyIfExists(name);
  }

  getPassTimes() {
    if (this.assertion === undefined)
      return [];
    if (Util.areIntervals(this.validTimes))
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
    if (this.assertion === undefined)
      return [];
    var invalidityTimes = operators.complement(this.assertionValidityTimes, 0, bus.getXmax());
    if (Util.areIntervals(this.validTimes)) {
      var withinAdjustedGuardTimes = this.getWithinAdjustedIntervals(this.validTimes);
      return operators.and(withinAdjustedGuardTimes, invalidityTimes);
    }
    else {
      var withinAdjustedGuardTimes = this.getWithinAdjustedTimestamps(this.validTimes);
      var potentialFailIntervals = operators.and(withinAdjustedGuardTimes, invalidityTimes);
      var timeout = this.getWithinTimeInS();
      if (timeout === undefined)
        timeout = 0;

      var failTimestamps = [];
      potentialFailIntervals.forEach(interval => {
        let timeoutExpiration = interval[0] + timeout;
        if (interval[1] >= timeoutExpiration)
          failTimestamps.push(timeoutExpiration);
      });
      return failTimestamps;
    }
  }

  getWithinAdjustedTimestamps(originalTimes) {
    var timeout = this.getWithinTimeInS();
    if (timeout === undefined)
      timeout = 0;

    var adjustedTimes = [];
    originalTimes.forEach(originalTime => {
      adjustedTimes.push([originalTime, originalTime + timeout]);
    });
    return adjustedTimes;
  }

  getWithinAdjustedIntervals(originalTimes) {
    var timeout = this.getWithinTimeInS();
    if (timeout === undefined)
      return originalTimes;

    var adjustedTimes = [];
    originalTimes.forEach(originalTime => {
      var adjustedTime = originalTime.map((x, index) => index === 0 ? (x + timeout) : x);
      if (adjustedTime[0] <= adjustedTime[1])
        adjustedTimes.push(adjustedTime);
    });
    return adjustedTimes;
  }
}

/******************************************************************************/
class DefinesExpression extends Expression {
  constructor(jsonExpr, parent) {
    super(jsonExpr, parent);
    this.createNameBodyMap();
  }

  createNameBodyMap() {
    this.defs = {};
    for (let def of this.jsonExpr.defines) {
      this.defs[def.name] = def.body;
    }
  }

  getDefBodyIfExists(name) {
    return this.defs[name];
  }
}

/******************************************************************************/
class ConfigExpression extends Expression {
  constructor(jsonExpr, parent) {
    super(jsonExpr, parent);
    ExprFactory.create(this.jsonExpr.config, this);
  }
}

/******************************************************************************/
class FileExpression extends Expression {
  constructor(jsonExpr, parent) {
    super(jsonExpr, parent);
  }
}

/******************************************************************************/
class AssertionExpression extends Expression {
  constructor(jsonExpr, parent) {
    super(jsonExpr, parent);
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
      var key, value;
    for ([key, value] of Object.entries(this.jsonExpr.guard)) {
      this[key] = ExprFactory.create({[key]: value}, this);
    }
  }

  evaluate() {
    var validTimes;
    if (this.state !== undefined) {
      validTimes = this.state.evaluate();
      if (this.event !== undefined) {
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
    ExprFactory.create(this.jsonExpr.event, this);
  }

  evaluate() {
    this.validTimes = this.children[0].evaluate();
    if (!Util.areEvents(this.validTimes)) {
      this.validTimes = operators.rising_edge(this.validTimes);
    }
    return this.validTimes;
  }
}

/******************************************************************************/
class ConnectiveExpression extends Expression {
  constructor(jsonExpr, parent, connective) {
    super(jsonExpr, parent);
    this.connective = connective;
    ExprFactory.create(this.jsonExpr[connective][0], this);
    ExprFactory.create(this.jsonExpr[connective][1], this);
  }

  evaluate() {
    this.validTimes = operators[this.connective](this.children[0].evaluate(),
                                                 this.children[1].evaluate());
    //TODO: This should be standardized (lifted up in the hierarchy)
    this.validTimes = this.getForAdjustedIntervals(this.validTimes);
    return this.validTimes;
  }

  getLhs() {
    return this.children[0].getLhs() + " " + this.connective + " " + this.children[1].getLhs();
  }
}

/******************************************************************************/
class AndExpression extends ConnectiveExpression {
  constructor(jsonExpr, parent) {
    super(jsonExpr, parent, 'and');
  }
}

/******************************************************************************/
class OrExpression extends ConnectiveExpression {
  constructor(jsonExpr, parent) {
    super(jsonExpr, parent, 'or');
  }
}

class SequenceExpression extends ConnectiveExpression {
  constructor(jsonExpr, parent) {
    super(jsonExpr, parent, '->');
  }

  evaluate() {
    var timeout = this.children[1].getTimeExpressionsInS().within;
    var precEvents = this.children[0].evaluate();
    if (Util.areIntervals(precEvents)) {
      precEvents = operators.rising_edge(precEvents);
    }
    var followEvents = this.children[1].evaluate();
    if (Util.areIntervals(followEvents)) {
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
  }

  evaluate() {
    var xAxis = [];
    var lhsValues = [];
    var rhsValues = [];
    var intervals = [];
    var lastTickWasValid = false;
    var thisTickIsValid = false;
    var intervalStart = -1;

    if (Util.isNumeric(this.jsonExpr.lhs) && Util.isNumeric(this.jsonExpr.rhs)) {
      throw "Not implemented: BasicExpression.evaluate(constant <> constant)";
    }
    else if (Util.isNumeric(this.jsonExpr.rhs)) {
      [xAxis, lhsValues, rhsValues] = this.prepareForEvaluation(this.jsonExpr.lhs, this.jsonExpr.rhs);
    }
    else if (Util.isNumeric(this.jsonExpr.lhs)) {
      [xAxis, rhsValues, lhsValues] = this.prepareForEvaluation(this.jsonExpr.rhs, this.jsonExpr.lhs);
    }
    else {
      let lhsSignal = bus.getSignal(this.jsonExpr.lhs);
      let rhsSignal = bus.getSignal(this.jsonExpr.rhs);
      if (lhsSignal == null || rhsSignal == null)
        return;

      xAxis = Util.joinTimelines(lhsSignal.data.xAxis, rhsSignal.data.xAxis);
      lhsValues = Util.interpolateDataToTimeline(lhsSignal.data, xAxis);
      rhsValues = Util.interpolateDataToTimeline(rhsSignal.data, xAxis);
    }

    for (let i=0; i<xAxis.length; i++) {
      thisTickIsValid = isExpressionValid[this.jsonExpr.operator](lhsValues[i], rhsValues[i]);
      if (thisTickIsValid && !lastTickWasValid) { // A new valid interval starts just now
        intervalStart = xAxis[i];
      }
      else if (!thisTickIsValid && lastTickWasValid) { // A valid interval is finished just now
        intervals.push([intervalStart, xAxis[i]]);
      }
      lastTickWasValid = thisTickIsValid;
    }
    if(thisTickIsValid)
    {
      let lastIndex = xAxis.length - 1;
      intervals.push([intervalStart, bus.getXmax()]);
    }
    this.validTimes = intervals;
    this.validTimes = this.getForAdjustedIntervals(this.validTimes);
    return this.validTimes;
  }

  getLhs() {
    return this.jsonExpr.lhs;
  }

  getExprStr() {
    return this.getLhs() + " " + this.jsonExpr.operator + " " + this.getRhs();
  }

  getRhs() {
    return this.jsonExpr.rhs;
  }

  prepareForEvaluation(signalStr, constantStr) {
    var signal = bus.getSignal(signalStr);
    var constantValue = Number.parseFloat(constantStr);
    if (signal != null) {
      let xAxis = signal.data.xAxis;
      let signalValues = signal.data.values;
      let constantValues = Array(xAxis.length).fill(constantValue);
      return [xAxis, signalValues, constantValues];
    }
    else {
      return Array(3).fill([]);
    }
  }

  isValid() {
    var valid = true;
      //console.log("isValid1");

    [this.getLhs(), this.getRhs()].forEach(signalName => {
      if (!Util.isNumeric(signalName) &&
          signalName !== "defined" &&
  				bus.getSignal(signalName) == null) {
  			valid = false;
	  //console.log("invalid, pushing " + signalName);
        this.invalidityCause.push(signalName);
  		}
    });
    return valid;
  }
}

/******************************************************************************/
class FunctionExpression extends PlottableExpression {
  constructor(jsonExpr, parent) {
    super(jsonExpr, parent);
    var args = this.jsonExpr.function.args;
    for (let i=0; i<args.length; i++) {
      ExprFactory.create(args[i], this);
    }
  }

  evaluate() {
    var inputData = [];
    for (let i=0; i<this.children.length; i++) {
      inputData.push(this.children[i].evaluate());
    }
    this.validTimes = operators[this.jsonExpr.function.name].apply(null, inputData);
    return this.validTimes;
  }

  getLhs() {
    var fullName = this.jsonExpr.function.name + "(";
    for (let i=0; i<this.children.length-1; i++)
      fullName += this.children[i].getLhs() + ", ";
    fullName += this.children.slice(-1)[0].getLhs() + ")";
    return fullName;
  }

  /**
   * Overrides the default behavior, by hiding *_edge-functions (and only showing
   * their children). Other functions are plotted as normally.
   */
  getPlottableExpressions() {
    if (this.jsonExpr.function.name.includes('_edge')) {
      var plottableExpr = [];
      for (let child of this.children) {
        plottableExpr = plottableExpr.concat(child.getPlottableExpressions());
      }
      return plottableExpr;
    }
    else {
      return super.getPlottableExpressions();
    }
  }

  isValid() {
      //console.log("isvalid3");
    var valid = Util.isFunctionDefined(this.jsonExpr.function.name);
    if (!valid) {
	  //console.log("invalid2, pushing " + this.jsonExpr.function.name);
      this.invalidityCause.push(this.jsonExpr.function.name);
    }
    valid = this.areChildrenValid() && valid;
    return valid;
  }
}

/******************************************************************************/
class DefExpression extends PlottableExpression {
  constructor(jsonExpr, parent) {
    super(jsonExpr, parent);
    this.name = this.jsonExpr.def;
    this.body = this.getDefBodyIfExists(this.name);
    if (this.body !== undefined) {
      ExprFactory.create(this.body, this);
    }
    else {
      ExprFactory.create(this.name, this);
    }
  }

  evaluate() {
    this.validTimes = this.children[0].evaluate();
    return this.validTimes;
  }

  getLhs() {
    return this.name;
  }

  /**
   * Overrides the default behavior, by hiding def-children, if def represents
   * a real def{}-block.
   */
  getPlottableExpressions() {
    if (this.body !== undefined) {
      return [this];
    }
    else {
      return this.children[0].getPlottableExpressions();
    }
  }
}

/******************************************************************************/
class SignalExpression extends PlottableExpression {
  constructor(jsonExpr, parent) {
    super(jsonExpr, parent);
    this.signal = bus.getSignal(jsonExpr);
  }

  evaluate() {
    if (this.isValid()) {
      this.validTimes = this.signal.data;
      return this.validTimes;
    }
  }

  /**
   * Returns true if there is a signal with this name AND it is a part of a
   * function expression.
   */
  isValid() {
      //console.log("isvalid4");
    if (this.signal !== undefined) {
      var ancestor = this;
      while (ancestor !== undefined) {
        ancestor = ancestor.parent;
        if (ancestor instanceof FunctionExpression) {
          return true;
        }
      }
    }
	  //console.log("invalid3, pushing " + this.jsonExpr);
    this.invalidityCause.push(this.jsonExpr);
    return false;
  }

  getPlottableExpressions() {
    return [this];
  }
}

/******************************************************************************/
var isExpressionValid = {
  '<': function(left, right) { return left < right; },
  '>': function(left, right) { return left > right; },
  '==': function(left, right) { return left == right; },
  '<=': function(left, right) { return left <= right; },
  '>=': function(left, right) { return left >= right; },
  '!=': function(left, right) { return left != right; },
};

/******************************************************************************/
class ExprFactory {
  static create(jsonExpr, parent) {
    switch (Object.keys(jsonExpr)[0]) {
      case 'root': return new RootExpression(jsonExpr.root);
      case 'file': return new FileExpression(jsonExpr, parent);
      case 'defines': return new DefinesExpression(jsonExpr, parent);
      case 'config': return new ConfigExpression(jsonExpr, parent);
      case 'guard': return new GuardExpression(jsonExpr, parent);
      case 'assertion': return new AssertionExpression(jsonExpr, parent);
      case 'state': return new StateExpression(jsonExpr, parent);
      case 'event': return new EventExpression(jsonExpr, parent);
      case 'function': return new FunctionExpression(jsonExpr, parent);
      case 'def': return new DefExpression(jsonExpr, parent);
      case 'lhs': return new BasicExpression(jsonExpr, parent);
      case 'and': return new AndExpression(jsonExpr, parent);
      case 'or': return new OrExpression(jsonExpr, parent);
      case '->': return new SequenceExpression(jsonExpr, parent);
      default: return new SignalExpression(jsonExpr, parent);
    }
  }
}

module.exports = {
   RootExpression: RootExpression,
   ExprFactory: ExprFactory
}
