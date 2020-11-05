<template>
<div id="signallist" style='height: 592px;  resize: inherit;'>
	Filter:<input v-model="filter_text" placeholder="filter"></input>
	 Name:<input v-model="save_file_name" placeholder="filename for download signals"></input>
	<b-button id="downloadbutton" @click="onDownload" variant="success" :disabled="!dirty"> Download </b-button>
  	<div id="table-scroll" style='height:540px;overflow: auto;'>
    	<table  id="siglist_table" style="width:1500px;align:right">
        <thead>
        	<tr>
            <th><span class="text">Short Name, * = nonunique </span></th>
					  <th><span class="text"> Size</span></th>
						<th><span class="text"> Full Name</span></th>
						<th><span class="text"> Full Path</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="signal in siglist"
							v-if="signal.filter==true"
						  draggable="true"
						  @dragstart="onStartDrag"
							@click="toggleSelected(signal)"
							:style="formatRow(signal)"
							:id="signal.name">
						<td> <b > {{signal.shortName}} </b> </td>
						<td>      {{signal.length}} </td>
						<td>      {{signal.name}} </td>
					  <td>      {{signal.newName}} </td>
          </tr>
        </tbody>
    </table>
  </div>
</div>
</template>

<script>
import bus from './EventBus.vue';
import bButton from 'bootstrap-vue/es/components/button/button';
import bFormCheckbox from 'bootstrap-vue/es/components/form-checkbox/form-checkbox';


export default {
	name: 'signallist',
	components: {
			bButton,
			bFormCheckbox
	},
	data() {
		return {
			signals: [],           // {name,shortName,fullName,dirty,filter,}
			filter_text: "",
			save_file_name :"",
			dirty:false,
			xmax: -100
		}
	},
	computed: {
	    // Siglist is the filtered list of signals that is shown.
      siglist:function(){
        //console.log("SignalList.vue::siglist computation ")
				var res = [];
				var sigs = this.signals
				var len =  sigs.length;
				for(var i = 0; i < len; i++){
					if(this.signals[i].filter){
						res.push(this.signals[i]);
					}
			   }
      //console.table(res);
			return res;
			}
	}, //computed
	methods: {
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
							var s = bus.getEvalContext().getSignal(signame).xAxis.length
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
        this.download_modified_signals(this.save_file_name!=""?this.save_file_name:"kalle",doc);
				this.dirty = false;
				//console.log("Save finished");
		},

		onStartDrag(e) {
		  // console.log("DRAGGING ", JSON.stringify(e.target.id))
		  e.dataTransfer.effectAllowed = 'copy';
		  e.dataTransfer.setData('text/html', e.target.id);
		},
		toggleSelected(signal) {
			if(signal.selected)
			{
				signal.selected = false;
				bus.$emit('removeplot', signal.name);
			 }
			else
			{
				signal.selected = true;
				bus.$emit('newplot', signal.name);
			}
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
	  on_bus_new_eval_context_available(signals){
      console.log("SignalList.vue::on_bus_new_eval_context_available incomning length is:", signals.length);

      let self = this;

  		self.filter_text = "";
      self.signals     = signals;
      self.dirty       = false;

      for (let i = 0 ; i < signals.length; i++){
         let s = signals[i];
         self._addMetaInfo(s);
      }//for
      //console.table(self.signals);
    },
    // The single named signal has changed in some aspect from some other editor.

    on_bus_edited_signal_updated(name){
      //console.group("on_bus_edited_signal_updated");
      //console.log("SignalList.vue::on_bus_edited_signal_updated ", name);
      // If the signal exists in the list, it has been created.
      let self = this;
      let len = self.signals.length;
      for (let i = 0; i < len;i++){
        if (name === self.signals[i].name){
          self.signals[i].dirty = true;
          this.dirty = true;
          //console.log("Set signal to dirty! ", self.signals[i].name);
        }
      }
      // TODO WHY does it not update properly? This is an ugly hack to provoke an update.
      this.filter_text = this.filter_text.trim() + " "
    },
    // The single named signal has been created from some other editor.
    on_bus_new_signal_created(signal){
      let s = this._addMetaInfo(signal);
      s.dirty = true;
    },
    on_resize_signal_list(new_size){
      let self = this;
       var signal_list = document.getElementById("signallist");
       var signal_list_table_container = document.getElementById("table-scroll");
       if ((signal_list == null) || (signal_list_table_container == null))
          return;
       var signal_list_tab = signal_list.parentElement.parentElement;

       // Resize the tab-card first
       signal_list_tab.style.height = new_size + "px";

       // reduce table-scroll size to fill tab-card, and additional 10px padding.

       var offset = signal_list_table_container.offsetTop - signal_list.offsetTop;
       if (offset == "NaN")
       return;

       //console.log("OFFSET IS ",offset);
       //var offs = parseInt(document.getElementById("downloadbutton").offsetHeight);
       signal_list_table_container.style.height = new_size - offset - 40 + "px";
    }
	},
	watch: {
		filter_text(newVal){
			//console.log("SignalList.vue::watch filter_text " + this.filter_text, this.signals.length);
			var fa = this.filter_text.split(" ");
			var len = this.signals.length;
			for (var i = 0; i < len; i++)
			{
				var name = this.signals[i].name;
                if (name !== undefined)
                {
			        this.signals[i].filter  = (this.filter_text.length < 1) ||
				    											 this.match_filter(fa,name);
                }
			}//for
		}
	},
	created() {
		var self = this;
    /* Update the .jsondiff-data */
		bus.$on('new-eval-context-avaliable', self.on_bus_new_eval_context_available);

		bus.$on('resize-signal-list'    , self.on_resize_signal_list); // i.e GUI resize

    // move this to SignalEditor and EvalContext ....
		bus.$on('get_signal_data'       , self.on_bus_get_signal_data);
    bus.$on('edited-signal-updated' , self.on_bus_edited_signal_updated);
    bus.$on('new-signal-created'    , self.on_bus_new_signal_created);
    // end remove



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
    padding: 8px;

}

#siglist_table tr:nth-child(even){background-color: #f2f2f2;}

#siglist_table tr:hover {background-color: #ddd;}

#siglist_table th {
    padding-top: 12px;
    padding-bottom: 12px;
    text-align: left;
    background-color: #4CAF50;
    color: white;
}
</style>
<style src="../assets/main.css"></style>

});
