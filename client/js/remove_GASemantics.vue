<script>
import Vue from 'vue';
import bus from './EventBus.vue'
import * as Expressions from './Expressions.js';

const gasemantics = new Vue({
    name: "gasemantics",
    created() {
        var self = this;
        bus.$on('parse-tree', function(parseTreeStr) {
        console.log("GASemantics::on 'parse.tree'");
        console.log("GASemantics::on('parse-tree') Creating root expression from ", parseTreeStr);
	      var rootExpr = new Expressions.RootExpression(JSON.parse(parseTreeStr));
            // add constants into EventBus, so they can be requested as ordinary signals
            var consts = rootExpr.getConsts();
            if (consts.length > 0) {
                var _consts = [];
                for(let c of consts) {
                    _consts.push(rootExpr.getConstIfExists(c));
                }
                bus.addConsts(_consts);
            }
            else {
                bus.addConsts([]);
            }
            // add aliases to EventBus,
            var aliases = rootExpr.getAliases();
            if (aliases.length > 0) {
                var a = [];
                for(let alias of aliases) {
                    a.push(rootExpr.getAliasIfExists(alias));
                }
                bus.addAliases(a);
            }
            else {
                bus.addAliases([]);
            }

	    if (rootExpr.isValid()) {
	        console.log("GASemantics::on('parse-tree') is valid emitting  parse-tree-semantics: " + parseTreeStr);
	        bus.$emit('parse-tree-semantics', parseTreeStr);
	    }
	    else {
         let causes = rootExpr.getInvalidityCauses();
         console.log("GASemantics::on('parse-tree') is invalid emitting  'invalid-expressions' " + causes);

	        // console.log("This is not a valid parse tree...")
	        bus.$emit('invalid-expressions', causes);
	        var notification = {"times": {}, "guards": [], "assertions": []};
	        bus.$emit('ga-evaluated', JSON.stringify(notification));
	    }
        });
    }
});
export default gasemantics;
</script>
