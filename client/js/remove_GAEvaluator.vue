<template lang="html">
</template>

<script>
import bus from './EventBus.vue';
import * as Expressions from './Expressions.js';

export default {
  name: 'ga-evaluator',
  data() {
    return {}
  },
  methods: {
    evaluateAndNotify(parseTree) {
      var rootExpr = new Expressions.RootExpression(parseTree);
      rootExpr.evaluate();

      var notification = {"times": {}, "guards": [], "assertions": []};
      notification.times.valid = rootExpr.getValidTimes();
      notification.times.pass = rootExpr.getPassTimes();
      notification.times.fail = rootExpr.getFailTimes();
      notification.guards = extractPlottableExpressions(rootExpr.getGuard());
      notification.assertions = extractPlottableExpressions(rootExpr.getAssertion());
      console.log("GAEvaluator.vue:: on parse-tree-semantics  emitting 'ga-evaluated'" , JSON.stringify(notification));
      bus.$emit('ga-evaluated', JSON.stringify(notification));
    }
  },
  created() {
    var self = this;
    bus.$on('parse-tree-semantics', function(parseTreeStr) {
      self.evaluateAndNotify(JSON.parse(parseTreeStr));
    });
  }
}

function extractPlottableExpressions(exprCollection) {
    var plottableExpressions = [];
    if (exprCollection !== undefined) {
        for (let expr of exprCollection.getPlottableExpressions()) {
            let validTimes = expr.getValidTimes();
	    var timelines = [];
	    var values = [];
            var shortnames = [];
            for (var i = 1, j = 0; j < expr.getNumPlots(); i++, j++) {
	        timelines.push(expr.getTimestamps(i));
	        values.push(expr.getValues(i));
                shortnames.push(expr.getShortName(i));
            }
            plottableExpressions.push({
                "exprStr": expr.getExprStr(),
                "shortnames": shortnames,
	        "numPlots": expr.getNumPlots(),
	        "timelines": timelines,
	        "values": values,
                "lhs": expr.getLhs(),
                "rhs": expr.getRhs(),
                "valid": (validTimes !== undefined) ? validTimes : []
            });
        }
    }
    return plottableExpressions;
}
</script>

<style lang="css">
</style>
