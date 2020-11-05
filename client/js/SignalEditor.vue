
// SignalEditor.vue
<template>
  <div style="background:white" id="signaleditor">
  <table style="width:100%">
    <tr>
         <td>

           <b-form-group
               id="fieldset1"
               description="Drag a sigal from the signal list or enter a name to create a new signal."
               label="Signal Being Edited"
               label-for="input1"
               invalid-feedback="Signal does not exist. Click on CreateSignal button to create it."
               valid-feedback=""
               :state=validSignal
           >
           <b-form-input v-model=jsondiff.newName
                        @dragenter.native="onDragEnter"
                        @dragleave.native="onDragLeave"
                        @drop.native="onDrop"
                        @dragend.native="onDragEnd"
                        @dragover.native="onDragOver"
                        type="text"
                        :state="this.signamestate"
                        placeholder='Enter a new signal name, or modify an existing one by clicking "Fetch Signal" button'></b-form-input>
           </b-form-group>
          </td>
   </tr>
    <tr>
         <td><b>Time</b><b-form-input v-model="jsondiff.xAxis"
                        type="text"
                        placeholder="Enter series of sample time"></b-form-input>
          </td>
   </tr>
   <tr>
      <td><b>Value</b><b-form-input v-model="jsondiff.values"
                    type="text"
                    placeholder="Enter series of sample points"></b-form-input>
      </td>

  </tr>
  <tr>
    <td colspan =2>  &nbsp </td> <!-- Make a small vertical distance to the plot area -->
  </tr>
  <tr> <td colspan="2">
  <!--  <plotarea local=true v-bind:meddelande=plots  ></plotarea> -->
  <div id="preview" style="width:100%" ></div>
  </td>
  </tr>

  <tr>
    <b-button @click=on_fetch :variant=fetchbutton.button_variant > Fetch Loaded Signal   </b-button>
    <b-button @click=on_save  :variant=savebutton.button_variant v-text=savebutton.button_text> </b-button>

  <!-- ---------------------------- MODAL DIALOG FOR OVERWRITING CURRENT SIGNAL ---------------- -->

       <b-modal v-model="show_overwrite_modal"
                ref="myModalRef"
                hide-footer
                title="Warning!"
                header-bg-variant="danger"
                header-text-variant="light">

         <div class="d-block text-center">
           <h3>Overwrite ?</h3>
           <p style='font-family: "Courier New", Courier, monospace'>
              {{jsondiff.newName}}
          </p>
         </div>
         <b-button @click=on_doFetch  variant="outline-success"  > YES</b-button>
         <b-button @click="show_overwrite_modal=false" variant="outline-success"> NO</b-button>

       </b-modal>
    <!--  END MODAL DIALOG FOR OVERWRITING CURRENT SIGNAL  -->
</tr>
</table>

</div>

</template>

<script>
import bus from "./EventBus.vue"
//import Vue from '../nodevue'
import Dygraph from '../assets/dygraph.min.js'; //This could also be pre-installed through npm install --save dygraphs and then  import Dygraph from 'dygraphs';
//import { Button } from 'bootstrap-vue/es/components';
import bFormInput from 'bootstrap-vue/es/components/form-input/form-input';
import bFormGroup from 'bootstrap-vue/es/components/form-group/form-group';

import bButton from 'bootstrap-vue/es/components/button/button';
import bModal from 'bootstrap-vue/es/components/modal/modal';
//Vue.use(Button);
export default {

    name: 'signaleditor',
    components: {
      bFormInput,
      bFormGroup,
      bButton,
      bModal
    },
    data() {
        return {
          jsondiff:{newName: 'Example_Signal',
                     xAxis: [10, 20, 30, 40, 50],
                     values: [0, 0.5, 14, 39, 150],

                   },
          savebutton:{
            button_variant:'disabled',
            button_text : "Add / Update Signal"
          },
          fetchbutton:{
            button_variant:'success',
          },
          signamestate:null,
          validSignal:false,
          show_overwrite_modal:false,
          pending_jsondiff:{} //on_edit_signal event sets this until OK button is pressed.

        } // data:return
    }, // data
    methods:{
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
        let signame = e.dataTransfer.getData('text/html');
        signame = signame.substr(signame.indexOf(">")+1);

        // console.log("onDrop:Dropped signal is [" +  signame + "]");
        bus.$emit('get_signal_data', signame);
        return false;
      },
    showModal () {

    },
    hideModal () {
      this.$refs.myModalRef.hide()
    },
      current_signal_is_an_event:function(){
        var res = true;
        if(this.current_signal.hasOwnProperty("values"))
          if(this.current_signal.values != null)
            if(this.current_signal.values.length > 1)
               res = false;
        return res;
      },
      plot_signal: function(){

         var data;
         if (this.current_signal_is_an_event() == true){
           // we need to create an artificial slope
           var events = this.current_signal.xAxis;

           data = [];
           for(var x of events){
             data.push([x,1])
             data.push([x,0])
           }
         }else{
            data = this.to_dygraph(this.current_signal);
         }

         var g = new Dygraph(document.getElementById("preview"), data, {
           xlabel: "Time",
           stepPlot: true,
           labels: ["Time", "Signal Value = "],
           legend: "always",
           stackedGraph: false,
           strokeWidth: 2,
           drawPoints: true
         });
     },
     /*********************************************************************
      COMPONENT -- PARENT COMMUNICATION PROTOCOL
      JSONDIFF = the normal signal data structure (newName,xAxis,values)
     **********************************************************************
     *   parent                                 signal editor

       CASE I
                                        <---    get_signal_data(NAME)
        request_edit_signal(JSONDIFF)   --->
                                        <---    edited_signal_updated(JSONDIFF)

        CASE II
        request_edit_signal(JSONDIFF)   --->
                                        <---    edited_signal_updated(JSONDIFF)


                                          // NOTE That the parent should check
                                          // if this is an existing signal
                                          // and allow the user to skip saving it
                                          // REUSE the modal dialog above?

                                          //NOTE again, if the requested signal
                                          //     does not exist, the parent should
                                          //     warn about it ???
     **************************************************************************/
     on_save: function(e){
        // Send event on event bus that there is a new / updated signal
      if (this.savebutton.button_variant != "success") return;
      //console.log("Sending current signal for storage." + this.jsondiff)
      bus.$emit('edited_signal_updated', {signal: this.current_signal});
      // NOTE That the parent should check if this is an existing signal handle
      this.savebutton.button_variant = "disabled";
     },
     on_fetch: function(e){
       // As parents for a signal.
        //console.log("Sending request to parent for signal data " + this.jsondiff.newName);
        bus.$emit('get_signal_data', this.jsondiff.newName);
     },
     on_doFetch: function(e){
       // Called from the modal warning after we have received a
       // request from the parent to load another signal.
       this.show_overwrite_modal = false;
       this.jsondiff = this.pending_jsondiff;
       this.pending_jsondiff = {};
     },
     on_bus_request_edit_signal: function(signal){
       //console.log("SignalEditor::on_bus_request_edit_signal " + signal);

       if (signal == null || signal.signal == null){
         // console.log("SignalEditor::on_bus_request_edit_signal signal does not exist.")
         return;
       }
       // If the signal is empty (how do we see that), we ignore.

       // Honestly, as long as we enter the signal name in the DIALOG
       // this will always happen...
       this.jsondiff = signal.signal;
       this.validSignal=true;


     },
     to_dygraph : function(indata){

       var xAxis  = indata.xAxis;
       var values = indata.values;
       var res = [];

       var xlen = xAxis.length;
       var ylen = values.length;

       for (var i = 0; i < xlen; i++){
         if(i < ylen){
           var point = [ xAxis[i], values[i] ]
           res.push(point);
         } //if

       }//for
     return res;
     }//to_dygraph

    },
   watch:{
     jsondiff:{
       handler : function(val){
         this.savebutton.button_variant = 'success';
         this.plot_signal();
      },
      deep:true
     } //jsondiff watch
   }, // watch
    computed: {
        current_signal:function(){
          // The problem is that the value list is translated to string if edited.
          // This function makes sure that we always have access to a signal on
          // the original format.
          var xvals = [];
          var yvals = [];
          if(typeof(this.jsondiff.xAxis) == 'string'){
            xvals = this.jsondiff.xAxis.split(',').map(x => parseFloat(x));
          }
          else{
             xvals = this.jsondiff.xAxis;
           }
          if(typeof(this.jsondiff.values) == 'string'){
            yvals = this.jsondiff.values.split(',').map(x => parseFloat(x));
          }else{
            yvals = this.jsondiff.values;
          }

          return  {newName: this.jsondiff.newName,
                   pretty_print:this.jsondiff.newName,
                     xAxis: xvals,
                     values: yvals
                   };
        }//current_signal
    }, // computed
    mounted(){

      this.plot_signal();

      bus.$on('request_edit_signal', this.on_bus_request_edit_signal);

    }

} // export default


</script>

<style>

</style>
