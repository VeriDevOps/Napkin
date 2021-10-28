<template>
<div style="max-height:840px">
  <!--
<small> Use the "Load Signals" tab in the left pane to load signal files. The contents of the definition file will be prepended to each G/A.</small><br>

<label for="defLoader" class="button">Load Definition file</label>
<input
  id="defLoader" ref="defLoader" type="file"
    @change="updateDefFileSelection()" accept=".ga, .txt"
    multiple="single" style="display:none">
  <i>{{definitionFile}}</i>
</input>
-->

	<label for="gaLoader" class="button">Load G/As</label>
	<input
		id="gaLoader" ref="gaLoader" type="file"
			@change="updateSelection()" accept=".ga, .txt"
			multiple="multiple" style="display:none">
      (Results of loaded G/As, see list below)
  </input>
<div id="ga-table-scroll" style='background:white;height:340px;overflow: auto; padding-left:0px;'>
	<table id="galist_table">
		<thead align="left"><tr>
        <th>Result</th>
        <th>File</th>
        <th>Eval Details</th>
    </tr></thead>
		<tbody>
			<tr	v-for="file in files" v-bind:title="file.ga" @contextmenu.prevent="onContextMenu($event,file,'123')"    @click="onRowClick(file)">
				<td v-bind:class="file.class" >{{file.progress}}</td>
        <td >{{file.path}}</td>
        <td>{{file.details}}
          	<table class="galist_table" v-bind:hidden="file.showDetails">
              <tr	v-for="r in file.rows"
                 @contextmenu.prevent="onContextMenu($event,file,r.name)" >
                <td v-bind:class="r.class" >{{r.name}}</td>
                <td >{{r.result}}</td>

              </tr>
            </table>
        </td>
			</tr>

		</tbody>
	</table>
</div>
 
<vue-context id="CtxMenu" ref="menu">
      <li>
          <a href="#" @click.prevent="onClick('details')">Show/Hide Details</a>
      </li>
       <li>
           <a href="#" @click.prevent="onClick('re-eval')">Re-Evaluate</a>
       </li>
       <li>
           <a href="#" @click.prevent="onClick('re-eval-all')">Re-Evaluate ALL</a>
       </li>
       <li>
           <a href="#" @click.prevent="onClick('subplots')">Show Subplots</a>
       </li>
       <li>
           <a href="#" @click.prevent="onClick('edit-v')">Copy file to Left Pane Editor</a>
       </li>
       <li>
           <a href="#" @click.prevent="onClick('edit-h')">Copy file to Snippet Editor</a>
       </li>
       <hr>
       <li>
           <a href="#" @click.prevent="onClick('remove')">Remove G/A file</a>
       </li>
   </vue-context>

 
</div>
</template>

<script>
import bus from "./EventBus.vue"
import * as FileFormats from "./FileFormats.js"
import * as EvalContext from './EvalContext.js';
import { VueContext } from 'vue-context';
var tears = require('./Tears.js');


export default {
	name: 'batchevaluator',
  components: {
   VueContext

  },
	/*props: {
		buttontext: {
			type: String,
			required: true
		},
		initialPath: {
			type: String,
			required: false
		},
		separator: {
			type: String,
			required: true
		}
	},*/
	data() {
		return {
    //   definitionFile:"No definition file loaded.",
    //   definitions:"// This should contain common def and aliases",
       files: [],
       currentCtxEntry:undefined //If we select a row for context menu...
  	}
	},
	methods: {
    onRowClick(currentCtxEntry){
       currentCtxEntry.showDetails = !currentCtxEntry.showDetails;
       this.$forceUpdate();
    },
    onContextMenu(e,f,name){
     e.stopPropagation();
     this.currentCtxEntry = f;
     this.currentCtxGA = name;
     this.$refs.menu.open(e);
    },
    onClick (choice) {
      switch(choice){
        case 're-eval':
        this.evaluate(this.currentCtxEntry.ga, this.currentCtxEntry);
        break;
        case 're-eval-all':
        this.files.forEach(currentCtxEntry =>{
            this.evaluate(currentCtxEntry.ga, currentCtxEntry);
        });
        break;
        case 'subplots':
        if(this.currentCtxGA == '123')
          alert("Expand the row and choose a particular G/A. Note that if the G/As are unnamed, the first evaluated G/A will be chosen.")
        // Note that we need to send a particular one. But for the other
        // Selections, the parent ctx menu will be used.
         var res = this.currentCtxEntry.result;
         for (var i = 0; i < res.length; i++){
           //console.log("Looking for ", this.currentCtxGA ,"Considering ",res[i].name);
           if(this.currentCtxGA == res[i].name && res[i].eval == true){
            //  console.log("Showing plots for " + JSON.stringify(res[i]));
             bus.$emit('ga-evaluated', JSON.stringify(res[i].value));
           }
         }

          break;

          case 'edit-v':
          bus.$emit('edit-text', this.currentCtxEntry.ga, 'tears-editor-vertical')
          break;
          case 'edit-h':
          bus.$emit('edit-text', this.currentCtxEntry.ga, 'tears-editor-horizontal')
          break;

        case 'details':
        this.currentCtxEntry.showDetails = ! this.currentCtxEntry.showDetails;
      }

    },
    evaluate(gaText,entry){
      bus.$emit('focus-changed-to',1234); // Take out editors!
      entry.ga = gaText;
      entry.progress = "Evaluating";

    let res = tears.evaluate_tears_expression(gaText, false, true);

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
          //console.log("GAEditor.vue::evaluate() case 'FAIL_SYNTAX'");
              entry.class = "gaSyntaxFail";
              entry.progress = "Syntax Fail";
              entry.details = res.error.split(':')[0] +  " Syntax issue: " + extractErrorMsg(res.error);
              //self.lastParserTip = JSON.stringify(res.message); // TODO make tool-tip later.
              break;
          case 'FAIL_EVAL':
          //console.log("GAEditor.vue::evaluate()  case 'FAIL_EVAL'");
              entry.class="gaEvalFail";
              entry.progress = "Eval Fail";
              entry.details  = " Evaluation issue: " + extractErrorMsg(res.error);
              break;
          case 'OK':
             // Each evaluation gets its own row:

             var guards = 0; // Totals
             var fails = 0;
             var passes = 0;
             entry.rows = [];
              res.evaluation.forEach(ga =>{

                var res = ga.value;
                var row = {name:ga.name};

                if(ga.eval == false){
                   row.class = 'gaNotRun';
                   row.result = "Where clause prevented G/A to be evaluated";
                }else {
                  // Count passes and fails
                  guards += res.times.valid.length;
                  fails  += res.times.fail.length;
                  passes += res.times.pass.length;
                  row.result = "[" + res.times.valid.length +
                            " Guard Activations] [" + res.times.pass.length +
                            " passes ], and,  [" +
                            res.times.fail.length + " fails] ";
                  if(res.times.fail.length>0){
                    row.class = 'gaFailed';
                  }else
                  if(res.times.pass.length>0){
                    row.class = 'gaOK';
                  }
                  if(res.times.valid.length==0) {
                    row.class = 'gaNotRun';
                    row.result = "Guard never activated";
                  }
                }// where clause

                entry.rows.push(row);
              })// sub-rows
              entry.showDetails = true;
              // Make summary!
              entry.class    = "gaOK";
              entry.progress = "PASS";

              entry.result   = res.evaluation; // Note this is the whole result!
              // Here we need to apply a higher level eval policy to see
              // if the
              entry.details = "Grand total: [" + guards + " Guard Activations] [" + passes +
                              " passes ], and,  [" + fails + " fails] "
              // TODO: Add more stats an analysis here!

              if(guards == 0){
                entry.class = "gaNotRun";
                entry.progress ="Not Activated";
              }
              if(fails > 0){
                entry.class = "gaFailed";
                entry.progress = "FAIL";
              }
              break;
          default:
              console.log("GAEditor.js::evaluate() cannot handle evaluation " + JSON.stringify(res));
      }
      //console.log("BatchEval.vue: returning entry ",entry);
      return entry;
    },/*
    updateDefFileSelection() {

      var self = this;
      self.definitionFile = self.$refs.defLoader.files[0].name;
      //console.log("BatchEvaluator.vue::updateDefFileSelection", self.definitionFile)
      var reader = new FileReader();
 			reader.onload = function(e) {
         let gaText = e.target.result;
         let defBlock =  {
              content:gaText,
              fileName: self.definitionFile,
              active:true
             }
         EvalContext.getInstance().setDefaultDefinitionBlock(defBlock);
         // Trick tears to evaluate the global defs if any.
         let ignore_result = tears.evaluate_tears_expression("", false, true);
         //self.definitions = gaText;
 			}; // READER callback end
 			reader.readAsText(self.$refs.defLoader.files[0]);
    },*/
		updateSelection() {
			var self = this;

       self.files = [];

      self.leftToLoad = self.$refs.gaLoader.files.length - 1;
			for (var i=0; i<self.$refs.gaLoader.files.length; i++) {
        self.files.push({path:self.$refs.gaLoader.files[i].name,
                        ga:"",
                        progress:'queued',   // RED/GREEN/YELLOW aggregated result (first cell)
                        class:'fileRow',     // How the first cell should be shown!
                        details:"",         // Aggregated results
                        showDetails:false,   // decides of the rows below should be visible or not.
                        rows:[]});        // subtable rows with individual results
			}
      for (var i=0; i<self.$refs.gaLoader.files.length; i++) {
        self.loadFile(self.$refs.gaLoader.files[i])
      }

		},
		/** Read the contents of the selected file and notify other components
		* (e.g. SignalList) about new jsondiff-data */
		loadFile(file) {
      var self = this;
      var entry;
      self.files.forEach(f => {
       if(f.path === file.name){
         entry = f;
         f.progress = "loading";
       }
     })


      //bus.$emit('started-loading-data',self.leftToLoad);
			var reader = new FileReader();
			reader.onload = function(e) {
        let gaText = e.target.result;
        //console.log("Loading GA " + file.name);
        self.evaluate(gaText,entry);

			}; // READER callback end
			reader.readAsText(file);

		},
    on_bus_re_evaluate_all(){
       this.files.forEach(currentCtxEntry =>{
            currentCtxEntry.class="gaEvaluating";
            currentCtxEntry.progress = "Wait";
            currentCtxEntry.details  = " Evaluating, Please Wait... ";
            this.evaluate(currentCtxEntry.ga, currentCtxEntry);
        });
    },
    on_window_resize(){
      //console.log("RESIZING BatchEvaluator")
      let self = this;

      var leftPane      = document.getElementById('left-pane')
      var rightPane     = document.getElementById("right-pane");
      var thisContainer = document.getElementById("ga-table-scroll");

       if((leftPane == null)||
         ( rightPane == null) ||
           thisContainer == null )
            return;

       // Resize the tab-card first
       leftPane.style.height = rightPane.offsetHeight + "px";
       leftPane.style['max-height'] = rightPane.offsetHeight + "px";


       thisContainer.style.height = rightPane.offsetHeight -
                                     thisContainer.offsetTop - 10 + "px";
        //TODO: This should really be done in the app.vue
        var helpPane     = document.getElementById("help-pane1");
        helpPane.style['max-height'] = rightPane.offsetHeight -50 + "px";
        helpPane.style['height']    = rightPane.offsetHeight -50 + "px";
        var helpPane     = document.getElementById("help-pane2");
        helpPane.style['max-height'] = rightPane.offsetHeight -50 + "px";
        helpPane.style['height'] = rightPane.offsetHeight -50 + "px";
        var helpPane     = document.getElementById("help-pane3");
        helpPane.style['max-height'] = rightPane.offsetHeight -70 + "px";
        helpPane.style['height'] = rightPane.offsetHeight -70 + "px";
         
        var helpPane     = document.getElementById("help-pane4");
        helpPane.style['max-height'] = rightPane.offsetHeight -70 + "px";
        helpPane.style['height'] = rightPane.offsetHeight -70 + "px";
    }
	},
	created() {
		var self = this;

    bus.$on('window-resize'    , self.on_window_resize); // i.e GUI resize
    bus.$on('new-eval-context-avaliable', this.on_bus_re_evaluate_all);
    bus.$on('edited-signal-updated', this.on_bus_re_evaluate_all);

	}
}
</script>

<style>
.button {
	display: inline-block;
	background:#28a745;
	border-radius: 4px;


	font-size: 14px;
	color: white;

	cursor: pointer;

}
.button:hover{
  	background:#218838;
}

.garow {
   font-weight: normal;
}
.gaOK {
   font-weight: bold;
  background:#28a745;
}
.gaNotRun {
   font-weight: normal;
  background:yellow;
}
.gaSyntaxFail {
   font-weight: normal;
  background:pink;
}
.gaEvalFail {
   font-weight: normal;
  background:orange;
}
.gaFailed {
   font-weight: normal;
  background:red;
}
.gaEvaluating {
   font-weight: normal;
  background:gray;
}

#galist_table {
    font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
    border-collapse: collapse;
  font-size: 12px;
}

#galist_table td, #siglist_table th {
    border: 1px solid #ddd;
    padding: 4px;

}

#galist_table tr:nth-child(even){background-color: #f2f2f2;   }

#galist_table tr:hover {background-color: #ddd;   }

#galist_table th {
    padding-top: 2px;
    padding-bottom: 2px;
    text-align: left;
    background-color: #4CAF50;
    color: white;
    font-size: 12px;
}

</style>
