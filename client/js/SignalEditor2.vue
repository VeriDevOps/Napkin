
// SignalEditor.vue
<template>
  <div  style="background:white" id="main-signaleditor" @mouseleave=onMouseLeave
  @dragenter="onDragEnter"
  @dragleave="onDragLeave"
  @drop="onDrop"
  @dragover="onDragOver"

  >
    <b-container style="background:white;width:100%;min-width:100%;">
      <b-row>
        <b-form-group

            prepend="Signal:"
            id="fieldset1"
            description="Drag a sigal from the signal list or enter a name to create a new signal.
            Shift+Click on horizontal line to add a point. Alt+Click on point to remove it.
            Shift+Mouse down+ Move to pan. Select area to zoom. Double click to reset zoom"

            invalid-feedback="Signal not found. Press create button to create it."
            valid-feedback="Signal found and being edited."
            :state=signalNameState
        >
        <b-form-input  v-model.trim="sigselection.signalname"
                     @dragenter.native="onDragEnter"
                     @dragleave.native="onDragLeave"
                     @drop.native="onDrop"
                     @dragover.native="onDragOver"
                     @onkeydown.native="onModifierDown"
                     @click.alt.exact = "onModifierDown"
                     type="text"
                     :state=signalNameState
                     placeholder='Enter a new signal name, or modify an existing one by clicking "Fetch Signal" button'></b-form-input>
        </b-form-group>
    </b-row>

    <b-row id="mainsignaleditor">
  <div  style="background:white;width:100%" id="dummy2fixSize">

    <canvas id="editorcanvas"  style=" display : block; "
          @mousemove=onMouseMove
          @mousedown=onMouseDown
          @mouseup=onMouseUp
          @mouseleave=onMouseLeave
          @dblclick=on_reset_zoom
          @dragenter="onDragEnter"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @dragover="onDragOver"
          @onkeydown="onModifierDown"
          @click.alt.exact = "onModifierDown"
    >
    Your browser does not support the HTML5 canvas tag.
    </canvas>
  </div>
  </b-row>

    <b-row style=" padding-top: 10px;">
      <b-col md=4>
         <b-button size="sm" @click=onClearTemplate variant="warning"> Template Signal  </b-button>

        <b-button size="sm" @click=on_create :variant="sigselection.button_variant" :disabled="signalNameState"> Create New Signal   </b-button>
        </b-col>
        <b-col md=2>
          <b-button size="sm" @click=on_zoom variant="success" :disabled="false"> Zoom  X  </b-button>

        <b-button size="sm" @click=on_zoom_y variant="success" :disabled="false"> Zoom  Y  </b-button>
      </b-col>
      <b-col md=6 fluid>
      <b-button size="sm" @click=on_add_plot variant="success" :disabled="false"> Add mini editor   </b-button>
      <span>
      H: <input v-model="editorheight"
                   type="text"
                   size="3"
                   placeholder="Editor height"/>
      </span>
      <span>
        SnapX:
      <input v-model="snap_x"
                                type="text"
                                size="1"
                                placeholder="0"/>
      </span>
       <span> SnapY:
      <input v-model="snap_y"
                                type="text"
                                size="1"
                                placeholder="1"/>
      </span>
    </b-col>
    </b-row>


<b-form-select   v-model="generatorType"
                 :options="['No Generator','Generate Signal','Generate Pulse Train']"
                 v-on:input="selectPulseOrSignal"

 />
<div ref="signalgenerator" style="display:none;">
<b-row>  <!-- SIGNAL Generator -->


<div ref="generator_timing">
      Start Time (s):
      <b-form-input
            v-model = "generator_timing.startTime"
            :state="validFloat(generator_timing.startTime)"
         />

         (Approx.) End Time (s):
         <b-form-input
               v-model = "generator_timing.endTime"
               :state="validFloat(generator_timing.endTime)"
            />

    Emission cyclicity (s):
    <b-form-input
          v-model = "generator_timing.cycle"
          :state="validFloat(generator_timing.cycle)"
       />

       Emission cyclicity jitter (s):
       <b-form-input
             v-model = "generator_timing.cycle_jitter"
             :state="validFloat(generator_timing.cycle_jitter)"
          />
  Approx. nr of samples: {{nrSamples}}
</div> <!-- end generator_timing part -->
<div style="width:10px"/>
<div ref="generator_pulse" >
      Average Pulse Length (s):
      <b-form-input
            v-model = "generator_pulse.length"
            :state="validFloat(generator_pulse.length)"
         />

      Pulse Length Jitter (s):
         <b-form-input
         v-model = "generator_pulse.length_jitter"
         :state="validFloat(generator_pulse.length_jitter)"
            />

    Low value:
    <b-form-input
          v-model = "generator_pulse.low"
          :state="validFloat(generator_pulse.low)"
       />

       High Value:
          <b-form-input
                v-model = "generator_pulse.high"
                :state="validFloat(generator_pulse.high)"
             />


</div> <!-- end generator_pulse part -->

<div ref="generator_values" style="display:none;">
  <b-table  :sort-by.sync="sortBy" style="width:400px;" outlined small striped hover disabled
            :items="valProbs"
            :fields="valProbs_fields"
             caption-top
             >
      <template slot="table-caption">Percent Sum: {{cumProbs}}%</template>
       <template v-slot:cell(value)="data">
             <b-form-input
                   placeholder="e.g 123"
                   style="width:100%;background:inherit;"
                   v-model="data.item.value"
                   :state="validFloat(data.item.value)"
                   @focus="onFocus('value')"
             />

      </template>
       <template v-slot:cell(probability)="data">
               <b-form-input
                   placeholder="0"
                   style="width:100%;background:inherit;"
                   v-model="data.item.probability"
                   :state="validFloat(data.item.probability) && cumProbs==100"
                   @focus="onFocus('probability')"
              />
      </template>
      <template v-slot:cell(probability2)="data">
             <div  v-bind:style="{ width: data.item.probability + 'px', background: 'lightblue' }" >&nbsp;
            </div>
      </template>
  </b-table>
  <b-button   variant="success"  v-on:click="valProbs.push({value:0,probability:0});">  Add Probable Value</b-button>

  <div> Value jitter:
      <b-form-input
            v-model="value_jitter"
            :state="validFloat(value_jitter)"
         />
  </div>

</div> <!-- end generator_values part-->


</b-row>
<b-button  style="display:block" variant="success"  v-on:click="onLearnProbabilities()">  Learn From Current Signal</b-button>
<table style="width:250px"><tr>
<td><input
          type="checkbox"
            style=" -moz-transform: scale(2);"
          v-model="forceOverWrite"
        /> &nbsp Force Overwrite
</td><td><b-button  style="display:block"
         :variant="forceOverWrite?'danger':'warning'"
         :disabled="cumProbs!=100"
         v-on:click="onGenerate()">  Generate</b-button></td>
</tr></table>


</div> <!-- end generator part -->

<hr>

    <b-row   v-for = "editor in editors" :key="editor.id">
         <signalcanvas style="width:100%;resize:inherit;" :snap_x = "snap_x" :snap_y="snap_y" :elementid="editor.id" :autoload="editor.autoload" :height="editorheight" > </signalcanvas>
   </b-row>


  </b-container>

</div>
</template>
<script>
//import bFormInput from 'bootstrap-vue/es/components/form-input/form-input';
//import bFormGroup from 'bootstrap-vue/es/components/form-group/form-group';
//import bButton from 'bootstrap-vue/es/components/button/button';
//import bTable from 'bootstrap-vue/es/components/table/table'
//import bFormSelect from 'bootstrap-vue/es/components/form-select/form-select'
import bus from './EventBus.vue';
import * as EvalContext from './EvalContext.js';
import * as Util from './Util.js';
import {SignalCanvasAxis} from './signalcanvas.js';
import signalcanvas from './SignalCanvas.vue';

export default {

    name: 'signaleditor2',
    components: {
      signalcanvas

    },
    data() {
        return {
          /// SIGNAL GENERATOR
          valProbs:[
            {value:0, probability:5},
            {value:10,probability:30},
            {value:20,probability:20},
            {value:30,probability:30},
            {value:90,probability:10},
            {value:190,probability:5}
          ],

          sortBy:"",
          valProbs_fields:[
            {
              label:"Possible Values",
               key: 'value',
               sortable:true
            },

            {
              label:'Sample "Probability"',
               key: 'probability',
               sortable:true
            },
            {
              label:"Graph view of ",
               key: 'probability2'
            },

          ],
          value_jitter: 0,
          generator_timing:{
            startTime:0,
            endTime:200,
            cycle:10,
            cycle_jitter:3
          },
          generator_pulse:{
            length:10,
            length_jitter:5,
            low:0,
            high:1,
            skew:0
          },
          forceOverWrite:false,
          generatorType:'No Generator',
          pauseSorting:true,

          // /SIGNAL GENERATOR
          sigselection:{
                      button_variant:"success",
                      button_enabled:true,
                      signalname:"Example Signal",   // Make it same as above
                      validSignal:false,
                      signamestate:null,
                      loadedSignalName:"No Signal Loaded"
                    },
          editors : [],
          editorsrl : 1,
          editorheight:150,
          width : 1000, // This should be set to the width of "this" component
          snap_x:0,
          snap_y:1,
          autoLoadSignalName:"no auto load signal"
        } // data:return
    }, // data
    methods:{
      onFocus(currentColumm){
        if(this.sortBy == currentColumm)
        alert('Do not edit values in a live sorted column. Please click on another column header first.')
      },
      onGenerate(){

        if(this.signalNameState == true && this.forceOverWrite == false){
          if (confirm("Overwrite values of currently edited signal?") == false)
          return;
        }
        switch (this.generatorType){
          case 'No Generator':
          break;

          case 'Generate Signal':
              this.generateSignal();
          break;

          case 'Generate Pulse Train':
          this.generatePulseTrain();
          break;
       }

      },

      generatePulseTrain(){

          let xAxis = [this.generator_timing.startTime];
          let values = [this.generator_pulse.low];
          let t = this.generator_timing.startTime;

           while (t < this.generator_timing.endTime){

            t = t + Math.random() * this.generator_timing.cycle_jitter ;
            t = Math.max(this.generator_timing.startTime + 0.1,t);

            xAxis.push(t)
            values.push(this.generator_pulse.high);//high left

            let pl = this.generator_pulse.length + Math.random() * 2 * this.generator_pulse.length_jitter;
            t = t + Math.max(0,pl);

            xAxis.push(t)
            values.push(this.generator_pulse.low);//low right

            t = t + this.generator_timing.cycle;
          }

          //console.log("Generating ", JSON.stringify({xAxis:xAxis,values:values}))
          // // DEBUG:
          let R = [];
          var r = [];
          for(let i = 0; i < xAxis.length;i++){
            if(values[i] == 1){
              r = [xAxis[i]];
            }
            else {
              r.push(xAxis[i]);
              R.push(r);
            }
          }
          console.log("def intervals A = ", JSON.stringify(R));

          // end debug
          this.applyGeneratedSignal(xAxis,values); // remove when genarator is own component

          return {xAxis:xAxis,values:values}
      },
      generateSignal(){
         let xAxis = [];
        let values = [];
        let t = this.generator_timing.startTime;
        // Construct a vector to draw values from.
        let drawVector = [];
        this.valProbs.forEach(v => {
          for(let i = 0 ; i < parseInt(v.probability); i++) drawVector.push(parseFloat(v.value));
        })

        while (t < parseFloat(this.generator_timing.endTime)){
          let step = Math.random() * parseFloat(this.generator_timing.cycle_jitter);
          t = t + step;

          let v = drawVector[parseInt(Math.random() * drawVector.length)];
          // add +/- jitter (error / distortion) to the signal values
           v +=  (Math.random()* 2 *   parseFloat(this.value_jitter)) -  parseFloat(this.value_jitter);
           if(v !== values[values.length-1]){
            xAxis.push(t);  // If the values are the same we do not need a point
            values.push(v);  // althoug we need to respect the statistics....
          }

         t = t + parseFloat(this.generator_timing.cycle);
        }
        //console.log("Generating ", JSON.stringify({xAxis:xAxis,values:values}))

        this.applyGeneratedSignal(xAxis,values); // remove when genarator is own component

        return {xAxis:xAxis,values:values}
      },
      applyGeneratedSignal(xAxis,values){

          this.ax.x.splice(0); // clear vector without reassigning "pointer ref"
          this.ax.y.splice(0);
          xAxis.forEach(x => {this.ax.x.push(x)});
          values.forEach(y => {this.ax.y.push(y)});
          //this.sigselection.signalname = "Example Signal" + parseInt("" + (Math.random()*100) );


        //  this.ax.name = "Example Signal"

          bus.$emit('edited-signal-updated', this.sigselection.signalname)
      },
      onLearnProbabilities(){
        if(this.generatorType === 'Generate Signal')
          this.learnSignalProbabilities();
        else if (this.generatorType ==='Generate Pulse Train')
          this.learnPulseProbabilities();
      },
      learnSignalProbabilities(){
        let xAxis = this.ax.x;
        let values = this.ax.y;
        if (xAxis.length ==0 ) return;

        let nrSamples = 0;
        let vals = {};
        values.forEach(v =>{
          nrSamples++;
          if(v in vals){
            vals[v]++;
          }
          else{
            vals[v] = 1;
          }

        });
        this.valProbs.splice(0); // clear vector.
        for (const [key, value] of Object.entries(vals)) {
            this.valProbs.push({value:key, probability:parseInt(100 * value / nrSamples)});
        }

        // Learn timing information. (separate from above if we want own function)

        // Learning sample distance
        let dt = [];
        let t1 = xAxis[0];
        for(let i = 1; i < xAxis.length;i++){
          dt.push(xAxis[i] - t1);
          t1 = xAxis[i] ;
        }

        this.generator_timing.startTime = xAxis[0];
        this.generator_timing.endTime   = xAxis[xAxis.length - 1];
        this.generator_timing.cycle     = this.mean(dt);
        this.generator_timing.cycle_jitter = this.jitter(dt, this.generator_timing.cycle);

      },

      mean(A){
        if (A.length == 0) return 0;
        let m = 0 ;
        A.forEach(a =>{m += a;});
        return m / A.length;
      },
       jitter(A,mean){
        if(A.length == 0 ) return 0;
        let cum_mean_dist = 0;
        A.forEach(a =>{
          cum_mean_dist += Math.abs(a - mean);
        })
        return cum_mean_dist / A.length;
      },

      learnPulseProbabilities(){
        /****

        * Analyzes the x,y axes to see:
        * average pulse width
        * jitter (i.e how much the pulses deviate from a pulse lenght mean)
        */
        let xAxis = this.ax.x;
        let values = this.ax.y;
        if (xAxis.length ==0 ) return;

        // Average pulse start = each high value.

        let pulse_intervals = []; // (pulse) Intervals  [[start,end],...,[startn,endn]]
        let cycle_intervals = [];
        // Extract Intervals between(rising_edge, falling_edge)
        // TODO SAGA standard rising / falling edge etc should be used.
        let current_start = undefined;
        let cycle_start = 0;

        for(let i = 0; i < xAxis.length; i++){
          if(values[i] > values[i - 1] && current_start == undefined){
            // This is the rising edge
            current_start = xAxis[i];
            cycle_intervals.push([cycle_start,current_start]);
          } else if((current_start != undefined) && (values[i] < values[i -1])){
            // falling edge
            pulse_intervals.push([current_start, xAxis[i]]);
            current_start = undefined;
            cycle_start = xAxis[i];
          }
        }

        // Convert from intervals to lengths (so we can switch to standard impl later, see TODO above.)
        let pulse_lengths = pulse_intervals.map(r => r[1] - r[0]);
        let p_mean = this.mean(pulse_lengths);
        this.generator_pulse.length = p_mean;
        this.generator_pulse.length_jitter = this.jitter(pulse_lengths, p_mean);
        this.generator_pulse.low = Math.min(...values);;
        this.generator_pulse.high = Math.max(...values);;


        let cycle_lengths = cycle_intervals.map(r => r[1] - r[0]);
        let c_mean = this.mean(cycle_lengths);
        this.generator_timing.cycle        = c_mean;
        this.generator_timing.cycle_jitter = this.jitter(cycle_lengths, c_mean);

        this.generator_timing.startTime = xAxis[0];
        this.generator_timing.endTime   = xAxis[xAxis.length - 1];

      },
      selectPulseOrSignal(){
      let sig = this.$refs.generator_values.style
      let pulse = this.$refs.generator_pulse.style
      switch (this.generatorType){
        case 'No Generator':
         this.$refs.signalgenerator.style.display = "none"
         break;
       case 'Generate Signal':
        this.$refs.signalgenerator.style.display = "block"
        sig.display = "block";
        pulse.display = "none";
      break;
      case 'Generate Pulse Train':
       this.$refs.signalgenerator.style.display = "block"
        sig.display = "none";
        pulse.display = "block";
      }
    },
      validFloat(f){
        return (!isNaN(parseFloat(f)));
      },
    handleResize(e) {

          // "our" instance of the signaleditorcanvas is a bit different since it
          // is not backed up by a SignalCanvas.vue container.
          if (this.ax != undefined){
            this.ax.resize_to_parent_width();
            this.ax.draw();
          }
    },

      // These are methods that are qiute general and should possibly
      // exist somewhere else
      onClearTemplate:function(){

        this.sigselection.signalname = "Example Signal" + parseInt("" + (Math.random()*100) );

        this.ax.x = [0,62,130,150,260]
        this.ax.y = [0,17,3,2,0]
        this.ax.name = "Example Signal"
        this.ax.resetZoom();
        bus.$emit('signalcanvas-reset-zoom');
      },
      onMouseLeave:function(e){
        //console.log("Mouse left signal editor")
        return false;
      },
      onDragOver:function(e){
         e.preventDefault();
         //e.dataTransfer.dropEffect = 'copy';
      },
      onDragEnter:function(e){
        e.preventDefault();
        this.signamestate = true;
      },
      onDragLeave:function(e){
        e.preventDefault();
        this.signamestate = false;
      },
      onDrop:function(e){
        if (e.stopPropagation) {
          e.stopPropagation(); // Stops some browsers from redirecting.
        }
        e.preventDefault();
        let signame = e.dataTransfer.getData('text/html');
        if(signame === "") // it probably comes from a text field
        signame = e.dataTransfer.getData('text')
        //console.log("SignalCanvas::onDrop incoming::data ", signame);
        signame = signame.substr(signame.indexOf(">")+1);

        this.sigselection.signalname = signame;
        // the signal will automatically be loaded in the field validator.
        return false;
      },
      on_add_plot(){
        this.editorsrl += 1;
        //console.log("SignalEditor2.vue::Creating editor editorcanvas" + this.editorsrl, this.editorsrl)
        var neweditor = "editorcanvas" + this.editorsrl;
        this.editors.push({id:neweditor} );
      },
      on_zoom:function(){
        var range = this.ax.zoom.xlim[1] - this.ax.zoom.xlim[0];
        var delta = range * 0.05; // 5 % zoom both ways.
         this.ax.zoom.xlim[1] -= delta;
         this.ax.zoom.xlim[0] += delta;
         bus.$emit('signalcanvas-zoomed', this.ax.zoom);
      },
      on_zoom_y:function(){
        var range = this.ax.zoom.ylim[1] - this.ax.zoom.ylim[0];
        var delta = range * 0.05; // 5 % zoom both ways.
         this.ax.zoom.ylim[1] -= delta;
         this.ax.zoom.ylim[0] += delta;
         this.ax.clear();
         this.ax.draw();
      },
      on_reset_zoom:function(){
          bus.$emit('signalcanvas-reset-zoom', this.zoom);
      },
      onModifierDown:function(e){
        //console.log("Modifier key pressed down");
        this.ax.onModifierDown(e);
      },
      current_signal_is_an_event:function(){
        var res = true;
        if(this.current_signal.hasOwnProperty("values"))
          if(this.current_signal.values != null)
            if(this.current_signal.values.length > 1)
               res = false;
        return res;
      },
     on_create: function(e){
          // Rename current signal
          // The jsondiff object needs to be copied

          //console.log("Creating signal " + this.sigselection.signalname)
          //REQ from EvalContext is [newName,values,pretty_print,xAxis]
          let newSignal = {name:this.sigselection.signalname,
                           newName:this.sigselection.signalname,
                           pretty_print:this.sigselection.signalname,
                           xAxis:this.ax.x.slice(0),
                           values:this.ax.y.slice(0),
                           logInfo:{name:"Manually Created"}
                         };
          // Check that it really IS a NEW signal ( in other case it is already up to date)
          let s = EvalContext.getInstance().getSignal(this.sigselection.signalname);
          if (s == undefined){
            // createNewSignal adds some internal info. Send SignalEntry to e.g SignalList for inclusion.
            let new_signal_file = !EvalContext.getInstance().isValid();
            bus.$emit('new-signal-created', EvalContext.getInstance().createNewSignal(newSignal) );
            if( new_signal_file)
            {
              console.log("The evaluation context was invalid, it should not happen")
              bus.$emit('new-eval-context-avaliable', EvalContext.getInstance().getExposedInternalSignalStructure());
            }
              let c = this.sigselection.signalname;  // Hack to make sure the state of the input field is changed....
              this.sigselection.signalname = "saving....";
              this.$nextTick(function() {
                  this.sigselection.signalname = c;
              });
          }
          else{
            console.error("SignalEditor2::on_create WARNING!!! The signal already exist, save ignored for ", this.sigselection.signalname);
          }

     },
     on_bus_ga_evaluated(exprString){
       //console.log("SignalEditor2.vue::on_bus_ga_evaluated() Got new evaluation ",exprString);
       this.ax.ga.current_evaluation = JSON.parse(exprString);
       this.ax.clear();
       this.ax.draw();
     },
     on_bus_signalcanvas_zoomed:function(newZoom){
       //console.log("on_bus_signalcanvas_zoomed ", JSON.stringify(newZoom))
      this.on_bus_signalcanvas_panned(newZoom); // pan and zoom are the same
     },
     on_bus_signalcanvas_panned:function(newZoom){
       //console.log("on_bus_signalcanvas_panned", JSON.stringify(newZoom))

       this.ax.zoom.xlim = [newZoom.xlim[0],newZoom.xlim[1]];
       this.ax.updateAutoTicks();
       this.ax.clear();
       this.ax.draw();
     },
     on_bus_reset_zoom(){
       this.ax.resetZoom();
     },
      on_bus_signalcanvas_mouse_moved:function(e,elementid){
        // Keep mouse synched across all editor canvases.
        this.ax.onOtherCanvasMouseMoved(e,elementid);
      },
     on_bus_signaleditor_removed:function(editorname){
       var id = -1 ;
       var len = this.editors.length;
       for (var i = 0;i < len; i++){
          //console.log("  editor " + this.editors[i].id);
           if(this.editors[i].id == editorname){
             id = i;
             break;
           }
         }//for
         if(id > -1){
  	        this.editors.splice(id,1);
          }
     },  //editor removed
     on_bus_new_file_loaded:function(){

       //console.log("SignalEditor2::on_bus_new_file_loaded");
       this.editors = [];
       // this.editorsrl = 1; // Make sure ALL editors become unique so DOM element is not reused
       this.onClearTemplate();
     },
     _has_signal(signalName){
       for (let ed of this.editors){
         if (ed.autoload === signalName)
         return true;
       }
       return false;
     },
    on_bus_signal_editor_edit_multiple:function(usedSignals){
       let self = this;
       //console.log("SignalEditor2::'signal-editor-edit-multiple-signals'",usedSignals)
        for (let s of usedSignals){
          if (this._has_signal(s)){
            //console.log("SignalEditor2::'signal-editor-edit-multiple-signals signal ",s,"already under edit");
            continue;
          }
          self.editorsrl += 1;  //NOTE!, This code should be synched with on_add_plot
          var neweditor = "editorcanvas" + self.editorsrl;
          //console.log("Adding ",s)
          self.editors.push({id:neweditor,autoload:s} );
        }//for

      }, //on_edit_multiple
    onMouseDown: function(e){
       //console.log("on onMouseDown ", e.clientX, e.clientY);
       this.ax.onMouseDown(e);
    },//onMouseDown
    onMouseUp:function(e){
      //console.log("on onMouseUp",e.clientX,e.clientY);
      if((this.ax.draginfo.active_drag == true) &&
          this.signalNameState ){
        bus.$emit('edited-signal-updated', this.sigselection.signalname);
      }
      this.ax.onMouseUp(e);
    },//onMouseUp
     onMouseLeave:function(e){
        //console.log("on onMouseLeave ",e.clientX,e.clientY);
        this.ax.onMouseLeave(e);
    },//onMouseLeave
    onMouseMove:function(e){
      //console.log("on mouse move");
      this.ax.onMouseMove(e);
    }//onMouseMove

  },//methods
   watch:{
      generator_pulse:{
       handler:function(){
         Object.keys(this.generator_pulse).forEach(k => {
           if (this.generator_pulse[k].length>0)
            this.generator_pulse[k] = parseFloat(this.generator_pulse[k])});
       },
       deep:true
     },
     generator_timing:{
        handler:function(){
            Object.keys(this.generator_timing).forEach(k => {
              if (this.generator_timing[k].length>0)
              this.generator_timing[k] = parseFloat(this.generator_timing[k])});
        },
        deep:true
      },

       snap_x:{
         handler:function(val){
           this.ax.axis.snap_x = this.snap_x;
         }
       },
       snap_y:{
         handler:function(val){
           this.ax.axis.snap_y = this.snap_y;
         }
       },
     editors:{
       handler : function(val){


       },
      deep:true
    } //editors watch*/
   }, // watch
    computed: {
      nrSamples(){
        let t = this.generator_timing.endTime - this.generator_timing.startTime;
        return parseInt(t/this.generator_timing.cycle);
      },
      cumProbs(){
        let s = 0;

        this.valProbs.forEach(p =>{
          s += parseFloat(p.probability);
        });
        return s;
      },
        current_signal:function(){

          return  this.jsondiff;

        },//current_signal
        signalNameState () {
             //console.log("SignalEditor2.vue::computed:signalNameState");
             var sig = EvalContext.getInstance().getSignal(this.sigselection.signalname.trim())
             //console.log("Checking signal " + this.sigselection.signalname + " for existance ", sig != null);

             if (sig != undefined){
              this.ax.x = sig.xAxis; //connect editor to signal data
              this.ax.y = sig.values;
              if (this.sigselection.loadedSignalName != this.sigselection.signalname){
                bus.$emit('signalcanvas-reset-zoom');
                this.sigselection.loadedSignalName = this.sigselection.signalname;
              }
              this.ax.clear();
              this.ax.draw();

            }else{
             // We are in practice creating a new signal.
             if(this.ax){
               this.ax.x = this.ax.x.slice(0) // make a copy!
               this.ax.y = this.ax.y.slice(0)
              }
            }

             return  sig != undefined;
          }
    }, // computed
    created(){

    },
    updated: function () {
      this.$nextTick(function () {
                        bus.$emit("window-resize");
                     });
    },
    mounted(){
       window.addEventListener('resize', this.handleResize);

      // Since the SignalCanvas can be used several times on the same
      // canvas element, we attach it like this.

       this.ax = new SignalCanvasAxis("editorcanvas");
       //this.ax.xpos = 0; // DFM TODO: this is an ugly hack. WHY is main singnal editor offsetted with approx 14 px ?
       this.ax.setcontext()
       this.ax.resetZoom();

       bus.$on('ga-evaluated', this.on_bus_ga_evaluated);
       bus.$on('signalcanvas-zoomed', this.on_bus_signalcanvas_zoomed);
       bus.$on('signalcanvas-reset-zoom', this.on_bus_reset_zoom);
       bus.$on('signalcanvas-panned', this.on_bus_signalcanvas_panned);
       bus.$on('signaleditor-removed', this.on_bus_signaleditor_removed);
       bus.$on('signalcanvas-mouse-moved', this.on_bus_signalcanvas_mouse_moved);
       bus.$on('new-eval-context-avaliable', this.on_bus_new_file_loaded);

       bus.$on('signal-editor-edit-multiple-signals', this.on_bus_signal_editor_edit_multiple);

       bus.$on('window-resize',this.handleResize);
//document.getElementById("editorcanvas").style.width = document.getElementById("signaleditor").offsetWidth - 25 + "px";


      setTimeout(this.ax.resetZoom, 3000);

    }

} // export default




</script>

<style>

</style>
