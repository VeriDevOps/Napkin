<template>
<div id="gaeditor"
style='height: 192px;resize: inherit;'>

	<b-container fluid>
		<b-row>
        <b-col   >
          <b-alert    :variant="evauationStatus" data-toggle="tooltip" :title="globalDefinitionsFile" data-placement="auto right" on.show.bs.tooltip = "function(){alert('The tooltip is about to be shown.');"
          show
          >{{lastError}}</b-alert>
        </b-col>
        <b-col v-if="editorID==='tears-editor-horizontal'" md="3">
<!-- Now in context menu!
        <b-button @click='createUnitTest()' size="sm" variant="success"> Save Code and Relevant Signals  </b-button>

-->      <b-form-file   :state="Boolean(exampleFile)" accept=".js" label="kalle" @change="loadExample"  aria-label="Small" :plain="false" placeholder="Drop file or click to browse to load example" v-model="exampleFile" ref="fileinput"> Load</b-form-file>
        </b-col>
        <!--- FIXME, programmatic clicks are ignored nowadays, we need a work-around -->
        <b-form-file v-show="false"  :state="Boolean(true)"
                                    accept=".ga;.txt"
                                    label="gafile" @change="loadGA"  aria-label="Small" :plain="false"
                                    placeholder="Drop file or click to browse to load T-EARS file"
                                    v-model="gaFile"
                                    ref="gafile"> Load</b-form-file>

    </b-row>


		<b-row  >
	      <div  :id="editorID"
              v-on:keydown.meta.enter="onKey"
              v-on:keydown.ctrl.enter="onKey"
              @contextmenu.prevent="onContextMenu"  >{{initialGA}} </div>

		</b-row>

</b-container>

  <input type="text" v-show="false"    value="something nice"  ref="copyPasteCarrier" />

<vue-context id="CtxMenuEditor" ref="gamenu">
 <!-- <li>
      <a v-show   href="#" @click.prevent="onClick('copy')">Copy</a>

  </li><li>
      <a   v-show href="#" @click.prevent="onClick('paste')">Paste</a>
  </li>
  -->
      <li>
        <a href="#" @click.prevent="onClick('editUsedSignals')"> Edit used signals </a>
      <li>
          <a v-show = "false" href="#" @click.prevent="onClick('loadGA')">Upload and edit T-EARS a file</a>
      </li>
      <hr>
        <li>
          <a :v-show = "gafile_url" href="#" @click.prevent="onClick('reloadGA')">Revert to T-EARS file on server</a>
      </li>
        <li>
          <a :v-show = "gafile_url" href="#" @click.prevent="onClick('saveEditedGA')">Save T-EARS file to server file</a>
      </li>
      <hr>
      <li v-if="editorID=='tears-editor-horizontal' ">
          <a href="#" @click.prevent="onClick('save')"> Save Editor Contents and Relevant Signals </a>
      </li>
      <li>
          <a v-if="editorID=='tears-editor-horizontal'" v-show="false" href="#" @click.prevent="onClick('loadExample')"> Load Contents and Relevant Signals </a>
      </li>
      <hr v-if="editorID=='tears-editor-horizontal' ">
      <li>
          <a href="#" @click.prevent="onClick('enableDefaults')">Enable Loaded Global Definitions</a>
      </li>

       <li>
           <a href="#" @click.prevent="onClick('disableDefaults')">Disable Global Definitions </a>
       </li>
       <hr>
       <li>
           <a href="#" @click.prevent="onClick('editDefaults')"> Global Definitions -> Editor Contents </a>
       </li>
       <li>
           <a href="#" @click.prevent="onClick('replaceDefaults')"> Editor Contents -> Global Definitions  </a>
       </li>
       <hr>
       <li>
           <a href="#" @click.prevent="onClick('evaluate')"> Evaluate Expression </a>
       </li>


   </vue-context>

</div>
</template>

<script>
 import * as brace from 'brace';
 var Range = brace.acequire('ace/range').Range;

 import 'brace/theme/monokai';
 import 'brace/ext/language_tools';
 import './ace-tears/brace_mode_tears';

import { VueContext } from 'vue-context';

 import bus from './EventBus.vue';
 import * as EvalContext from './EvalContext.js';


 import * as Expressions from './Expressions.js';

var tears = require('./Tears.js');


 export default {
     name: "gaeditor",
     components: {
       VueContext
     },

     props:{
       editorID:{
          default: "tears-editor-horizontal"
       },
       orientation:{
          default: "horizontal"
       },
       theme:{
         default:"ace/theme/monokai"
       }
     },
     data() {
         return {
             
             currentFocus:"tears-editor-horizontal",
             exampleFile:null,
             gaFile:null,

            //initialGA: "ignore > 180 \nwhile select(A,B,C) >0",
            //initialGA: "while count(rising_edge([[70,71],[72,73],[150,151],[160,161]]),[[59,80],[100,158]])>0",

            initialGA: "def intervals A = [[15,30],[35,45]]\ndef intervals B = [[10,20],[40,44]]\n\nwhile A shall B",
            //initialGA: "def events A = [15,30,35,45]\n def events B= [10,20,25,40]\n const C = 30\n while between(A,C)",
            //
            //initialGA: "def events P = [1s,10s,20s] def intervals I = [[0s,15s],[16s,30s]] while count ( P,I ) > 0",
            //  initialGA:"while bitmask(4,A)==4",
            //   initialGA:"while abs(A)>5",
            // NOT finished with this   initialGA:"when sequence [10s,12s] store timepoint as t0-> [15s] within 10s ->[80s] within 100s shall B at t0 - B >10",
            //     initialGA:"when [0s] shall sequence SelectorLever>0 for 1s within 50s -> [15s,16s,17s] within 16s ->[80s] within 100s within 120s", // Should be[80]

            //  initialGA:"when sequence    [10s,20s,50s]                   store timepoint as start \n              -> [15s,25s,30s,53s] within 16s    store timepoint as mid\n              -> [30s,35s,80s] within 100s\
            //store timepoint as end\nwhile between(start,end)",
              //initialGA:"/* should issue warning*/ while [[10s,20s]] shall between([1s],[2s])",
            //   initialGA: "while between([10s,20s,30s] , [15s,16s,25s,30s,50s])  shall Gear_Mode_SCANIA>1.5",
            // initialGA: "while count([10s,20s,27s,30s,31s,32s,33s,34s,40s] , [[1s,25s],[30s,60s]]) >0 ",
            //  initialGA: "def events A =   [10s, 20s,     30s,    45s ,   100s] \ndef events B =    [12s,  23s,25s,   40s,              150s]\ndefevents C = [10s,   20s,        35s,         50s]\nwhen A and [[-10s,1000s]] shall  B within 10s ",
            //initialGA: "def events A =   [10s,13s, 20s,     30s,    45s ,   100s] \n"
            //           + "def events B =    [12s,  23s,25s,   40s,              150s]\n"
            //           + "def events C = [10s,   20s,        35s,         50s]\n"
            //           +  "when [9s,30s] shall (sequence "
            //           +                        "A within 10s store timepoint as start\n\t"
            //           +                      "->B within 20s \n\t"
            //           +                      "->C within 10s store timepoint as end) within 100s",
            //initialGA: "const kalle = 12 when [2s, 10s, 40s]",
            //initialGA: " when (SelectorLever>0 and SelectorLever>0.5) for 20s  or (SelectorLever>2 for 20s)  ",//shall SelectorLever==0 for 2s within 40s ",
            //initialGA: "while (SelectorLever>0)  or (SelectorLever>5) ",//shall SelectorLever==0 for 2s within 40s ",
            //initialGA: " when [[4s,20s]] for 2s shall[25s] within 30s   ",
            //initialGA: "def intervals kalle SelectorLever>0 while kalle shall SelectorLever==0 within 40s ",
            //initialGA: "def kalle rising_edge(SelectorLever>0) when kalle shall SelectorLever==0 for 2s within 40s ",
            //initialGA: 'while fb_btn_pressed == ready_to_run',
             //initialGA: "while SelectorLever > 0",
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
             // initialGA: 'def events kalle {\n\trising_edge(SelectorLever_Mode)\n}\n' +
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
             // initialGA: 'def events E_full_beam_ON {\n' +
             // 					 '\trising_edge(fb_btn_pressed) and (ready_to_run == 1 and full_beam == 0)\n' + '}\n' +
             // 					 'where fb_btn_pressed == defined\n' +
             // 					 'when E_full_beam_ON\n' +
             // 					 'shall full_beam == 1 within 0.2 s',
             //VECS-DEMO, SLIDE 29
          /*    initialGA: 'def intervals E_full_beam_ON = \n' +
                            '\trising_edge(pushbutton > 0) and\n' +
              							'\t(Head_light_full_beam_on == 0 and\n' +
              							'\tReadyToRun == 1)\n' +

              						'def intervals E_full_beam_OFF = \n' +
                          '\t(rising_edge(pushbutton > 0) or\n' +
                          '\tfalling_edge(ReadyToRun)) and (\n' +
              							'\tHead_light_full_beam_on == 1 and\n' +
              							'\tReadyToRun == 1 )\n' +

              						'while between(E_full_beam_ON, E_full_beam_OFF)\n' +
              						'shall Head_light_full_beam_on == 1 within 2000s\n',*/

             evauationStatus: "warning",
             markings: [], //{}, /* {line_nr: marking_id} */
             lastError:"",
             lastParserTip: ""
         }
     },
     methods: {

       onDrop(e){
         if (e.stopPropagation) {
           e.stopPropagation(); // Stops some browsers from redirecting.
         }
         let signame = e.dataTransfer.getData('text/html');
         signame = signame.substr(signame.indexOf(">")+1);
         console.log("GAEditor.vue::onDrop ",e,signame)

         return false;
       },
       onContextMenu(e){
         e.stopPropagation();
         this.$refs.gamenu.open(e);
        },
        onClick (choice) {
          let self = this;
          let defBlock = EvalContext.getInstance().getDefaultDefinitionBlock();
          switch(choice){
            /* TODO, we need some library for this sinve there is a ton of
               securitu stuff preventing this to work.
              case 'copy':
            let el = this.$refs.copyPasteCarrier;
            el.value =   this.tearsEditor.getSelectedText();
            el.select();
          console.log(document.execCommand('copy'));
            this.tearsEditor.clearSelection();
            break;
            case 'paste':    // Not supported
            navigator.clipboard.readText().then(
                clipText =>   this.tearsEditor.insert(clipText));

            break;
            case 'loadGA':   // TODO: FIXME
            debugger;
            this.$refs.gafile.$el.click(event);
            break;*/
            case 'reloadGA':
                self.reloadGA();    
                break;
            case 'saveEditedGA':
                self.saveEditedGA();
                break;
            case 'editUsedSignals':
                self.editUsedSignals();
                break;
            case 'enableDefaults':
              defBlock.active = true;
            break;
            case 'disableDefaults':
              defBlock.active = false;
            break;
            case 'editDefaults':
            if (confirm("Overwrite editor context with global defs (and turn globals off).")) {
              defBlock.active = false;
              this.tearsEditor.setValue(defBlock.content);
              this.tearsEditor.clearSelection();
              }
            break;

            case 'replaceDefaults':
              if (confirm("Overwrite current global definitions with editor contents.")) {
              defBlock.active = true;
              defBlock.fileName = "Copied from " + this.editorID
              defBlock.constDefAlias = undefined;
              defBlock.content = this.tearsEditor.getValue();
              this.tearsEditor.setValue("");
              this.tearsEditor.clearSelection();
              console.table("Global definitions from ctx menu: ",defBlock);
            }
            break;
            case 'evaluate':
              this.evaluate();
              return;
            break;
            case 'save':
            this.createUnitTest();

          }
          EvalContext.getInstance().setDefaultDefinitionBlock(defBlock);

          this.evaluate(false);
        },
        
        onFocusChanged(e){
          var self = this;
          if(self.currentFocus === self.editorID) return; // No double events...
          bus.$emit('focus-changed-to',self.editorID);
          return false;
        },
        onKey(e){
           this.evaluate();
         },
        reloadGA(){
                var url = new URL(window.location.href);
                let gafile  = url.searchParams.get("ga");
                if (gafile == null) return;
                var r = confirm("Do you really want to replace current editor content with \n" + gafile);
                if(r == false) return;
                let editorText  = this.tearsEditor.getValue();
                 
                bus.socket.send(JSON.stringify({type: 'bt-load-ga',path: gafile}));     
        },

        saveEditedGA(){
                var url = new URL(window.location.href);
                let gafile  = url.searchParams.get("ga");
                if (gafile == null) return;
                var r = confirm("Do you really want to replace content on server for \n" + gafile);
                if(r == false) return;
                let editorText  = this.tearsEditor.getValue();
                bus.listeners['bt-save-resp'] = self.remote_save_req_response;
                bus.socket.send(JSON.stringify({type: 'bt-save-ga', gatext:editorText,path: gafile}));
                console.log("Sent request for saving " + gafile);
            
                // TODO, response is sent to on_message so we should register an event handler in EventBus
        },
        onremote_save_req_response(response){
               confirm("Fileserver response: \n" + response['message']); 
        },

        editUsedSignals(){
            // This function extracts the currently use signals and adds them
            // to a signal editor
            let editorText  = this.tearsEditor.getValue();

            let usedSignals = new Set(tears.getUsedSignals(editorText));
            // TODO: Remove all plots being edited ? 
            if(typeof usedSignals !== 'undefined')
              bus.$emit('signal-editor-edit-multiple-signals', usedSignals);
          },

         createUnitTest(){
           var signr = 1;
           var timestampv = []

           var ctx = EvalContext.getInstance();
           function hastimestamps(timestampv,timestamps){}
           let oldXmin = EvalContext.getInstance().getXmin();
           let oldXmax = EvalContext.getInstance().getXmax();

           let xmin = Number.MAX_VALUE;
           let xmax = -Number.MAX_VALUE;

          let editorText  = this.tearsEditor.getValue();
          var doc = '{"version":"2.0",\n';
          doc += '"editorText":' + JSON.stringify(editorText) + ',\n';
          var res = tears.evaluate_tears_expression(editorText);
          let usedSignals = new Set(tears.getUsedSignals(editorText));

          if (res.status !='OK') {
            alert("Cannot Save with evaluation errors!\nAre you sure you are using the snippet editor, and not the left pane editor?");
            return;
          }

          // NEW, add also manually selected signals for viewing
          let signals = ctx.getExposedInternalSignalStructure()
          signals.forEach(ts => {
            if(ts.selected){
              console.log("Adding signal ", ts.name)
              usedSignals.add(ts.name); // TODO make sure used signals also use name to avoid duplicates
            }
          })
          doc    += '"signals" :{';
          for (let s of usedSignals){
            var curr = ctx.getSignal(s);
            doc += '"Signal_' + signr++ + '":';

            let range = EvalContext.getInstance().getXRange(curr);
            if (range.min < xmin) {
                xmin = range.min;
            }
            if (range.max > xmax) {
                xmax = range.max;
            }
            var serialized_signal = { pretty_print:curr.pretty_print,
                                     newName:curr.name,
                                     xAxis:curr.xAxis,
                                     values:curr.values,
                                     selected:curr.selected};

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

          doc+=  ',"globals": ' + JSON.stringify(EvalContext.getInstance().getDefaultDefinitionBlock().content) ;

          doc += '}';
          //console.log("GAEDitor.vue::createUnitTest signals used:", doc)
          // If file is specified in parseTree, we use that name instead.

          var fileName = "saga_example.js";

          var element = document.createElement('a');
          element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(doc));

          element.setAttribute('download', fileName);

          element.style.display = 'none';
          document.body.appendChild(element);

         element.click();

         document.body.removeChild(element);

         },
         onEditExternalText(text, targetEditor,evaluate = false, askfirst = true){
           let self = this;
           console.log("GAEditor.vue::onEditExternalText ", targetEditor , self.editorID);
           if(targetEditor != self.editorID)
             return;
           if(askfirst == true){
              var r = confirm("Do you really want to replace current edited text");
              if(r == false) return;
           }
           self.tearsEditor.setValue(text);
           self.tearsEditor.clearSelection();
           if(evaluate == true) self.evaluate();
         },

         loadExample(e){  //i.e load UnitTest
          var self = this;
          bus.$emit('remove-all-manual-plots');

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
              self.tearsEditor.setValue(editorText);
              self.tearsEditor.clearSelection();

              EvalContext.getInstance().forceUnitTestClearContext();
              EvalContext.getInstance().forceUnitTestSetTimeStamps(signals['TimeStamps']);
              for (let s in signals){
                 if( s !== 'TimeStamps'){
                   let signal = ctx.createNewSignal(signals[s]);
                  // signal.selected = true;
                  // bus.$emit('newplot', signal);
                 }
              }
              EvalContext.getInstance().updateShortNames();
              EvalContext.getInstance().updateRange();

              let defBlock = EvalContext.getInstance().getDefaultDefinitionBlock();
              if(g.globals != undefined){
                defBlock.active = true;
                defBlock.fileName = "Extracted from loaded T-EARS file";  // Todo, use the filename...
                defBlock.constDefAlias = undefined;
                defBlock.content = g.globals
                EvalContext.getInstance().setDefaultDefinitionBlock(defBlock);
              }else{
               self.onClick ('disableDefaults');
              }

              bus.$emit('new-eval-context-avaliable');

              // The above will generate necessary events to switch EvalContext
              // but we want to load whatever evaluation the user got before
              // But first, add signal editors for the signals used in the expression.

              //self.evaluate();
              //console.log("Loaded example has been evaluated")

              self.editUsedSignals();
           };
           reader.readAsText(file);
         },
         loadGA(e){  //i.e load GA text from uploaded file
          var self = this;
          var file =  e.target.files[0];

          var reader = new FileReader();
           reader.onload = function(e) {
              var editorText = e.target.result.toString();
              self.tearsEditor.setValue(editorText);
              self.tearsEditor.clearSelection();
           };
           reader.readAsText(file);
         },
         setupEditor(editorName) {
           var self = this;
             var editor = brace.edit(editorName);
             editor.on("focus",self.onFocusChanged);
             editor.getSession().setMode("ace/mode/tears");
             editor.setTheme(self.theme);

            // editor.setTheme("ace/theme/textmate");
            // editor.setTheme("ace/theme/monokai");
             //editor.setAutoScrollEditorIntoView(true);
            // editor.$blockScrolling = Infinity;
             this.setupAutocompletion(editor);
             return editor;
         },
         setupAutocompletion(editor) {
             var self = this;

             /* Enable autocompletion */
             editor.setOptions({
                 enableBasicAutocompletion: true
             });
             if(editor.completers != undefined && editor.completers.length > 3)
                 editor.completers = editor.completers.slice(0,3);
             /* Add the list of short signal names to the autocompletion library */
             var signalCompleter = {
                 completerType:"signals",
                 getCompletions: function(editor, session, pos, prefix, callback) {
                     callback(null, EvalContext.getInstance().getAllSignalNames().map(function(signal) {
                         return {
                             caption: signal,
                             value: signal,
                             meta: "signal"
                         };
                     }));
                 }
             };
             editor.completers.push(signalCompleter);

             var defCompleter = {
               completerType:"defConstAliases",
               getCompletions: function(editor, session, pos, prefix, callback) {
                                    callback(null, EvalContext.getInstance().getConstDefAliasCompletions());
                               }
             };
             editor.completers.push(defCompleter);

           //console.log("GAEditor.vue::setupAutocompletion:: ",editor.completers)
         },
         clearMarkings() {
             this.markings.forEach(id => {
                 this.tearsEditor.getSession().removeMarker(id);
             });
             this.markings = [];
         },
         mark_invalid_expressions(causes) {
             //console.log("GAEditor.vue::mark_invalid_expressions " + JSON.stringify(causes));

             let self = this;
             if(causes.name != undefined) return;
             var lines = this.tearsEditor.getSession().getDocument().getAllLines();
             var annotations = [];
             var highlightRegions = [];
             function getRow(str){
               if (str == undefined) return 0;
               var cnt = str.split('\n');
               return cnt;
             }
             let pos =  causes.match("Line ([0-9]+), col ([0-9]+)");
             if(pos == null) return;
             // TODO: This does not work for some reason.
             // Maybe we should use the vue component for ace instead?
             let line = parseInt(pos[1]) - 1;
             let col = parseInt(pos[2]);
             let colEnd = col + 2;

             let posend =  causes.match("colEnd ([0-9]+)");
             if(posend != null){
               colEnd = parseInt(posend[1]);
             }
             annotations.push({row: line,
                        column: col,
                        text: causes.split("^")[1],
                        type: "error"
                      } );

             //console.log("GAEditor.vue::mark_invalid_expressions " + JSON.stringify({row: line,
            //       column: col,
            //       text: causes.split("^\n")[1],
            //       type: "error"
            //     }));


                 highlightRegions.push({
                     row: line,
                     fromColumn: col,
                     toColumn: col + 4
                 });

            // let Range = brace.acequire('ace/range').Range;
             highlightRegions.forEach(region => {
                 self.markings.push(this.tearsEditor.getSession().addMarker(
                     new Range(region.row, region.fromColumn, region.row, region.toColumn),
                     "underlineInvalid", "text", true));
             });

         }, //invalid exprs*/
         evaluate(useEditorText = true) {
             let self = this;

             self.tearsEditor.getSession().clearAnnotations();
             self.clearMarkings();
             self.evauationStatus = "warning";
             self.lastError = "Re - Evaluating the expression, please wait!";
             //console.group("GAEditor.js::evaluate()");
             let editorText = "";
             if(useEditorText == true)
                editorText = self.tearsEditor.getValue();
             //console.log("GAEditor::evaluate Just read expression ",editorText, self.orientation);
             let res = tears.evaluate_tears_expression(editorText);

             //console.log("GAEditor::evaluate() raw result -->  " + JSON.stringify(res));
             function extractErrorMsg(err){

                 if(err.message != undefined) return err.message; // For unknown issues
                 if(typeof err != "string" || err =="") return ("Unknown error:" + JSON.stringify(err));
                 var errLines = err.split('\n');
                 if (errLines.length == 1) return err.split("^")[1].substring(0);
                 return errLines[errLines.length - 1]

             }
             switch (res.status) {
                 case 'FAIL_SYNTAX':
                    try{
                       self.evauationStatus = "danger";

                       self.lastError =res.error.split(':')[0] +  "===> Syntax issue: " + extractErrorMsg(res.error);
                       //self.lastParserTip = JSON.stringify(res.message); // TODO make tool-tip later.
                       self.mark_invalid_expressions(res.error);
                       bus.$emit('ga-evaluated', '{"times": {}, "guards": [], "assertions":[] }');
                    }catch(e){
                       // Unknown SYNTAX error
                       console.log("GAEditor.vue::evaluate() case 'FAIL_SYNTAX' res.error =",  res.error);

                       self.lastError  = "Unknown Syntax error:" + res.error;
                       bus.$emit('ga-evaluated', '{"times": {}, "guards": [], "assertions":[] }');
                     }
                     break;
                 case 'FAIL_EVAL':
                 //console.log("GAEditor.vue::evaluate()  case 'FAIL_EVAL'");

                     self.lastError = "Evaluation issue: " + extractErrorMsg(res.error);
                     self.evauationStatus = "warning";
                     self.mark_invalid_expressions(res.error);

                     bus.$emit('ga-evaluated', '{"times": {}, "guards": [], "assertions":[] }');
                     break;
                 case 'OK':
                     //console.log("GAEditor.vue::evaluate()  case 'OK'");
                     this.tearsEditor.getSession().clearAnnotations();
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

         on_window_resize(){
           let self = this;

           var leftPane      = document.getElementById('left-pane')
           var rightPane     = document.getElementById("right-pane");
           var thisContainer =   document.getElementById(this.editorID);//

           if((leftPane == null)||
              ( rightPane == null) ||
                thisContainer == null ){
                debugger;
                 return;
               }
          /*
           if(self.orientation !== 'vertical'){
              thisContainer.style.height = "200px";
              this.tearsEditor.resize();
              return;
           }*/

            // Resize the tab-card first
            leftPane.style.height      = rightPane.offsetHeight + "px";
            thisContainer.style.height = rightPane.offsetHeight  -
                                         thisContainer.offsetTop - 40 + "px";

             // This call is required for the editor to fix all of
             // its inner structure for adapting to a change in size

             this.tearsEditor.resize();

         },
         on_focus_changed(newFocus){
            var self = this;

          //  console.log("GAeditor.vue::",self.editorID, " on 'on_focus_changed' from:",self.currentFocus ," to: ",newFocus);
            self.currentFocus = newFocus;
            bus.$emit('invalidate-plots');
            self.evauationStatus = "secondary";
            self.lastError = "Press Ctrl+Enter to evaluate! (The plots from the last evaluation are shown until then.)";

         },
         on_start_loading(leftToLoad){
        //   console.log("GAEditor.vue::on_start_loading:: Event received");
           this.evauationStatus = "warning";
            this.lastError =  "Please wait.... Loading and Processing Signal File.... " + leftToLoad + " files left to process.";
         }
     }, // methods
     watch: {

     },
     computed:{
        gafile_url:function(){
                //console.log("Asking for ga file name in the url");
                let url = new URL(window.location.href);
                let ga = url.searchParams.get("ga");
                //console.log("Asking for ga file name in the url " + ga);
           return ga     
        },

        globalDefinitionsFile: function(){
          //console.log("GAEditor.vue::computed globalDefinitionsFile:: Checking global def file")
          let defBlock = EvalContext.getInstance().getDefaultDefinitionBlock();
          if(defBlock.active)
          return "Loaded Definitions:" + defBlock.fileName;
          else return "No global definitions loaded";
        }
     },
     created() {
         var self = this;
         if(self.currentFocus === self.editorID){
           self.lastError =  "Please wait.... Loading Default Signal File...."
       }else{
           self.evauationStatus = "secondary";
           self.lastError = "Press Ctrl+Enter to evaluate!";
       }
          bus.$on('re-evaluation-request', function() {
              //console.log("GAeditor.vue:: on 'signal-list-updated' -------------")
              if( self.currentFocus == self.editorID) self.evaluate();
            });
          bus.$on('new-signal-created', function() {
                 //console.log("GAeditor.vue:: on 'signal-list-updated' -------------")
                   if( self.currentFocus == self.editorID) self.evaluate();
                  });

          bus.$on('edited-signal-updated', function() {
                      if( self.currentFocus == self.editorID)   self.evaluate();
                  });
          bus.$on('new-eval-context-avaliable', function() {
                      var editor = brace.edit(self.editorID);
                      self.setupAutocompletion(editor);
                      if( self.currentFocus == self.editorID) self.evaluate();
                   });
        bus.$on('window-resize', self.on_window_resize); // i.e GUI resize
        bus.$on('focus-changed-to',self.on_focus_changed);
        bus.$on('started-loading-data',self.on_start_loading);
        bus.$on('edit-text',self.onEditExternalText);
     },
     mounted() {
        // console.log("GAEditor.vue::mounted editor:",self.editorID);
         this.tearsEditor = this.setupEditor(this.editorID);
         this.testProp="Test"
         var self = this;
         self.tearsEditor.getSession().on('change', function() {
              if(self.evauationStatus === 'success'){
               bus.$emit('invalidate-plots');
              }
             self.evauationStatus = "secondary";
             self.lastError = "Press Ctrl+Enter to evaluate! (The plots from the last evaluation are shown until then.)";
         });

     }
 }
</script>

<style type="text/css" media="screen">
#tears-editor-vertical {
  padding-top: 0px;
    width: 100%;
    height: 300px;

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
#tears-editor-horizontal {
  padding-top: 0px;
    width: 100%;
    height: 100px;

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
