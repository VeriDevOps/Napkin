<template>
</template>
<script>
import bus from './EventBus.vue';
var parser = require('./TearsParser.js');

export default {
    name:	"tearsParser",
    props: {
    	textToParse: ""
    },
    data() {
    	return {
    	    parseTree: ""
    	}
    },
    methods: {
    },
    watch: {
	textToParse(newVal, oldVal) {
	    var parseResult = parser.parse(newVal);
	    if (parseResult !== undefined){
		    this.parseTree = parseResult;
        	console.log("TearsParserWrapper::watch:textToParse parser returned ",parseResult);
	    }
      else{
    		console.log("TearsParserWrapper::watch:textToParse, did not pass the syntax test [" + newVal + "]")
    		var notification = {"times": {}, "guards": [], "assertions": []};
        //this.parseTree = {};
    		bus.$emit('ga-evaluated', JSON.stringify(notification));
    		bus.$emit('parse-tree-syntax-error', JSON.stringify(notification));
	    }
	},
	parseTree(newVal, oldVal) {
    console.log("TearsParserWrapper::parseTree  emitting 'parse-tree' event :" , newVal);
	    bus.$emit('parse-tree', newVal);
	}
    },
    created() {
	     var self = this;
	      bus.$on('signal-list-updated', function() {
	      bus.$emit('parse-tree', self.parseTree);
	});
    }
}
</script>
<style>
</style>
