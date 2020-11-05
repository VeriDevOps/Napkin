<template>
<div id="gaeditor">
	<b-container fluid >
		<b-row>
        <b-col >
          <b-alert   style="width:100%;padding-right: 0px;" :variant="evauationStatus"
          show
          >{{lastError}}</b-alert>
        </b-col>
        <b-col md="2">
          <b-button @click='createUnitTest()' size="sm" variant="success"> Save  </b-button>
          <b-form-file accept=".js" label="Kalle" @change="loadExample" variant="success" aria-label="Small" :plain="true" placeholder="none" v-model="exampleFile" ref="fileinput"> Load</b-form-file>

        </b-col>

    </b-row>

		<b-row >
	      <div id="tears-editor" style="width:100%;padding-right: 0px;" >{{initialGA}} </div>
		</b-row>

</b-container>
</div>
</template>

<script>
 import * as brace from './brace';
 import './brace/theme/monokai';
 import './brace/mode/tears';
 import './brace/ext/language_tools';
 //import Vue from "Vue";
 import bus from './EventBus.vue';
 import * as EvalContext from './EvalContext.js';

 //import tearsParser from './TearsParserWrapper.vue';
 import bAlert from 'bootstrap-vue/es/components/alert/alert';
 import bButton from 'bootstrap-vue/es/components/button/button';
 import bFormFile from 'bootstrap-vue/es/components/form-file/form-file';
 import * as Expressions from './Expressions.js';
 //var parser = require('./TearsParser.js');
var tears = require('./Tears.js');
 var tearsEditor;

 export default {
     name: "gaeditor",
     components: {
         bAlert,
         bButton,
         bFormFile
     },
     data() {
         return {
             exampleFile:"none",
            initialGA: "while SelectorLever >0 for 10s shall v_Vehicle_Ref>0 for 12s ",
             // initialGA: 'while fb_btn_pressed == ready_to_run',
             //initialGA: "while A > 0 shall B>0",
             //initialGA: "alias olle =  Gear_Mode_SCANIA const berit=1 alias elliot = GEARSOMFAN\nwhile olle > berit and Clutch_Mode_SCANIA != 10",
             //initialGA: "alias 'kalle anka' =  'red1_mdl_env/Model Root/Red1_MDL_Env/MDLUserInterface/Environment/MDL_PAR/ManualControl/v_Vehicle_Ref[m|s]/Value' \nwhile 'kalle anka' > 1",
             //DEFAULT
             // initialGA: '@ga_1_2_3\nwhere\n\tGear == defined\n' +
             // 					 'while\n\tEngineSpeed > 1000\nshall\n\t' +
             // 					 'TCOVehSpeed > 45\nwithin 3s',
             //GA WITH ONLY THE GUARD-PART
             // initialGA: 'while\n\tEngineSpeed > 1000\n',
             //MORE CHALLENGING (FUNCTION)
             // initialGA: 'when\n\trising_edge(EngineSpeed > 1000)\n' +
             // 					 'shall\n\tTCOVehSpeed > 45\nwithin 3s',
             //EVEN MORE CHALLENGING (FUNCTION WITHIN DEF)
             // initialGA: 'def kalle {\n\trising_edge(SelectorLever_Mode)\n}\n' +
             // 					 'when\n\tkalle\nshall\n\tTCOVehSpeed > 45\nwithin 3s',
             //INCORRECT INPUT
             // initialGA: 'when\n\trising_edge(EngineSpeed > 1000)\n' +
             // 					 'shall\n\tTCOVehSpeec > 45\nwithin 3s',
             //VECS-DEMO, SLIDE 12
             // initialGA: 'when\n\t(EngineSpeed > 1000 and Gear > 0) for 5s\n' +
             // 					 'shall\n\tTCOVehSpeed > 45\nwithin 2s',
             //Double sequence
             // initialGA: 'when\n\tEngineSpeed > 1000 -> Gear >= 11\n' +
             // 					 'shall\n\t(TCOVehSpeed > 45 -> TCOVehSpeed > 50 within 2s) within 5s',
             //Paper examples
             // initialGA: 'when rising_edge(fb_btn_pressed == 1) and (ready_to_run == 1 and full_beam == 0)\n' +
             // 					 'shall full_beam == 100',
             // initialGA: 'while rising_edge(fb_btn_pressed == 1) and (ready_to_run == 1 and full_beam == 0)\n' +
             // 					 'shall full_beam == 100',
             //Incorrect input
             // initialGA: 'when rising_edgge(EngineSpeed > 1000)',
             // initialGA: 'def E_full_beam_ON {\n' +
             // 					 '\trising_edge(fb_btn_pressed) and (ready_to_run == 1 and full_beam == 0)\n' + '}\n' +
             // 					 'where fb_btn_pressed == defined\n' +
             // 					 'when E_full_beam_ON\n' +
             // 					 'shall full_beam == 1 within 0.2 s',
             //VECS-DEMO, SLIDE 29
             // initialGA: 'def E_full_beam_ON {\n' +
             // 							'\tHead_light_full_beam_on == 0 and\n' +
             // 							'\tReadyToRun == 1 and\n' +
             // 							'\trising_edge(pushbutton > 0)}\n' +
             // 						'def E_full_beam_OFF {\n' +
             // 							'\tHead_light_full_beam_on == 1 and\n' +
             // 							'\tReadyToRun == 1 and\n' +
             // 							'\trising_edge(pushbutton > 0) or\n' +
             // 							'\tfalling_edge(ReadyToRun)}\n' +
             // 						'while between(E_full_beam_ON, E_full_beam_OFF)\n' +
             // 						'shall Head_light_full_beam_on == 1 within 2000s\n',

             evauationStatus: "warning",
             markings: [], //{}, /* {line_nr: marking_id} */
             lastError: "Please wait.... Loading Default Signal File....",
             lastParserTip: ""
         }
     },
     methods: {
          editUsedSignals(){
            // This function extracts the currently use signals and adds them
            // to a signal editor
            let editorText  = tearsEditor.getValue();
            var res = tears.getParseTree(editorText);
            if (res.status !='MATCHED_OK') {
              alert("Cannot Evaluate Expression, Please Edit and Try Again!");
              return;
            }
            let usedSignals = tears.getUsedSignals(editorText);
            //console.log("GAEDitor.vue::editUsedSignals sending signal",usedSignals);
            bus.$emit('signal-editor-edit-multiple-signals', usedSignals);
          },

         createUnitTest(){
           var signr = 1;
           var timestampv = []

           var ctx = EvalContext.getInstance();
           function hastimestamps(timestampv,timestamps){}
           let oldXmin = EvalContext.getInstance().getXmin();
           let oldXmax = EvalContext.getInstance().getXmax();

           let xmin = 100000;
           let xmax = -100000

          let editorText  = tearsEditor.getValue();
          var doc = '{"editorText":' + JSON.stringify(editorText) + ',\n';

          let usedSignals = tears.getUsedSignals(editorText)

          var res = tears.getParseTree(editorText);
          if (res.status !='MATCHED_OK') {
            alert("Cannot Evaluate, implement expected fails later....");
            return;
          }
          let parseTree  = res.result;
          doc    += '"parseTree" : ' + JSON.stringify(parseTree) + ',\n';
          doc    += '"signals" :{';

          for (let s of usedSignals){
            var curr = ctx.getSignal(s);
            doc += '"Signal_' + signr++ + '":';
            let range = EvalContext.EvalContext.getXRange(curr);
            if (range.min < xmin) {
                xmin = range.min;
            }
            if (range.max > xmax) {
                xmax = range.max;
            }
            var serialized_signal = { pretty_print:curr.pretty_print,
                                     newName:curr.newName,
                                     xAxis:curr.xAxis,
                                     values:curr.values};

             doc += JSON.stringify(serialized_signal);
             doc += ","
             if(curr.timestamps &&
                 !timestampv.includes(curr.timestamps)){
                  timestampv.push(curr.timestamps);
                }
            }//for

          doc += '"TimeStamps":';
          // Condense all timestamps
          var tss  = Object.assign({}, ...timestampv);
          doc += JSON.stringify(tss) + '},\n'

          //this.download_modified_signals(this.save_file_name!=""?this.save_file_name:"kalle",doc);
          // Latest Evaluation
          // The timeline may change since we save a subset of the
          // signals, so we need to cheat with the min and max.
          ctx.forceUnitTestMinMax(xmin,xmax);
          var res = tears.evaluate_tears_expression(editorText);
          ctx.forceUnitTestMinMax(oldXmin,oldXmax);
          doc += '"evaluation": ' + JSON.stringify(res.evaluation) ;
          doc += '}';
          //console.log("GAEDitor.vue::createUnitTest signals used:", doc)
          // If file is specified in parseTree, we use that name instead.

          var fileName = "saga_example.js";
          var pt = JSON.parse(parseTree)
          if(pt.file != undefined)
             fileName = pt.file + ".js";

          var element = document.createElement('a');
          element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(doc));



          element.setAttribute('download', fileName);

          element.style.display = 'none';
          document.body.appendChild(element);

         element.click();

         document.body.removeChild(element);

         },
         loadExample(e){
          var self = this;
          var ctx = EvalContext.getInstance();
          var file =  e.target.files[0];
          //console.log("GAEditor.vue::loadExample() Loading example file ",file)
          var reader = new FileReader();
           reader.onload = function(e) {
              //console.log("GAEditor.vue::loadExample()  Loaded contents:",typeof e.target.result,e.target.result);
              let g = JSON.parse(e.target.result.toString());
              var editorText = g.editorText;

              var signals = g.signals;
              var evaluation = g.evaluation
              tearsEditor.setValue(editorText);
              tearsEditor.clearSelection();
              EvalContext.getInstance().forceUnitTestClearContext();

              EvalContext.getInstance().forceUnitTestSetTimeStamps(signals['TimeStamps']);
              for (let s in signals){
                 if( s !== 'TimeStamps')
                   ctx.createNewSignal(signals[s]);
              }
              EvalContext.getInstance().updateShortNames();
              EvalContext.getInstance().updateRange();
              bus.$emit('new-eval-context-avaliable', EvalContext.getInstance().getExposedInternalSignalStructure());
              // The above will generate necessary events to switch EvalContext
              // but we want to load whatever evaluation the user got before
              // But first, add signal editors for the signals used in the expression.
              self.editUsedSignals();
              console.log("GAEDitor.vue::loadExample finished ");

              bus.$emit('ga-evaluated', JSON.stringify(evaluation));

           };
           reader.readAsText(file);
         },
         setupEditor(editorName) {
             var editor = brace.edit(editorName);
             editor.getSession().setMode("ace/mode/tears");
             //editor.setTheme("ace/theme/textmate");
             editor.setTheme("ace/theme/monokai");
             editor.$blockScrolling = Infinity;
             this.setupAutocompletion(editor);
             return editor;
         },
         setupAutocompletion(editor) {
             var self = this;

             /* Enable autocompletion */
             editor.setOptions({
                 enableBasicAutocompletion: true
             });
             /* Add the list of short signal names to the autocompletion library */
             var signalCompleter = {
                 getCompletions: function(editor, session, pos, prefix, callback) {
                     callback(null, bus.getAllSignalNames().map(function(signal) {
                         return {
                             caption: signal,
                             value: signal,
                             meta: "signal"
                         };
                     }));
                 }
             };
             editor.completers.push(signalCompleter);
         },
         clearMarkings() {
             this.markings.forEach(id => {
                 tearsEditor.getSession().removeMarker(id);
             });
             this.markings = [];
         },
         mark_invalid_expressions(causes) {
             //console.log("GAEditor.vue::mark_invalid_expressions " + JSON.stringify(causes));
             let self = this;

             var lines = tearsEditor.getSession().getDocument().getAllLines();
             var annotations = [];
             var highlightRegions = [];

             causes.forEach(invalid => {
                 let reg = new RegExp('\\b' + invalid + '\\b');
                 for (let i = 0; i < lines.length; i++) {
                     let matchIndex = lines[i].indexOf(invalid);
                     if (lines[i].match(reg) !== null && matchIndex > -1) {

                         // If invalid exists, or is alias or const,
                         // the expression is probably only incomplete..

                         if (bus.getSignal(invalid) == undefined) {
                             annotations.push({
                                 row: i,
                                 column: 0,
                                 text: "Unknown: " + invalid,
                                 type: "error"
                             });
                         } else {
                             annotations.push({
                                 row: i,
                                 column: 0,
                                 text: "Incomplete Expression: " + invalid,
                                 type: "error"
                             });
                         }
                         // TODO, highlight may end up too early on the line.
                         highlightRegions.push({
                             row: i,
                             fromColumn: matchIndex,
                             toColumn: matchIndex + invalid.length
                         });
                     } //non null line
                 } //for
             }); //=>
             tearsEditor.getSession().setAnnotations(annotations);
             let Range = brace.acequire('ace/range').Range;
             highlightRegions.forEach(region => {
                 self.markings.push(tearsEditor.getSession().addMarker(
                     new Range(region.row, region.fromColumn, region.row, region.toColumn),
                     "underlineInvalid", "text", true));
             });
         }, //invalid exprs*/
         evaluate() {
             let self = this;

             tearsEditor.getSession().clearAnnotations();
             self.clearMarkings();
             self.evauationStatus = "warning";
             self.lastError = "Re - Evaluating the expression, please wait!";
             //console.group("GAEditor.js::evaluate()");
             let editorText = tearsEditor.getValue();
             let res = tears.evaluate_tears_expression(editorText);

             //console.log("GAEditor::evaluate() raw result -->  " + JSON.stringify(res));

             switch (res.status) {
                 case 'FAIL_SYNTAX':
                 //console.log("GAEditor.vue::evaluate() case 'FAIL_SYNTAX'");

                     self.evauationStatus = "danger";
                     self.lastError = "You should adjust your syntax in the expression, or maybe you were not finished typing ?";
                     //self.lastParserTip = JSON.stringify(res.message); // TODO make tool-tip later.

                     bus.$emit('ga-evaluated', '{"times": {}, "guards": [], "assertions":[] }');
                     break;
                 case 'FAIL_EVAL':
                 //console.log("GAEditor.vue::evaluate()  case 'FAIL_EVAL'");

                     self.lastError = "The expression is not valid. Have you checked the signals ? (TIP: hover over the line numbers to the left)"
                     self.evauationStatus = "warning";
                     self.mark_invalid_expressions(res.causes);

                     bus.$emit('ga-evaluated', '{"times": {}, "guards": [], "assertions":[] }');
                     break;
                 case 'OK':
                     //console.log("GAEditor.vue::evaluate()  case 'OK'");
                     tearsEditor.getSession().clearAnnotations();
                     self.clearMarkings();
                     self.evauationStatus = "success";
                     self.lastError = "OK";


                     bus.$emit('ga-evaluated', JSON.stringify(res.evaluation));
                     break;
                 default:
                     console.log("GAEditor.js::evaluate() cannot handle evaluation " + JSON.stringify(res));
             }
             //console.groupEnd();
             return;

         },
         onEditorTextChanged(){
            //console.log("GAEditor::onEditorTextChanged clearing delay = " );
            let self = this;
            clearTimeout();
            setTimeout(self.evaluate, IGNORE_THRESHOLD);
         },


     }, // methods
     watch: {

     },
     created() {
         var self = this;

          bus.$on('re-evaluation-request', function() {
              //console.log("GAeditor.vue:: on 'signal-list-updated' -------------")
              self.evaluate();
            });


          bus.$on('new-signal-created', function() {
                 //console.log("GAeditor.vue:: on 'signal-list-updated' -------------")
                 self.evaluate();
             });

          bus.$on('edited-signal-updated', function() {
                    //console.log("GAeditor.vue:: on 'signal-list-updated' -------------")
                    self.evaluate();
                });
          bus.$on('new-eval-context-avaliable', function() {
                    //console.log("GAeditor.vue:: on 'new-eval-data-avaliable' -------------")
                    self.evaluate();
                });
     },
     mounted() {
         var self = this;
         const IGNORE_THRESHOLD = 350;
         var myWorker = self.$worker.create([{
             message: 'updateGaText',
             func: () => ''
         }]);

         tearsEditor = this.setupEditor('tears-editor');
         var lastValue = "";
         var lastEditTime = 0;
         tearsEditor.getSession().on('change', function() {
             lastEditTime = new Date().getTime();
             lastValue = tearsEditor.getValue();
             myWorker.postMessage('updateGaText')
                 .then(() => {
                     let deltat = new Date().getTime() - lastEditTime;
                     setTimeout(function() {
                         let deltat = new Date().getTime() - lastEditTime;
                         if (deltat > IGNORE_THRESHOLD) {
                             self.evaluate();
                         }
                     }, IGNORE_THRESHOLD);
                 });
         });
         self.gaText = tearsEditor.getValue();
     }
 }
</script>

<style type="text/css" media="screen">
#tears-editor {
	height: 200px;
}

.ace_editor.ace_autocomplete {
   width: 60%
}
.button {
	font-family: "arial-black";
	padding: 5px 5px;
	margin-top: 10px;
	margin-bottom: 10px;
}

.invalidConfigMarker {
	position:absolute;
	background:rgba(255, 100, 100, 0.5);
}

.underlineInvalid {
	position:absolute;
	border-bottom: 1px dashed red;
}
</style>
