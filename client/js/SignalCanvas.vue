
// SignalEditor.vue
<template>
  <div  v-bind:style="{background:validSignal?'white':'lightgray',width:'100%'}" :id=elementid>
      <b-button @click="onRemove" variant="danger" size="sm":disabled="false"> X </b-button>
      <span style="color:#808080"
           draggable="true"
         @dragstart="onStartDrag($event, jsondiff.newName)"
         >{{jsondiff.newName}}   </span>
          <canvas draggable=false :id=signal_canvas heigth="300px" style=" display : block;"
                @mousemove="onMouseMove"
                @mousedown="onMouseDown"
                @mouseup="onMouseUp"
                @mouseleave="onMouseLeave"
                @dblclick="on_reset_zoom"
                @dragenter="onDragEnter"
                @dragleave="onDragLeave"
                @drop="onDrop"
                @dragover="onDragOver"
                @onkeydown="onModifierDown"
                @click.alt.exact = "onModifierDown"
                @dragstart="handleDragStartfunction"

          >
          Your browser does not support the HTML5 canvas tag.</canvas>


</div>

</template>

<script>


import bus from "./EventBus.vue"
import * as EvalContext from './EvalContext.js';
import * as Util from './Util.js';
import {SignalCanvasAxis} from './signalcanvas.js';
 
export default {
    name: 'signalcanvas',
    components: {

    },
    props:{
      elementid:{
         default: "no_element_name"
      },
      autoload:{
        default: "no_signal_to_autoload"
      },
      height:{
         default: "50"
      },
      width:{
         default: "10"
      },
      snap_x:{
         default: 0
      },
      snap_y:{
         default: 0
      }
    },
    data() {
        return {
          jsondiff:{newName: 'Example_Signal',
                     xAxis: [10, 20, 30, 40, 50],
                     values: [0, 0.5, 14, 39, 150]
                   },
          inject:['zoom_xmin','zoom_xmax'],
          validSignal:false
        } // data:return
    }, // data
    methods:{
      onStartDrag(e,signalName) {
        //console.log("SignalCanvas.vue::DRAGGING ",signalName)
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/html', signalName);
      },
      onRemove:function(e){
        bus.$emit('signaleditor-removed', this.elementid);
      },
      handleDragStartfunction:function(e) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/html', this.jsondiff.newName);
      },
      onDragOver:function(e){
        //console.log("SignalCanvas::onDragOver")
         e.preventDefault();
         if (e.stopPropagation) {
           e.stopPropagation(); // Stops some browsers from redirecting.
         }
         //e.dataTransfer.dropEffect = 'copy';
      },
      onDragEnter:function(e){
        e.preventDefault();
        //console.log("SignalCanvas::onDragEnter")
      },
      onDragLeave:function(e){
        //console.log("SignalCanvas::onDragLeave")
        e.preventDefault();
      },
      loadSignal(signame){
        //console.log("onDrop:Dropped signal is [" +  signame.trim() + "]");

        var sig = EvalContext.getInstance().getSignal(signame.trim());
        //console.log("SignalCanvas:loadSignal::Checking signal " + signame + " for existance ", sig != null, EvalContext.getInstance().magic_nr);

        if (sig != undefined){
          //console.log("Received " + JSON.stringify(sig));


         this.jsondiff = sig
         this.ax.x = this.jsondiff.xAxis; //connect editor to signal data
         this.ax.y = this.jsondiff.values;
         this.ax.name = sig.name;

         bus.$emit('signalcanvas-reset-zoom');
        this.validSignal = true;
       }//non-null-signal
       else{
         console.log("Signal " + signame + " cannot be found")
        this.validSignal = false;
       }
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
       this.loadSignal(signame);

        return false;
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
     /*long_signal_list_updated: function(newList){
       	this.longNameSignalMap = newList;
     },*/
     on_bus_ga_evaluated(exprString){
       //console.log("Got new evaluation ",exprString);
       this.ax.ga.current_evaluation = JSON.parse(exprString);
       this.ax.clear();
       //console.log("Got new evaluation ",this.ax.ga.current_evaluation );

       this.ax.draw();
     },
     on_bus_window_resize:function(e) {
       this.ax.resize_to_parent_width();
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
    onMouseDown: function(e){
       //console.log("on onMouseDown ", e.clientX, e.clientY);
       this.ax.onMouseDown(e);
    },//onMouseDown
    onMouseUp:function(e){
      //console.log("on onMouseUp",e.clientX,e.clientY);
      if((this.ax.draginfo.active_drag == true) ){
        bus.$emit('edited-signal-updated', {signal: this.current_signal});

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
      //console.log("ELEMENT ", this.elementid)
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
     }
     /*editors:{
       handler : function(val){
         var len = this.editors.length;
         for(var i = 0; i < len; i++){
            this.editors[i].setcontext();
            this.editors[i].draw();
         }
       },
      deep:true
    } //editors watch*/
   }, // watch
    computed: {
        current_signal:function(){
             return  this.jsondiff;
        },//current_signal
        signal_canvas:function(){
          return "canvas_" + this.elementid;
        },
    }, // computed
    created(){

    },
    mounted(){
      // Since the SignalCanvas can be used several times on the same
      // canvas element, we attach it like this.
       //this.longNameSignalMap = {};
       //console.log("SignalCanvas.vue mounted for ", this.elementid)
       this.ax = new SignalCanvasAxis("canvas_" + this.elementid  );
       this.ax.yticks.autoticks = 3;
       this.ax.height = this.height;


       this.ax.setcontext()

       bus.$on('window-resize', this.on_bus_window_resize);

       bus.$on('ga-evaluated', this.on_bus_ga_evaluated);
       bus.$on('signalcanvas-zoomed', this.on_bus_signalcanvas_zoomed);
       bus.$on('signalcanvas-reset-zoom', this.on_bus_reset_zoom);
       bus.$on('signalcanvas-panned', this.on_bus_signalcanvas_panned);
       bus.$on('signalcanvas-mouse-moved', this.on_bus_signalcanvas_mouse_moved);

       if(this.autoload != undefined){
         this.loadSignal(this.autoload);
       }

       bus.$emit('re-evaluation-request');
       bus.$emit('signalcanvas-reset-zoom');

    }

} // export default



</script>

<style>

</style>
