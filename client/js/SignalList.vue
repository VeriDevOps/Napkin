<template>
<div id="signallist" style='height: 592px;  resize: inherit;'>
	Filter:<input v-model="filter_text" placeholder="filter"/>
	 Name:<input v-model="save_file_name" placeholder="filename for download signals"/>
	<b-button id="downloadbutton" @click="onDownload" variant="success" :disabled="false"> Download </b-button>
  	<div id="table-scroll" style='height:540px;overflow: auto;'>
    	<table  id="siglist_table" style="width:1500px;align:right;    font-size: 10px;">
        <thead>
        	<tr >
            <th><span class="text">Short Name, * = nonunique </span></th>
					  <th><span class="text"> Size</span></th>
						<th><span class="text"> Full Name</span></th>
						<th><span class="text"> Full Path</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="signal in filteredSignals"
							v-bind:key="signal.newName"
						  draggable="true"
						  @dragstart="onStartDrag"
							@click="toggleSelected(signal)"
              @contextmenu.prevent="onContextMenu($event,signal,'123')"
							:style="formatRow(signal)"
							:id="signal.newName">
						<td> <b > {{signal.shortName}} </b> </td>
						<td>      {{signal.length}} </td>
						<td>      {{signal.name}} </td>
					  <td>      {{signal.newName}} </td>
          </tr>
        </tbody>
    </table>
  </div>


   <vue-context id="SigListCtxMenu" ref="menu" >
        <li>
            <a href="#" @click.prevent="onClick('showHide')">Show/Hide Plot</a>
        </li>
          <hr>
          <b> {{this.currentCtxSignal.name}}</b>

        <li v-for="sigEntry in currentCtxSignals" :key="sigEntry.key" >
          <input type="checkbox" value="false"
                   style=" -moz-transform: scale(1);margin-right:10px;margin-left:5px;align=center;"
                  @click="onClick_CtxCheckBox($event,sigEntry)"
          >  {{sigEntry.signal.logInfo.name}}
        </li>
        <li>
            <a href="#" @click.prevent="onClick('compare')">Compare </a>
        </li>
     </vue-context>


</div>
</template>

<script>
import bus from './EventBus.vue';
import * as EvalContext from './EvalContext.js';

import { VueContext } from 'vue-context';

 export default {
	name: 'signallist',
	components: {
    VueContext

	},
	data() {
		return {
			signals: [],           // {name,shortName,fullName,dirty,filter,}
			filter_text: "",
			save_file_name :"",
			dirty:false,
			xmax: -100,
      currentCtxSignal : "No signal selected",
      currentCtxSignals:[],
      currentCtxKey:123
		}
	},
	computed: {

      filteredSignals:function(){
        var self = this
        var fa = self.filter_text.split(" ");

        return  self.signals.filter(function(signal){
                return  (self.filter_text.length < 1) ||
				    						 self.match_filter(fa,signal.newName);
        })

			}
	}, //computed
	methods: {
    onContextMenu(e,sig,name){
     this.currentCtxSignal = sig
     // get logfiles for the current signal:
    var sigs = EvalContext.getInstance().getSignals(sig.name);
    this.currentCtxSignals = [];
    sigs.forEach(s =>{
        this.currentCtxSignals.push({signal:s,selected:false,key:this.currentCtxKey});
        this.currentCtxKey += 1; // force ctx menu to be updated.
    })

     console.log("Selected sigs ",JSON.stringify(this.currentCtxSignals))
     e.stopPropagation();
     this.$refs.menu.open(e);
    },
    onClick (choice) {
      switch(choice){
        case 'showHide':
        this.toggleSelected(this.currentCtxSignal);
        break;
        case 'compare':
        var selected_signals = [];

        this.currentCtxSignals.forEach(s =>{
          if(s.selected && selected_signals.length < 2){
            selected_signals.push(s.signal);
          }
        })
        if(selected_signals.length < 2){
          alert("You need to select two logs to compare" + JSON.stringify(selected_signals));
          return;
        }

        console.log("Evaluating signal ", this.currentCtxSignal)
        // While s1 - s2 > 0
        var expr = "while true shall '" + selected_signals[0].newName + "'" ;
        expr = expr  +    "== '" + selected_signals[1].newName+ "'" ;

        bus.$emit('edit-text',expr,"tears-editor-horizontal",true);
        if(!selected_signals[0].selected) this.toggleSelected(selected_signals[0]);
        if(!selected_signals[1].selected) this.toggleSelected(selected_signals[1]);
        break;

        case 'details':

      }
    },
    onClick_CtxCheckBox(e,signal){
      e.stopPropagation();
      e.preventDefault;
      signal.selected =! signal.selected;
      return true;
    },
		formatRow(signal) {
      //console.log("SignalList.vue::formatRow ", signal.name);
			let fmtstr = signal.selected ? "background: lightblue;" : "nth-child(even){background-color: #f2f2f2;"
			return "white-space: nowrap;" + fmtstr + (signal.dirty ? "color:red" : "color:black");
		},
		match_filter:function(fa,signame){
      //console.log("SignalList.vue::match_filter ", signal.name);
			var len = fa.length;

			for(var i = 0; i < len ; i++){
					if(fa[i].indexOf("size") != -1){
							var t = parseInt(fa[i].substring(5,100));
							var s = EvalContext.getInstance().getSignal(signame).xAxis.length
							//console.log("Checking for size>10", fa[i][5],t,s,(t < s))
							if(((fa[i][4] == ">") && (t > s)) ||
								 ((fa[i][4] == "<") && (t < s))){
								//console.log("Skipping ",signame)
								return false;
							}
					}else //size keyword
					if((signame.toLowerCase().indexOf(fa[i].toLowerCase()) == -1)){
						return false;
					}
			}//for

			return true;
		},
		download_modified_signals:function(filename, text) {
			  var element = document.createElement('a');
			  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
			  element.setAttribute('download', filename + ".jsondiff");

			  element.style.display = 'none';
			  document.body.appendChild(element);

			  element.click();

			  document.body.removeChild(element);
		},
		onDownload: function(){
			  var doc = "{";
				var signr = 1;
				var timestampv = []
				function hastimestamps(timestampv,timestamps){}

				for (let i = 0; i < this.signals.length; i++)
				{
					var curr = this.signals[i]
					if (curr.dirty) {
						//console.log("Saving ", curr.shortName)
						doc += '"Signal_' + signr++ + '":';
            //TODO, get signal from bus.getEvalContext().getSignal(curr.name);
            var serialized_signal = { pretty_print:curr.pretty_print,
                                     newName:curr.newName,
                                     xAxis:curr.xAxis,
                                     values:curr.values};
            //Latency needs to be considered when loading as well TODO: see Trello
            //if(curr.latency)
            //serialized_signal.latency = curr.latency;
						doc += JSON.stringify(serialized_signal);
						doc += ","
						if(curr.timestamps &&
						   !timestampv.includes(curr.timestamps)){
								timestampv.push(curr.timestamps);
							}
						curr.dirty = false;
						}
					}//for

				doc += '"TimeStamps":';
				//console.log("Saving totally ", doc)
				// Condense all timestamps
				var tss  = Object.assign({}, ...timestampv);
				doc += JSON.stringify(tss) + '}'
        this.download_modified_signals(this.save_file_name!=""?this.save_file_name:"edited_signals",doc);
				this.dirty = false;
				//console.log("Save finished");
		},

		onStartDrag(e) {
		  //console.log("DRAGGING ", JSON.stringify(e.target.id))
		  e.dataTransfer.effectAllowed = 'copy';
    //  e.dataTransfer.setData('text/html', e.target.id);
		  e.dataTransfer.setData('text/plain', e.target.id);
		},
		toggleSelected(signal) {
      //console.log("SignalList.vue::toggleSelected ENTER", signal.newName, signal.selected)
			if(signal.selected)
			{
				signal.selected = false;
				bus.$emit('removeplot', signal.newName);
        this.$forceUpdate();
       }
			else
			{
				signal.selected = true;
				bus.$emit('newplot', signal);
        this.$forceUpdate();
			}

		},
    on_bus_remove_all_manual_plots(){
      console.log("REMOVING PLOTS")
      this.signals.forEach(s =>{
        if(s.selected){
          s.selected = false;
          console.log("REMOVING PLOT " + s.newName)
          bus.$emit('removeplot', s.newName);
            this.$forceUpdate();
        }
      });
    },
    on_bus_removeplot(_){
      this.$forceUpdate();
    },

    // Adds meta info about signal to the GUI list.
    _addMetaInfo(signal){
      let self = this;

      let sigEntry = signal;
      signal.selected = false;
      signal.dirty    = false;
      signal.filter   = true;
      if (signal.xAxis)
          signal.length   = signal.xAxis.length;
      else
          signal.length = 0;
      return sigEntry;
    },
    // The signal list has changed completely (e.g new file loaded from disk)
	  on_bus_new_eval_context_available(){
      //console.log("SignalList.vue::on_bus_new_eval_context_available incomning length is:");

      let self = this;

  	  self.filter_text = "";
      self.signals     = EvalContext.getInstance().getExposedInternalSignalStructure();
      self.dirty       = false;

      self.signals.forEach(s => self._addMetaInfo(s));

    },
    // The single named signal has changed in some aspect from some other editor.

    on_bus_edited_signal_updated(names){
        let self = this;
        if(!Array.isArray(names))
            names =[names]
        names.forEach(name => {
            //console.log("SignalList.vue::on_bus_edited_signal_updated ", name);
          
            var signal = EvalContext.getInstance().getSignal(name);
            if(signal){
                if (signal.xAxis){
                    signal.length   = signal.xAxis.length;
                }else{
                    signal.length = 0;
                }
                signal.dirty = true;
                this.dirty = true;
            }else
                console.log("SignalList.vue::on_bus_edited_signal_updated signal not found ",name)
                
        });
      this.$forceUpdate();
    },
    // The single named signal has been created from some other editor.
    on_bus_new_signal_created(signals){
        if(!Array.isArray(signals))
            signals = [signals]
        signals.forEach(signal => {
            let s = this._addMetaInfo(signal);
            s.dirty = true;
            //console.log("signal created",signal)
        });
      this.$forceUpdate();
    },
    on_window_resize(){
      let self = this;

      var leftPane      = document.getElementById('left-pane')
      var rightPane     = document.getElementById("right-pane");
      var thisContainer = document.getElementById("table-scroll");

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
    }
	},
	watch: {
		filter_text(newVal){
      return
			console.log("SignalList.vue::watch filter_text " + this.filter_text, this.signals.length);
			var fa = this.filter_text.split(" ");
			var len = this.signals.length;
			for (var i = 0; i < len; i++)
			{
				var name = this.signals[i].name;

			  this.signals[i].filter  = (this.filter_text.length < 1) ||
				    											 this.match_filter(fa,name);

			 }//for
		}
	},
	created() {
		var self = this;
    /* Update the .jsondiff-data */
		bus.$on('new-eval-context-avaliable', self.on_bus_new_eval_context_available);
		bus.$on('window-resize'    , self.on_window_resize); // i.e GUI resize
    // move this to SignalEditor and EvalContext ....
		bus.$on('get_signal_data'       , self.on_bus_get_signal_data);
    bus.$on('edited-signal-updated' , self.on_bus_edited_signal_updated);
    bus.$on('new-signal-created'    , self.on_bus_new_signal_created);
    bus.$on('removeplot',self.on_bus_removeplot);
    bus.$on('remove-all-manual-plots',self.on_bus_remove_all_manual_plots);
    // end remove
    this.signals = EvalContext.getInstance().getExposedInternalSignalStructure()


	}
}
</script>

<style>
#siglist_table {
    font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
    border-collapse: collapse;

}

#siglist_table td, #siglist_table th {
    border: 1px solid #ddd;
    padding: 4px;

}

#siglist_table tr:nth-child(even){background-color: #f2f2f2;}

#siglist_table tr:hover {background-color: #ddd;}

#siglist_table th {
    padding-top: 12px;
    padding-bottom: 12px;
    text-align: left;
    background-color: #4CAF50;
    color: white;
    font-size: 12px;
}

</style>
<style src="../assets/main.css"></style>

});
