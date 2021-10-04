<template>
<div>

  <div   style='background:white; padding-left:30px;'>
    <h4> Log files </h4>
  <select v-model="selectedFileFormat" style="cursor:pointer;">
    <option v-for="option in formatList" v-bind:key="option.id" v-bind:value="option.id">
    {{ option.format }}  {{ option.name }}
    </option>
  </select>
  <select v-model="selectedAction" style="cursor:pointer;">
    <option v-for="option in loadActionList" v-bind:key="option.id" v-bind:value="option.id">
     {{ option.name}}
    </option>
  </select>
  <!-- <input type="checkbox" id="checkbox" v-model="mergeSignals" style="cursor:pointer;">
  <label for="checkbox" > Merge Signals</label> -->
  <br>
  <input type="checkbox" id="checkboxCleer" v-model="clearSignals" style="cursor:pointer;">
  <label for="checkbox" > Clear Current Signal List</label><br>
	<label for="fileLoader" class="button">Select Log File(s)</label>

	<input
		id="fileLoader" ref="fileLoader" type="file"
			@change="updateSelection()" accept=".jsondiff, .txt"
			multiple="multiple" style="display:none">
  </div>
<div id="file-table-scroll" style='background:white;height:340px;overflow: auto; padding-left:30px;'>
	<table>
		<thead align="left"><tr>
        <th>Status</th>
        <th>Selected Files</th>
        <th>Start -> Duration</th>

    </tr></thead>
		<tbody>
			<tr	v-for="file in files" v-bind:key="file.path">
				<td v-bind:class="file.class">{{file.progress}}</td>
        <td v-bind:class="file.class">{{file.path}}</td>
        <td v-bind:class="file.class" style = "	font-size: 12px;">{{file.timespan}}</td>
			</tr>

		</tbody>
	</table>

<hr>


<h4> Main definition file </h4> The contents of the definition file will be prepended to each G/A.<br>

<label for="defLoader" class="button">Select Definition file</label>
<input
  id="defLoader" ref="defLoader" type="file"
    @change="updateDefFileSelection()" accept=".ga, .txt"
    multiple="single" style="display:none"><br>
  <i  >{{definitionFile}}</i>
 

</div>
</div>
</template>

<script>
import bus from "./EventBus.vue"
import * as FileFormats from "./FileFormats.js"
import * as EvalContext from './EvalContext.js';
var tears = require('./Tears.js');


export default {
        name: 'filebrowser',
        components: {
                //dropdown
        },
	props: {
		buttontext: {
			type: String,
			required: true
		},
		initialPath: {
			type: String,
			required: true
		},
		separator: {
			type: String,
			required: true
		}
	},
	data() {
		return {
		   files: [],
                selectedFileFormat : 2,
                formatList:FileFormats.formatList,
                loadActionList:[// {id:0,name:'Load New (erase current)'},   // OBSOLETE
                                // {id:1,name:'Keep relative timeline  '},   // TODO Fix rebase function.
                                {id:2,name:'Rewind each log to zero '}],
                selectedAction:2,
                clearSignals:true,
                loadedText: "Currently loaded files:",
                definitionFile:"no file loaded"
		}
	},
	methods: {

		updateSelection() {
			var self = this;
                        if(self.$refs.fileLoader.files.length > 1 && self.selectedAction ==0){
                                alert("Please choose Merge new or compare logs to load several files");
                                return;
                        }
                        if (self.clearSignals){
                                self.files = [];
                                EvalContext.getInstance().clearContext();
                        }

                        self.leftToLoad = self.$refs.fileLoader.files.length - 1;
                        for (var i=0; i<self.$refs.fileLoader.files.length; i++) {
                                self.files.push({path:self.$refs.fileLoader.files[i].name,
                                                progress:'queued',
                                                class:'fileRow',
                                                timespan:""});
                                                }
                        for (var i=0; i<self.$refs.fileLoader.files.length; i++) {
                                self.loadFile(self.$refs.fileLoader.files[i])
                        }

		},
		/** Read the contents of the selected file and notify other components
		* (e.g. SignalList) about new jsondiff-data */
		loadFile(file) {
                        var self = this;
                        
                        self.files.forEach(f => {
                                if(f.path === file.name){
                                        f.progress = "loading";
                                }
                        });

                        //bus.$emit('started-loading-data',self.leftToLoad);
                        var reader = new FileReader();
                        reader.onload = function(e) {
                                let data = e.target.result;
                                console.log("Loading " + file.name);
                                // TODO: Very strange that file "survives" since it is in the callers scope
                                if(file.name.split('.').pop() == "jsondiff")
                                self.selectedFileFormat = 0; // TODO: This can be improved a lot....
                                else
                                self.selectedFileFormat = 1;
                                var formatter = FileFormats.getFormat(self.selectedFileFormat);
                                // TODO: VALIDATE THAT THE FILE FORMAT IS CORRECT!!!
                                try{
                                var signals = formatter.load(data,file.name,true);
                                } catch(err){
                                console.log("File " + file.name + " caused \n "+ err);
                                signals = [];
                                }
                                if(signals != undefined && signals.length > 0){


                                EvalContext.getInstance().mergeSignals(signals, this.selectedAction == 1);
                                //console.table( EvalContext.getInstance().getExposedInternalSignalStructure())
                                //console.log("FileBrowser.vue::loadFile loaded ");

                                // at least one signal. All signals in same CSV log starts at the same time


                                var logInfo = signals[0].logInfo;

                                var logStart = logInfo.formatter.parseTime(logInfo.startTime);
                                var logEnd   = logInfo.formatter.parseTime(logInfo.endTime);
                                var duration = logInfo.formatter.formatSeconds(logEnd - logStart);

                                var max = -10000;
                                signals.forEach(s => {
                                max = Math.max(max,s.xAxis[s.xAxis.length -1]);
                                })
                                max = max + 0.0; // Make sure we have float :)
                                self.files.forEach(f => {
                                        if(f.path === file.name){
                                                console.log("Finished with file ", file.name);
                                                f.class = "filerowLoaded";
                                                f.progress = "loaded";
                                                f.timespan = logInfo.formatter.formatTime(logInfo.startTime) + " -> " + duration;
                                        }
                                })
                                 } else{
                                        self.files.forEach(f => {
                                        if(f.path === file.name){
                                                console.log("Finished with file ", file.name);
                                                f.class = "filerowLoadFailed";
                                                f.progress = "failed/empty";
                                        }
                                        })
                                }//failed to load any signals

                                self.leftToLoad--;  // Succeeded or not, one file down..
                                bus.$emit('started-loading-data',self.leftToLoad);
                                if (self.leftToLoad <= 0)
                                        bus.$emit('new-eval-context-avaliable', EvalContext.getInstance().getExposedInternalSignalStructure());
                                //console.log("FileBrowser.vue::loadFile sent jsondiff event");

                        }; // READER callback end
                        reader.readAsText(file);

		},
    updateDefFileSelection() {

      var self = this;
      self.definitionFile = self.$refs.defLoader.files[0].name;
      //console.log("FileBrowser.vue::updateDefFileSelection", self.definitionFile)
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

      }; // READER callback end
      reader.readAsText(self.$refs.defLoader.files[0]);
    },
    on_window_resize(){
      let self = this;

      var leftPane      = document.getElementById('left-pane')
      var rightPane     = document.getElementById("right-pane");
      var thisContainer = document.getElementById("file-table-scroll");

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
		self.files.push({path: self.initialPath,
                     class:'filerow',
                     progress:'loading',
                     timespan:""})
    bus.$on('window-resize'    , self.on_window_resize); // i.e GUI resize

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

.filerow {
   font-weight: normal;
}
.filerowLoaded {
   font-weight: bold;
  background:lightgreen;
}
.filerowLoadFailed {
   font-weight: normal;
  background:red;
}
</style>
