const fs = require('fs');
const separator = require('path').sep;
const parser = require('./TearsParser.js');
// import RootExpression from './Expressions.js';

const temp = require('../temp.js');

if (process.argv.length < 4) {
  console.log('Usage: node ' + process.argv[1].split("/").pop() + ' GA_DIRECTORY JSONDIFF_DIRECTORY');
  process.exit(1);
}

var gaDir = process.argv[2];
var gaFiles = fs.readdirSync(gaDir);
for (let file of gaFiles) {
  let content = fs.readFileSync(gaDir + separator + file, 'utf8');
  console.log("-----------------------------------------------------------");
  console.log("File: " + file);
  console.log("CONTENT:");
  console.log(content);
  console.log("PARSE TREE: ");
  let parseTree = parser.parse(content);
  console.log(JSON.stringify(parseTree));
  // let rootExpr = new ex.RootExpression(JSON.parse(parseTreeStr));
  console.log("-----------------------------------------------------------");

  temp.printTemp();
}

// var jsondiffDir = process.argv[3];
