const fs = require('fs');
const separator = require('path').sep;
const parser = require('./TearsParser.js');

const ex = require('./Expressions.js');

var bus = require('./EventBus.vue');

if (process.argv.length < 4) {
  console.log('Usage: node ' + process.argv[1].split("/").pop() + ' GA-file jsondiff-file');
  process.exit(1);
}

var jsonfile = process.argv[3];
bus.loadFile(jsonfile);

var file = process.argv[2];
let content = fs.readFileSync(file, 'utf8');
//console.log("-----------------------------------------------------------");
//console.log("File: " + file);
//console.log("CONTENT:");
//console.log(content);
//console.log("PARSE TREE: ");
let parseTreeStr = parser.parse(content);
//console.log(JSON.stringify(parseTreeStr));
let parseTree = JSON.parse(parseTreeStr);
let rootExpr = new ex.RootExpression(parseTree);
//console.log("-----------------------------------------------------------");

  if (rootExpr.isValid()) {
      console.log("valid");

      rootExpr.evaluate();
    var notification = {"times": {}, "guards": [], "assertions": []};
    notification.times.valid = rootExpr.getValidTimes();
    notification.times.pass = rootExpr.getPassTimes();
    notification.times.fail = rootExpr.getFailTimes();

      console.log("notif times " + JSON.stringify(notification.times));

  } else {
      console.log("invalid");
      let causes = rootExpr.getInvalidityCauses();
      console.log(" " + JSON.stringify(causes));
  }

