define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var TearsHighlightRules = function() {

    var keywordMapper = this.createKeywordMapper({
        "keyword.control":
            "when while given then when shall " +
            "within for def alias const",
        "constant.language":
            "true false inf ",
        "keyword.operator":
            "and or ->",
        "support.function":
        	// "abs dydt diff " +
        	// "pwmfreq pwmduty " +
          "store timepoint value as sequence " +
        	" at falling_edge rising_edge derivative count cycle bitmask " +
        	// "even odd " +
        	"not between" // newinterval"
    }, "text", true, " ");

    this.$rules = {
        "start" : [
            {token : "doc.comment", regex : /^\*.+/},
            {token : "comment",  regex : /\/\/.+$/},
            {token : "invalid", regex: /\\.{2,}/},
            {token : "keyword.operator", regex: /\W[\-+%=<>*]\W|\*\*|[~:,\.&$]|->*?|=>/},
            {token : "paren.lparen", regex : /[\[\(\{]/},
            {token : "paren.rparen", regex : /[\]\)\}]/},
            {token : "constant.numeric", regex: /[+-]?\d+\b/},
            {token : "storage.type", regex: /@\w+\b/},
            {token : keywordMapper, regex : /\w+\b/},
            {token : "variable.parameter", regex : /[\w-]+\b/}, //-\w+(?:-\w+)*/},
            {caseInsensitive: true}
        ]
    };
};
oop.inherits(TearsHighlightRules, TextHighlightRules);

exports.TearsHighlightRules = TearsHighlightRules;
});
