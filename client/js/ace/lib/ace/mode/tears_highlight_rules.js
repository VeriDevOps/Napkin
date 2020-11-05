define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var TearsHighlightRules = function() {

    var keywordMapper = this.createKeywordMapper({
        "keyword.control":
            "where when while shall if then " +
            "within for after " +
            "def do",
        "constant.language":
            "true false inf defined",
        "keyword.operator":
            "and or",
        "support.function":
        	// "abs dydt diff " +
        	// "pwmfreq pwmduty " +
        	"edge falling_edge rising_edge derivate apply_bit_mask " +
        	// "even odd " +
        	"complement between sequence" // newinterval"
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
