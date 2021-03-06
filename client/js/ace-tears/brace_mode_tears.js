ace.define("ace/mode/matching_brace_outdent",["require","exports","module","ace/range"], function(acequire, exports, module) {
"use strict";

var Range = acequire("../range").Range;

var MatchingBraceOutdent = function() {};

(function() {

    this.checkOutdent = function(line, input) {
        if (! /^\s+$/.test(line))
            return false;

        return /^\s*\}/.test(input);
    };

    this.autoOutdent = function(doc, row) {
        var line = doc.getLine(row);
        var match = line.match(/^(\s*\})/);

        if (!match) return 0;

        var column = match[1].length;
        var openBracePos = doc.findMatchingBracket({row: row, column: column});

        if (!openBracePos || openBracePos.row == row) return 0;

        var indent = this.$getIndent(doc.getLine(openBracePos.row));
        doc.replace(new Range(row, 0, row, column-1), indent);
    };

    this.$getIndent = function(line) {
        return line.match(/^\s*/)[0];
    };

}).call(MatchingBraceOutdent.prototype);

exports.MatchingBraceOutdent = MatchingBraceOutdent;
});

ace.define("ace/mode/tears_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(acequire, exports, module) {
"use strict";

var oop = acequire("../lib/oop");
var TextHighlightRules = acequire("./text_highlight_rules").TextHighlightRules;

var TearsHighlightRules = function() {

    var keywordMapper = this.createKeywordMapper({
        "keyword.control":
            "when while shall " +
            "within for def alias const",
        "constant.language":
            "true false inf ",
        "keyword.operator":
            "and or ->",
        "support.function":
          "store timepoint value as sequence " +
        	" at falling_edge rising_edge derivative count cycle bitmask " +
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

ace.define("ace/mode/tears",["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/mode/matching_brace_outdent","ace/mode/tears_highlight_rules"], function(acequire, exports, module) {
"use strict";

var oop = acequire("../lib/oop");
var TextMode = acequire("./text").Mode;
var Tokenizer = acequire("../tokenizer").Tokenizer;
var MatchingBraceOutdent = acequire("./matching_brace_outdent").MatchingBraceOutdent;
var TearsHighlightRules = acequire("./tears_highlight_rules").TearsHighlightRules;

var Mode = function() {
    this.HighlightRules = TearsHighlightRules;
    this.$outdent = new MatchingBraceOutdent();
};
oop.inherits(Mode, TextMode);

(function() {
    this.lineCommentStart = "//";
    this.blockComment = {start: "/*", end: "*/"};
    this.getNextLineIndent = function(state, line, tab) {
        var indent = this.$getIndent(line);
        return indent;
    };

    this.checkOutdent = function(state, line, input) {
        return this.$outdent.checkOutdent(line, input);
    };

    this.autoOutdent = function(state, doc, row) {
        this.$outdent.autoOutdent(doc, row);
    };
    
    this.$id = "ace/mode/tears";
}).call(Mode.prototype);

exports.Mode = Mode;
});
