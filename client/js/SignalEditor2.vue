
// SignalEditor.vue
<template>
  <div  style="background:white" id="main-signaleditor" @mouseleave.native=onMouseLeave>
    <b-container fluid style="width:100%;">
      <b-row>
        <b-form-group
            style="width:100%; "
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
      <canvas id="editorcanvas"  style=" display : block"
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
                   placeholder="Editor height"></input>
      </span>
      <span>
        SnapX:
      <input v-model="snap_x"
                                type="text"
                                size="1"
                                placeholder="0"></input>
      </span>
       <span> SnapY:
      <input v-model="snap_y"
                                type="text"
                                size="1"
                                placeholder="1"></input>
      </span>
    </b-col>
    </b-row>
    <hr>

    <b-row   v-for = "editor in editors" :key=editor.id>
         <signalcanvas style="width:100%;resize:inherit;" :snap_x = snap_x :snap_y=snap_y :elementid=editor.id :autoload=editor.autoload :height=editorheight > </signalcanvas>
   </b-row>


  </b-container>

</div>
</template>
<script>
import bFormInput from 'bootstrap-vue/es/components/form-input/form-input';
import bFormGroup from 'bootstrap-vue/es/components/form-group/form-group';
import bButton from 'bootstrap-vue/es/components/button/button';
import bus from './EventBus.vue';
import * as Util from './Util.js';
import {SignalCanvasAxis} from './signalcanvas.js';
import signalcanvas from './SignalCanvas.vue';



export default {

    name: 'signaleditor2',
    components: {
      bFormInput,
      bFormGroup,
      bButton,
      signalcanvas
//      bModal
    },
    data() {
        return {

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
    handleResize(e) {
          // Make sure all sub components resize in response to window resize
          bus.$emit('window-resize');
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

        this.ax.x = [-0.010000000009313226,62.820000000006985,131.48000000001048,150,259.47000000000116]
        this.ax.y = [0,16.666666666666664,-2.7777777777777777,2,0]
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
        let signame = e.dataTransfer.getData('text/html');
        signame = signame.substr(signame.indexOf(">")+1);
        this.sigselection.signalname = signame;
        // the signal will automatically be loaded in the field validator.
        return false;
      },
      resize_siglist:function(new_size){
        /*
        var hs = document.getElementById("signaleditor").offsetHeight
        console.log("Trying to interpret value ",hs)
        var h = parseInt(hs);
        */
      },
      on_add_plot(){
        this.editorsrl += 1;
        //console.log("SignalEditor2.vue::Creating editor editorcanvas" + this.editorsrl, this.editorsrl)
        var neweditor = "editorcanvas" + this.editorsrl;
        this.resize_siglist(this.editorheight+20);
        this.editors.push({id:neweditor,autoload:"SelectorLever"} );
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

          console.log("Creating signal " + this.sigselection.signalname)
          //REQ from EvalContext is [newName,values,pretty_print,xAxis]
          let newSignal = {newName:this.sigselection.signalname,
                           pretty_print:this.sigselection.signalname,
                           xAxis:this.ax.x.slice(0),
                           values:this.ax.y.slice(0)
                         };
          // Check that it really IS a NEW signal ( in other case it is already up to date)
          let s = bus.getEvalContext().getSignal(this.sigselection.signalname);
          if (s == undefined){
            // createNewSignal adds some internal info. Send SignalEntry to e.g SignalList for inclusion.
            let new_signal_file = !bus.getEvalContext().isValid();
            bus.$emit('new-signal-created', bus.getEvalContext().createNewSignal(newSignal) );
            if( new_signal_file)
              bus.$emit('new-eval-context-avaliable', bus.getEvalContext().getExposedInternalSignalStructure());
          }
          else{
            console.log("SignalEditor2::on_create WARNING!!! The signal already exist, save ignored for ", this.sigselection.signalname);
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
        self.resize_siglist(self.editorheight+20);
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
        current_signal:function(){

          return  this.jsondiff;

        },//current_signal
        signalNameState () {

             var sig = bus.getEvalContext().getSignal(this.sigselection.signalname.trim())
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
        // Code that will run only after the
        // entire view has been re-rendered
        var new_height = document.getElementById("main-signaleditor").parentElement.parentElement.offsetHeight
        bus.$emit("resize-signal-list", new_height);
        //console.log("SignalEditor2.vue::updated resisizing the signal list ");

      })
    },
    mounted(){
       window.addEventListener('resize', this.handleResize);

      // Since the SignalCanvas can be used several times on the same
      // canvas element, we attach it like this.

       this.ax = new SignalCanvasAxis("editorcanvas");
       this.ax.xpos = 0; // DFM TODO: this is an ugly hack. WHY is main singnal editor offsetted with approx 14 px ?
       this.ax.setcontext()
       this.ax.resetZoom();

       bus.$on('ga-evaluated', this.on_bus_ga_evaluated);
       bus.$on('signalcanvas-zoomed', this.on_bus_signalcanvas_zoomed);
       bus.$on('signalcanvas-reset-zoom', this.on_bus_reset_zoom);
       bus.$on('signalcanvas-panned', this.on_bus_signalcanvas_panned);
       bus.$on('signaleditor-removed', this.on_bus_signaleditor_removed);
       bus.$on('signalcanvas-mouse-moved', this.on_bus_signalcanvas_mouse_moved);

       bus.$on('jsondiff-loaded', this.on_bus_new_file_loaded);
       bus.$on('new-eval-context-avaliable', this.on_bus_new_file_loaded);

       bus.$on('signal-editor-edit-multiple-signals', this.on_bus_signal_editor_edit_multiple);
//document.getElementById("editorcanvas").style.width = document.getElementById("signaleditor").offsetWidth - 25 + "px";


      setTimeout(this.ax.resetZoom, 3000);

    }

} // export default




</script>

<style>

</style>
