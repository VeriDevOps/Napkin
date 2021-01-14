import bus from "./EventBus.vue"
import * as EvalContext from './EvalContext.js';
var guard_debug = false
function _getXmax(){
  return EvalContext.getInstance().xmax;
}
function _getXmin(){
  return EvalContext.getInstance().xmin;
}

export class SignalCanvasBase{
//<canvas id="C" width="200" height="500" style="width:300px; height:500px; border:1px solid black"></canvas>
resize(new_width,new_height){
  if (this.canvas == null)
      return;
  this.ctx = this.canvas.getContext("2d");


  var dpr = window.devicePixelRatio || 1
  var bsr = this.ctx.webkitBackingStorePixelRatio ||
            this.ctx.mozBackingStorePixelRatio ||
            this.ctx.msBackingStorePixelRatio ||
            this.ctx.oBackingStorePixelRatio ||
            this.ctx.backingStorePixelRatio || 1;
  var pix_ratio = dpr / bsr;


  var scaled_width  = new_width  * pix_ratio;
  var scaled_height = new_height * pix_ratio;

  this.width  = new_width;
  this.height = new_height;
  this.canvas.width  = scaled_width;
  this.canvas.height = scaled_height;
  this.canvas.style.width  = new_width + "px";
  this.canvas.style.height = new_height + "px";

  this.ctx.setTransform(pix_ratio, 0, 0, pix_ratio, 0, 0);

  this.height -= this.ypos;  // TODO, not sure about this one!
//  console.log("signalcanvas.js::Resized to exactly: ",  this.canvas.width, this.canvas.height,this.canvas.style.width,this.canvas.style.height);

}
resize_to_parent_width(){
  var new_width = this.canvas.parentElement.offsetWidth;
  var new_height = this.height;
  this.resize(new_width, new_height);
}
setcontext(){

  this.canvas = document.getElementById(this.elementid);
  this.ctx = this.canvas.getContext("2d");

  var parent = this.canvas.parentElement;
  var new_width = parent.offsetWidth;
  var new_height = this.height;
  this.resize(new_width, new_height);

}

constructor(elementName){
  // TODO move the position function to here as well.
  this.elementid = elementName;
  this.canvas = {}
  this.xpos = 13;     // x position in canvas      (canvas pixels)
  this.ypos = 0;      // y position in canvas      (canvas pixels)
  this.width  = 1000  //this.canvas.width;  // Allowed total width       (canvas pixels)
  this.height = 200   //this.canvas.height;  // Allowed total height     (canvas pixels)

  this.ga  = {
              current_evaluation: null,
              show      : true,
              guardcolor: "rgba(100,100,100,0.4)",
              passcolor : "rgba(0,100,0,0.8)",
              failcolor : "rgba(100,0,0,0.8)",
              passcolor_int : "rgba(0,100,0,0.4)",
              failcolor_int : "rgba(100,0,0,0.4)",

              guardcolor_highlighted: "rgba(100,100,100,0.8)",
              passcolorh_ighlighted : "rgba(0,100,0,0.8)",
              failcolor_highlighted : "rgba(100,0,0,0.8)"
             }

  // TODO refactor to list of signals instead. this.x --> this.signals[signr].xValues
  this.x = [-0.010000000009313226,62.820000000006985,131.48000000001048,150,259.47000000000116]
  this.y = [0,16.666666666666664,-2.7777777777777777,2,0]
  this.name = "Example Signal"
  //https://www.html5rocks.com/en/tutorials/canvas/hidpi/ TODO! READ And update this file accordingly!
  this.zoom = { // If these are == axis, we have no zoom.
                // exit zoom and pan restores from this.axis.
                xlim : [0,100],
                ylim : [0,50]
               }
  this.outermargin  = {// all outer margins for this axis.
                       left  : 5,    // margin y-label and the edge
                       right : 20,    // margin  xaxis arrow and the edge
                       up    : 10,    // yarrow and the edge
                       down  : 5     // x label and the edge
                      }

  this.xticks  =  { autoticks : 7,
                  ticks     : [], // usef if empty, auto otherwise
                  ticklabels : [],
                  fontsize  : 10,
                  font      : "sans-serif",
                  vmargin   : 2, //px
                  ticksize  : 3,
                  maxwidth  : 20,
                  maxheight : 10,
                  visible   : true,
                    preferred :[0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100,200,500,1000,2000,5000,10000,20000,50000]
                }

  this.yticks = { autoticks : 4,
                  ticks     : [],  // position of ticks in plot coord
                  ticklabels : [], // i.e number string for each tick
                  fontsize   : 10,
                  font       : "sans-serif",
                  vmargin    : 2, //px
                  ticksize   : 3, // tick line length
                  maxwidth : 20, // updateMeasures caches here (note! horiz widht)
                  maxheight:10,
                  visible  : true,
                  preferred :[0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100,200,500,1000,2000,5000,10000,20000,50000]
                }

  this.xlabel = {text      : "Time in seconds",
                 hmargin  : 2,
                 fontsize : 10,
                 font     : "Arial",
                 visible  : true
                }

  this.ylabel = {text      : "Signal Name",
                 vmargin  : 2,
                 fontsize : 10,
                 font     : "Arial",
                 visible  : true
                }

  this.legend = {                //showing the x,y values of mouse pos
                topmargin : 10,
                rightmargin: 10,
                showx    : true,
                showy    : true,
                showname :false,
                fontsize  : 15,
                font      : "sans-serif",
                namecolor :"rgba(100,100,100,0.5)"
                }

  this.axis = { // These are the original limits (non zoomed state).
                xlim     : [0,110], //signal coords
                ylim     : [0,50],
                origosize: 1,
                linewidth: 1,
                color    : "#FF0000",
                snap_x   : 0,
                snap_y   : 1
              }
  this.plot = {// Visualization Properties concerning the plotted signal.
                linewidth : 2,
                pointsize : 10,
                types     : ["Digital","Analog"],
                type      : 0, //ix in types array,
                color     : "#00000F",
                marker    : '*',
                markersize:3
              }
  this.grid = {color      : "#111111",
              visible    : true,
              linewidth  : 0.5
              }

  this.mouse = { // Mouse coords in signal "coordinates"
                 x : 105,
                 y : 14,
                 old_t : 0, // xAxis time index
                 timeStamp :0,  //Time for  onMouseDown,
                 crosshair:true, // vertica line where mouse is.
                 active:false // mouse is moving in this window (false means that the mouse is syncronized to this window.)
                }
  this.autorange = {
                    xgain : 10, // xaxis is extended 10% of range size
                    ygain : 10  // yaxis is extended 10% of range size
                    }

  /*console.log("SignalCanvasAxis\n" + JSON.stringify(this));
  console.log("SignalCanvasAxis Dynamic Properties \n" );
  console.log("xmax " + this.xmax);
  console.log("ymax " + this.ymax);*/

}// constructor
 // Note that the box orientation refers to the
 // target dragging direction and not how the
 // line is oriented.

// ------------------------------------------------------------
// range - calculate range of array
// Given the arrain arr, [min,max] is returned.
// If gain != o, the range is stretched out
// gain percentage of the whole range original (max-min)
range(arr,gain){

  var min =  Math.min(...arr);
  var max =  Math.max(...arr);
 // console.log("----------------------------------------signalcanvas.js new autorange is min,max ",min,max);
   var expansion = Math.abs(max-min) * gain / 100;
   if(Math.abs(max-min) < 1){
     expansion = 1;
   }
   return [min - expansion, max + expansion];
 }//range
// ------------------------------------------------------------
debugdump(){
   // console.log("Axis, dumping it all");
   // console.log(JSON.stringify(this));
}
// ------------------------------------------------------------
autofit(){

   //console.log("SignalCanvasAxis::autofit running")

   this.axis.xlim = this.range(this.x, this.autorange.xgain)
   this.axis.ylim = this.range(this.y, this.autorange.ygain)
   //console.log("SignalCanvasAxis::autofit running", JSON.stringify(this.axis)

}
// ------------------------------------------------------------
// setfont - internal function to set the font and fontsize
// from a property that contains fontsize (int) and font (string),
// property - the property to read fontsize and font from.
// context is the canvas context we manipulate
// example setfont(this.xticks, ctx);
setfont(property, context){

    var oldfont = this.ctx.font;
    this.ctx.font = property.fontsize + "px bold" + property.font;
    return oldfont;
}//setfont

// ------------------------------------------------------------
// updateAutoTicks - Update tick positions and tick texts from the
// current zoom property setting.
// Given the limits, we need to create a number of nicely formatted ticks.
// We do not want to recalculate this each time we redraw the plot.
_nearestTicksize(step, preferred){
  //console.log("Determining best scale step ", step, preferred)
  var ix = 0;
  var len = preferred.length;
  while(ix < len && step > preferred[ix]){ix++}

  // console.log("Determining best scale step 2", step, preferred, preferred[ix - 1])

   return preferred[Math.max(0, ix -1 )];
}
updateAutoTicks(){
     var ticks      = [];
     var ticklabels = [];
     var step = 1.0* (this.zoom.xlim[1] - this.zoom.xlim[0]) / this.xticks.autoticks;
     step = this._nearestTicksize(step,this.xticks.preferred);

     if (step == 0){
       this.xticks.ticks = [];
       this.xticks.ticklabels = [];
       this.yticks.ticks = [];
       this.yticks.ticklabels = [];
       return;
     }


     var leftmostx = parseInt((Math.min(this.zoom.xlim[0],0))/step) * step;

     //console.log("leftmost point ", this.zoom.xlim[0], step, "=>", leftmostx,"rightx",this.zoom.xlim[1])

     // adjust to multiples of step.
     for (var i = leftmostx;//parseInt(this.zoom.xlim[0]);
          i < this.zoom.xlim[1];
          i  = i + step){
       //console.log("updateAutoTicks:: new tick at  " + i.toFixed(2));
       ticks.push(i);
       if(step < 1){
        ticklabels.push("" + i.toFixed(1));   // How many decimals do we have space for?
       }else {
         ticklabels.push("" + i.toFixed(0));   // How many decimals do we have space for?

       }
     }
     this.xticks.ticks = ticks;
     this.xticks.ticklabels = ticklabels;
     // Producing the y-ticks
     ticks =[];
     ticklabels =[];
     step = 1.0* (this.zoom.ylim[1] - this.zoom.ylim[0]) /
     this.yticks.autoticks
     //console.log("AUTOTICKS -----> innnan ", step)
     step = this._nearestTicksize(step,this.yticks.preferred);
     //console.log("AUTOTICKS -----> efter ", step)
     if (step == 0){
              this.xticks.ticks = [];
              this.xticks.ticklabels = [];
              this.yticks.ticks = [];
              this.yticks.ticklabels = [];
              return;
            }
      var lowesty = parseInt((Math.min(this.zoom.ylim[0],0))/step) * step;
      for (var i = lowesty;//this.zoom.ylim[0]; //+ step;
          i <= this.zoom.ylim[1];
          i  = i + step){
       //console.log("updateAutoTicks:: new tick at  " + i.toFixed(2));
       ticks.push(i);
       if(step < 1){
          ticklabels.push("" + i.toFixed(1));   // How many decimals do we have space for?
       }else{
         ticklabels.push("" + i.toFixed(0));   // How many decimals do we have space for?

     }
     }
     this.yticks.ticks = ticks;
     this.yticks.ticklabels = ticklabels;

 }//updateAutoTicks
 // ------------------------------------------------------------
  resetZoom(){
    if( this.autorange == undefined) {
      console.log("signalcanvas.js::resetZoom this.autorange == undefined" );
      return;
    }
    this.zoom.ylim = this.range(this.y, this.autorange.ygain)

    this.zoom.xlim = [_getXmin(),_getXmax()];
    this.updateAutoTicks();
    this.clear();
    this.draw();
  } //
 // ------------------------------------------------------------
/*
Canvas Coordinates
 The following getters describe the axis in canvas coordinates.
 The information is ultimately used on translate to and from
 canvas coordinate functions
 TODO:, maybe better to cache these if things get slow

 ********/
// ------------------------------------------------------------
// xorigo - returns the origo x-coord in canvas coordinates.
get xorigo(){
    return (  this.xpos +
              this.outermargin.left +
              this.ylabel.fontsize  +
              this.ylabel.vmargin   +
              this.yticks.vmargin   +
              this.yticks.maxwidth);
}//get xorigo
// ------------------------------------------------------------
// xorigo - returns the origo y-coord in canvas coordinates.
get yorigo(){
   return (this.ypos +
          this.height -
          this.outermargin.down -
          this.xlabel.fontsize  -
          this.xlabel.hmargin);
} // getyorigo
// ------------------------------------------------------------
//  xmax is the max canvas x coordinate of the plot area.
get xmax(){
               return (this.width - this.outermargin.right);
}

// ------------------------------------------------------------
//  ymax is the max canvas y coordinate of the plot area.
//  Note the inverted scale. ymax is low and ymin is yorigo
get ymax(){
    return (  this.outermargin.up + this.ypos);
}

// ------------------------------------------------------------
// xscale -  canvasCoordRange / signalRange (x)
get xscale(){   // px / signal unit.

        var xwidth = this.zoom.xlim[1] - this.zoom.xlim[0];
        var awidth = this.xmax - this.xorigo;
        return 1.0 * awidth / xwidth;

 }
// ------------------------------------------------------------
// yscale -  canvasCoordRange / signalRange (y)
get yscale(){   // px / signal unit.
        var ywidth = this.zoom.ylim[1] - this.zoom.ylim[0];
        var awidth = this.yorigo - this.ymax ;
        var scale = 1.0 * awidth / ywidth;
        return scale

 }

mouse2canvas(e) {
    var rect;
    rect = this.canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left);
    var y = (e.clientY - rect.top);
    //console.log("MOUSE coords ",this.elementid,x,"  ",y);
    return {x:x,y:y};
  }
// ------------------------------------------------------------
// canvas2signal_x - converts canvas coords to signal coords.
canvas2signal_x(canvasx){

    // Signal coordinates are within this.zoom.xlim    //DFM CHANGED
      return  (canvasx - this.xorigo) / this.xscale + this.zoom.xlim[0];
}

// ------------------------------------------------------------
// canvas2signal_y - converts canvas coords to signal coords.
canvas2signal_y(canvasy){

    // Signal coordinates are within this.zoom.xlim
    return  ((this.yorigo - canvasy)/this.yscale) + this.zoom.ylim[0];
 }
// ------------------------------------------------------------
signal2plotpos_x(sigx){
    // Signal coordinates are within this.zoom.xlim
      sigx = sigx - this.zoom.xlim[0];  //DFM CHANGED
      return (this.xorigo + this.xscale * sigx);
}
// ------------------------------------------------------------
signal2plotpos_y(sigy){

      // Signal coordinates are within this.zoom.xliM
      sigy = sigy - this.zoom.ylim[0];
      return  this.yorigo - this.yscale *sigy ;
}



// --------------------------//---------------------------------
// drawsignal - draws the signal on the plot.
drawsignal( ){
  //console.log("drawsignal ", JSON.stringify(this.zoom))
  let ctx = this.ctx;
  //ctx.save()
  //ctx.rect(0,0,this.maxx,this.maxy);
  //ctx.clip();
    /*

    // END DEBUG
    */
    ctx.beginPath() // Use new settings.

    ctx.strokeStyle = this.plot.color;
    ctx.fillStyle   = this.plot.color;
    ctx.lineWidth   = this.plot.linewidth;

  if (this.plot.type == 0) {//digital. Maybe we want to smooth or somethinfg.
  }
  // assert that len(x) and len(y) are the same...

  var oldy = this.y[0];
  ctx.moveTo(this.signal2plotpos_x(0), this.signal2plotpos_y(oldy));
  ctx.lineTo(this.signal2plotpos_x(this.x[0]), this.signal2plotpos_y(this.y[0]));
  var xmin = this.plot.markersize/this.xscale;
  var ymin = this.plot.markersize/this.yscale;
   for (var i = 0; i < this.x.length; i++){
      // TODO; skip dense points in plot!
      //var dx = this.x[i] - this.x[Math.min(0,i-1)];
      //var dy = this.y[i] - oldy;
      //if(dx > xmin || dy > ymin){
          ctx.lineTo(this.signal2plotpos_x(this.x[i]), this.signal2plotpos_y(oldy));
          ctx.lineTo(this.signal2plotpos_x(this.x[i]), this.signal2plotpos_y(this.y[i]));


          if(this.plot.markersize > 0){
              ctx.arc(this.signal2plotpos_x(this.x[i]),
                      this.signal2plotpos_y(this.y[i]),this.plot.markersize,0,2*Math.PI);
          }
      //}
      oldy = this.y[i];
  }//for points in plot
  ctx.stroke()


  //ctx.restore();

}//drawsignal

// ------------------------------------------------------------
drawgrid(){
  let ctx = this.ctx;
  this.grid.color = 'rgba(0, 0, 255,0.1)'
  ctx.strokeStyle = this.grid.color;
  ctx.fillStyle   = "red" //this.grid.color;
  //#ctx.fillStyle   = this.grid.color;
  ctx.lineWidth   = 1//this.grid.linewidth;

  //console.log("Drawing the grid with context " + JSON.stringify(ctx));
   //ctx.fillStyle="yellow";
   //ctx.beginPath();
  for(var i = 0 ; i < this.xticks.ticks.length; i++){
      var tx = this.signal2plotpos_x(this.xticks.ticks[i]);
      ctx.moveTo(tx, this.yorigo);
      ctx.lineTo(tx, this.ymax);
   }//for

   for(var i = 0 ; i < this.yticks.ticks.length; i++){
      var y = this.signal2plotpos_y(this.yticks.ticks[i]);
      ctx.moveTo(this.xorigo, y );
      ctx.lineTo(this.xmax, y);
   }//for
    ctx.stroke();
}

// ------------------------------------------------------------
drawticks(){
  let ctx = this.ctx;

  ctx.textBaseline = "middle";

  this.setfont(this.xticks, ctx);

  var labels = this.xticks.labels
  var y  =  this.yorigo + this.xticks.ticksize + this.xticks.fontsize;
  ctx.beginPath()
  for(var i = 0 ; i < this.xticks.ticks.length; i++){
      //console.log("Current ticklabel  " + this.xticks.ticklabels[i]);
      var tx = this.signal2plotpos_x(this.xticks.ticks[i]);

      if (ctx.hasOwnProperty('context')){
        var center = tx //- (ctx.measureText(this.xticks.ticklabels[i]).width / 2);

      }
      else{ // 2D context needs to be adjusted.
        var center = tx - (ctx.measureText(this.xticks.ticklabels[i]).width / 2);

      }
      if (this.xticks.visible &&
          tx >= this.signal2plotpos_x(this.zoom.xlim[0]) &&
          tx <= this.signal2plotpos_x(this.zoom.xlim[1])
         ){

           ctx.moveTo(tx, this.yorigo - this.xticks.ticksize );
           ctx.lineTo(tx, this.yorigo + this.xticks.ticksize );
           ctx.fillText(this.xticks.ticklabels[i], center, y);
      }
   }//for

    this.setfont(this.yticks,ctx);
    for(var i = 0 ; i < this.yticks.ticks.length; i++){

      var y = this.signal2plotpos_y(this.yticks.ticks[i]);


       if (this.yticks.visible &&
          y <= this.signal2plotpos_y(this.zoom.ylim[0])
        )//   y >= this.ymax)
       {
         ctx.moveTo(this.xorigo - this.yticks.ticksize, y );
         ctx.lineTo(this.xorigo + this.yticks.ticksize,y);
         //ty = ty + this.yticks.fontsize / 2.5;
         ctx.fillText(this.yticks.ticklabels[i], this.xpos + this.outermargin.left, y);
       }

   }//for
   ctx.stroke()
}//drawticks
clear(){
  this.ctx.clearRect(0, 0, this.canvas.width *10, this.canvas.height *10); //TODO FIXME ugly work around
}
debug_draw_mouse(){
  // The purpose of this func is to help in calibrating the
  // coordinate transformations.
  //console.log("mouse is ",this.mouse.x,this.mouse.y)
  var ctx = this.ctx
  ctx.beginPath()
  ctx.strokeStyle = "green";
  ctx.lineWidth = 5;
  ctx.arc(this.signal2plotpos_x(this.mouse.x),
       this.signal2plotpos_y(this.mouse.y),
       4,0,2*Math.PI);
  ctx.stroke()

}

draw_mouse(){
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.fillStyle   = "rgb(0,0,0,1)";
    if (this.mouse.crosshair && this.mouse.active == false){

      this.ctx.lineWidth   = 1;
      this.ctx.moveTo(this.signal2plotpos_x(this.mouse.x), this.yorigo);
      this.ctx.lineTo(this.signal2plotpos_x(this.mouse.x), this.ymax);

    }

    try{  // TODO, sometiemes we loose this.y[this.mouse.old_t].toFixed
    this.ctx.fillText("x: " + this.mouse.x.toFixed(2), this.width-100, 30);
    if(this.mouse.old_t !== undefined) {
        this.ctx.fillText("y: " + this.y[this.mouse.old_t].toFixed(2), this.width-100, 50);
    }
  } catch(e){}
    this.ctx.stroke();
    this.ctx.restore();
}

/*********************************************************************/
draw(){
   let ctx = this.ctx;


    ctx.save()
      var clipbox_h = Math.abs(this.ymax - this.yorigo);
      var clipbox_w = this.xmax - this.xorigo;
      ctx.rect(this.xorigo, this.ymax,
               clipbox_w, clipbox_h);
      //console.log("CLIPP ", this.xorigo,this.ymax,clipbox_w,clipbox_h);
      ctx.clip();
      this.drawsignal(ctx);

      if (this.grid.visible){
        this.drawgrid(ctx);
      }
    ctx.restore();
    // Stroke width etc.
    ctx.strokeStyle = "rgb(0,0,0)";
    ctx.fillStyle="black";
    ctx.globalAlpha = 1;
    ctx.lineWidth   = this.axis.linewidth;

    ctx.beginPath();

      // Draw bottom axis
      ctx.moveTo(this.xorigo - this.axis.origosize,this.yorigo);
      ctx.lineTo(this.xmax , this.yorigo);

      // Draw x axis IF visible due to pan
      if(this.zoom.ylim[0] <= 0){
        ctx.moveTo(this.xorigo - this.axis.origosize, this.signal2plotpos_y(0));
        ctx.lineTo(this.xmax , this.signal2plotpos_y(0));
      }

      // Draw y axis
      ctx.moveTo(this.xorigo ,this.yorigo + this.axis.origosize);
      ctx.lineTo(this.xorigo , this.ymax);
      ctx.stroke()

      this.drawticks(ctx)

    ctx.stroke();
    ctx.save()
      var clipbox_h = Math.abs(this.ymax - this.yorigo);
      var clipbox_w = this.xmax - this.xorigo;
      ctx.rect(this.xorigo, this.ymax,
               clipbox_w, clipbox_h);
      //console.log("CLIPP ", this.xorigo,this.ymax,clipbox_w,clipbox_h);
      ctx.clip();
        if(this.ga.current_evaluation &&
           this.ga.current_evaluation.times.valid &&
           this.ga.current_evaluation.times.valid.length > 0){
              if(this.ga.current_evaluation.times.valid[0].length == 2){
               this.draw_ga_info_interval();
            }else {
              this.draw_ga_info_event();
            }

        }//valid ga data.
      ctx.restore();

      if(this.legend.showname){
          ctx.save()
          ctx.beginPath();

             this.setfont(this.legend);
             ctx.strokeStyle = this.legend.namecolor
             ctx.fillStyle = this.legend.namecolor
             ctx.fillText(this.name, 20,20);
             ctx.strokeStyle = "red"
             ctx.fillStyle = "red"
              //TODO Move this to a line above!
             if(this.mouse.x < 10 && this.mouse.y < 10){
               ctx.fillText("X", 10,20);
             }else{
               ctx.fillText("x", 10,20);
             }


          ctx.closePath();
          ctx.stroke();
          ctx.restore();
      }

 }//draw
_draw_region(x1,x2,color){
   var ctx = this.ctx;
   ctx.beginPath();
   ctx.fillStyle = color;

   var margin = (color == this.ga.guardcolor)?0:30

   var w = Math.abs(x2 - x1);
   ctx.fillRect(this.signal2plotpos_x(x1), margin, w*this.xscale ,this.height  - margin);

   ctx.closePath();
   ctx.stroke();
 }
_draw_event(x,color,size,guard=false){

  var ctx = this.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.strokeStyle = color;
  if(guard){
    ctx.arc(this.signal2plotpos_x(x),
          this.ypos + this.height/2, //this.signal2plotpos_y(4),
          this.plot.markersize*size,0.5*Math.PI,1.5*Math.PI,false);
    ctx.arc(this.signal2plotpos_x(x),
                this.ypos + this.height/2, //this.signal2plotpos_y(4),
                this.plot.markersize*size,1.5*Math.PI,0.5*Math.PI,true);
  }
  else {
    ctx.arc(this.signal2plotpos_x(x),
          this.ypos + this.height/2, //this.signal2plotpos_y(4),
          this.plot.markersize*size,0.5*Math.PI,1.5*Math.PI,true);
    ctx.arc(this.signal2plotpos_x(x),
                this.ypos + this.height/2, //this.signal2plotpos_y(4),
                this.plot.markersize*size,1.5*Math.PI,0.5*Math.PI,false);

  }
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.setLineDash([5,5]);
  ctx.moveTo(this.signal2plotpos_x(x),
        0);//  this.signal2plotpos_y(this.zoom.ylim[0]));
  ctx.lineTo(this.signal2plotpos_x(x),
        this.canvas.height + 30);//    this.signal2plotpos_y(this.zoom.ylim[1]));
  ctx.closePath();
  ctx.stroke()
  ctx.restore();
}

draw_ga_info_interval(){
  if (this.ga.current_evaluation == null || this.ga.show == false){
    return;
  }
  var ctx = this.ctx;
  var guards = this.ga.current_evaluation.times.valid;

  var fails  = this.ga.current_evaluation.times.fail.slice(0);
  var passes = this.ga.current_evaluation.times.pass.slice(0);

  if(guards){
    var len = guards.length
    for (var i = 0; i < len; i++){
        this._draw_region(Math.max( _getXmin(),guards[i][0]), Math.min( _getXmax(),guards[i][1]), this.ga.guardcolor);
          if(guard_debug)console.log("Guard region between ", guards[i][0], guards[i][1]," seconds")

    }
  }  //fails
  // TODO: Note that need to process the fail/pass intervals.
  // for each guard. all if any event fails, all fails
  // We still might to mark where it failed "more" though.
  if(fails){
    var len = fails.length
    for (var i = 0; i < len; i++){
        this._draw_region(Math.max( _getXmin(),fails[i][0]), Math.min( _getXmax(), fails[i][1]), this.ga.failcolor_int);
        if(guard_debug)console.log("Fail region between ",fails[i][0], fails[i][1]);
    }
  }  //fails
   if(passes){
     var len = passes.length
     for(var i  = 0; i < len; i++){
        this._draw_region(Math.max( _getXmin(),passes[i][0]), Math.min( _getXmax(), passes[i][1]), this.ga.passcolor_int);
        if(guard_debug)console.log("Pass region between ",passes[i][0], passes[i][1]);
     }
   } //passes
}//_draw_gainfo_interval
draw_ga_info_event(){
    if (this.ga.current_evaluation == null || this.ga.show == false){
      return;
    }
    var ctx = this.ctx;
    var guards = this.ga.current_evaluation.times.valid;
    var fails  = this.ga.current_evaluation.times.fail.slice(0);
    var passes = this.ga.current_evaluation.times.pass.slice(0);

    var len = guards.length;
    for(var i = 0; i < len; i++){

      if(guard_debug)console.log("Guard event at ", guards[i]," seconds")

      // verdict for this guard can be either pass or fail.
      var distfail = 10000;
      var distpass = 10000;
      if(passes && passes.length > 0){
        distpass =  passes[0] - guards[i];
      }
      if(fails && fails.length > 0){
        distfail = fails[0] - guards[i] ;
      }

      if(guard_debug)console.log("   distances to next verdict fail,pass ", distfail,distpass)

      if(distfail > distpass){
        // pass is nearer!
        if(distpass < 10000){
          this._draw_region(guards[i], passes[0], this.ga.guardcolor);
          this._draw_event(passes[0], this.ga.passcolor,2);
          if(guard_debug)console.log("   Pass verdict at ", passes[0]," seconds. Region:",guards[i], passes[0])
          passes.splice(0,1);
        }
      }//pass
      else {
        if(distfail < 10000){
          this._draw_region(guards[i], fails[0], this.ga.guardcolor);
          this._draw_event(fails[0], this.ga.failcolor,2);
          if(guard_debug)console.log("   Fail verdict at ", fails[0]," seconds. Region:", guards[i], fails[0] )
          fails.splice(0,1);
        }

      }// fail
        this._draw_event(guards[i], this.ga.guardcolor,4,true);
    }//for all guards





}// draw_verdict

}//class
export class SignalCanvasAxis extends SignalCanvasBase{
  constructor(canvas_element_name){
    super(canvas_element_name);
    this.DRAG_NONE       = 0;
    this.DRAG_HORIZONTAL = 1;
    this.DRAG_VERTICAL   = 2;
    this.DRAG_VERTICAL_PAN    = 3;    //Shift key + drag Vertically
    this.DRAG_HORIZONTAL_PAN  = 4;    //Shift key + drag Horizontally
    this.DRAG_ZOOM   = 5;

    this.DRAGTOOL_POINTDRAG = 0;
    this.DRAGTOOL_POINTADD  = 1;
    this.DRAGTOOL_ZOOM      = 2;
    this.DRAGTOOL_PAN       = 3;
    this.draginfo = {
                     activetool:this.DRAGTOOL_POINTDRAG,
                     xstart : 0,    // signal px , cancel drag will reset to this
                     ystart : 0,    // signal px, cancel drag will reset to this
                     validsampletargetix : -1,   // set by draw signal if mouse.x,y
                     action : this.DRAG_NONE,
                     active_drag : false,
                     range : 15,    // canvas px, how close we need to be to drag.
              /*                                 // is in range of the mouse.
                     types  : [ "Horizontal Zoom",  // 0
                               "Vertical Zoom",     // 1
                               "Horzontal Pan",     // 2
                               "Vertical Pan",      // 3
                               "Moving Point Vertically",     // 4
                               "Moving Point Horizontally" ],    // 5
  */
                     type : 0  //ix in types array
                    }
  }// constructor
  draw(){
          super.draw();
          this.draw_current_drag_segment();
  }

  mouse_on_horizontal_plotline(){
     var len = this.x.length
     var res = false;
     for(var i = 0 ; i < len; i++){
       if (this.within_vertical_bbox(i)){
            res = true;
          }
     }
      return res
 }
 mouse_on_vertical_plotline(){
    var len = this.x.length
    var res = false;
    for(var i = 0 ; i < len; i++){
      if (this.within_horizontal_bbox(i)){
           res = true;
         }
    }
     return res
 }
 // ------------------------------------------------------------
 mouse_on_sample(){
   var len = this.x.length;

   for(var i = 0; i < len; i++){
     if( (Math.abs(this.mouse.y - this.y[i]) < this.draginfo.range/this.yscale) &&
         (Math.abs(this.mouse.x - this.x[i]) < this.draginfo.range/this.xscale)){
           return i;
     }

   }//for
   return -1; // not near any sample.
 }
  // ---- The following functions deal with the signal edit functionality
  // --- TODO: make sub class for digital signal.
  _nearest_target_ix(coordinate,array){
    // returns the smallest distance and the index
    var nearestIx = -1;
    var nearest = 100000000;

    for(var i = 0;i < array.length; i++){
      var range = Math.abs(coordinate - array[i]);
      if (range < nearest){
         nearestIx = i;
         nearest   = range;
      }
    }//for
     return {distance:nearest,ix:nearestIx}
  }//_nearest_target_ix
  set_current_drag_target(){
    // Given the mouse x an y coordinates (in signal coordinates)
    // We decide if it is
    // a) DRAG_NONE
    // b) DRAG_VERTICAL  (which segment should be drawn and which point is target)
    // c) DRAG_HORIZONTAL (which segment should be drawn and which point is target)

    var draghits = [];
    // collect all drag boxes we hit with the mouse:
    for (var i = 0; i < this.x.length; i++){
        if(this.x[i] + this.draginfo.range/this.xscale > this.mouse.x){

          break;
        }
        var box = this.get_vertical_bbox(i);
        if(this.within_box(box)){
          //console.log("hit " + JSON.stringify(box));
          draghits.push(box);

        }
        box = this.get_horizontal_bbox(i);
        if(this.within_box(box)){
          //console.log("hit " + JSON.stringify(box));
          draghits.push(box);
        }
    }//for
    if (draghits.length == 0){
        this.draginfo.action = this.DRAG_NONE;
      return; // Mouse does not hit any (line) drag target
    }
    var nearestbox = draghits[0];
    for (var i  = 0 ; i < draghits.length ; i++){
      //console.log(`DRAGHIT ${nearestbox.o} ${nearestbox.ix} ${nearestbox.linedist}`)
      if(nearestbox.linedist > draghits[i].linedist){
        nearestbox = draghits[i];
      }
    }//for

      this.draginfo.validsampletargetix =  nearestbox.ix ;

      this.draginfo.action = (nearestbox.o==="v") ? this.DRAG_VERTICAL : this.DRAG_HORIZONTAL;

  }//set_current_drag_target
  get_vertical_bbox(i){
      var res = {x1:this.x[i],
                 y1:Math.min(this.y[i] - this.draginfo.range/this.yscale, this.y[i] + this.draginfo.range/this.yscale),
                 x2:this.x[i+1] ,
                 y2:Math.max(this.y[i] - this.draginfo.range/this.yscale, this.y[i] + this.draginfo.range/this.yscale),
                 o:"v",
                 linedist:Math.abs(this.mouse.y - this.y[i])*this.yscale,
                 ix:i
                };
      res.w = res.x2 - res.x1;
      res.h = res.y2 - res.y1;
      res.d = (res.x2 - res.x1) + (res.y2 - res.y1); // size on the diagonal

      return res;
  }
  within_box(box){
    return (this.mouse.x > box.x1 &&
            this.mouse.x <= box.x2 &&
            this.mouse.y > box.y1 &&
            this.mouse.y <= box.y2);
  }
  within_vertical_bbox(i){
   var box = this.get_vertical_bbox(i);
   return this.within_box(box);
  }
  get_horizontal_bbox(i){
      // TODO, special case i == 0.
      var res = { x1:this.x[i + 1] - this.draginfo.range/this.xscale,
                  y1:Math.min(this.y[i] , this.y[i + 1] ),
                  x2:this.x[i + 1] + this.draginfo.range/this.xscale,
                  y2:Math.max(this.y[i] , this.y[i + 1] ),
                  o:"h",
                  linedist:Math.abs(this.mouse.x - this.x[i+1]) * this.xscale,
                  ix:i+1
                };
      // DEBUG
      res.w = res.x2 - res.x1;
      res.h = res.y2 - res.y1;
      res.d = (res.x2 - res.x1) + (res.y2 - res.y1); // size on the diagonal

      return res;
  }
  within_horizontal_bbox(i){
     var box = this.get_horizontal_bbox(i);
     return this.within_box(box);
    }
  _draw_wire_box(box){
    let ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(this.signal2plotpos_x(box.x1),this.signal2plotpos_y(box.y1));
    ctx.lineTo(this.signal2plotpos_x(box.x1),this.signal2plotpos_y(box.y2));
    ctx.lineTo(this.signal2plotpos_x(box.x2),this.signal2plotpos_y(box.y2));
    ctx.lineTo(this.signal2plotpos_x(box.x2),this.signal2plotpos_y(box.y1));
    ctx.lineTo(this.signal2plotpos_x(box.x1),this.signal2plotpos_y(box.y1));
    ctx.closePath()
    ctx.stroke();
  }
  _draw_filled_box(box){
    let ctx = this.ctx;
    ctx.fillRect(this.signal2plotpos_x(box.x1),
                 this.signal2plotpos_y(box.y1) - box.h * this.yscale,
                 box.w * this.xscale,
                 box.h * this.yscale);
  }
  draw_drag_boxes(){
    // Overload protection
    if (this.x.length > 1000){
      return;
    }
    let ctx = this.ctx;
    ctx.save()
    var clipbox_h = Math.abs(this.ymax - this.yorigo);
    var clipbox_w = this.xmax - this.xorigo;
    ctx.rect(this.xorigo, this.ymax,
             clipbox_w, clipbox_h);
    //console.log("CLIPP ", this.xorigo,this.ymax,clipbox_w,clipbox_h);
    ctx.clip();

    // Stroke width etc.
    ctx.strokeStyle = "rgb(0,0,255,0.5)";
    ctx.fillStyle="rgb(0,0,255,0.1)";
    ctx.lineWidth   = 1;

     for (var i = 0 ; i < this.x.length - 1; i++){
           // Vertical boxes
          var box = this.get_vertical_bbox(i);
          if(this.within_vertical_bbox(i)){
              this._draw_filled_box(box);
          }else{
            this._draw_wire_box(box);
          }
          box = this.get_horizontal_bbox(i);
          if(this.within_vertical_bbox(i)){
              this._draw_filled_box(box);
          }else{
            this._draw_wire_box(box);
          }
      }//for

    ctx.restore();
    }//draw_drag_boxes


  draw_current_drag_segment(){

      // Overload protection
      if (this.x.length > 1000){
        return;
      }

     if((this.draginfo.action != this.DRAG_HORIZONTAL &&
        this.draginfo.action != this.DRAG_VERTICAL) ||
        this.draginfo.validsampletargetix == -1){
          return;
     }
     let ctx = this.ctx;
     ctx.save()
     var clipbox_h = Math.abs(this.ymax - this.yorigo);
     var clipbox_w = this.xmax - this.xorigo;
     ctx.rect(this.xorigo, this.ymax,
              clipbox_w, clipbox_h);
     //console.log("CLIPP ", this.xorigo,this.ymax,clipbox_w,clipbox_h);
     ctx.clip();
     // Stroke width etc.
     ctx.strokeStyle = "rgb(255,0,0)";
     //ctx.fillStyle="green";
     ctx.lineWidth   = 5;

     if(this.draginfo.action == this.DRAG_HORIZONTAL){
       var x1 = this.x[this.draginfo.validsampletargetix];
       var y1 = this.y[Math.max(0,this.draginfo.validsampletargetix - 1)];
       var x2 = this.x[this.draginfo.validsampletargetix];
       var y2 = this.y[this.draginfo.validsampletargetix];
     }else {
       var x1 = this.x[this.draginfo.validsampletargetix];
       var y1 = this.y[this.draginfo.validsampletargetix];
       var x2 = this.x[Math.min(this.x.length -1, this.draginfo.validsampletargetix + 1)];
       var y2 = this.y[this.draginfo.validsampletargetix];
     }
     ctx.beginPath();
     ctx.moveTo(this.signal2plotpos_x(x1),this.signal2plotpos_y(y1));
     ctx.lineTo(this.signal2plotpos_x(x2),this.signal2plotpos_y(y2));
     ctx.closePath();
     ctx.stroke();
     ctx.restore();
  }//draw_current_drag_segment


_mouse_in_plot_area(){
  var resx = this.mouse.x > this.zoom.xlim[0] && this.mouse.x < this.zoom.xlim[1];
  var resy = this.mouse.y > this.zoom.ylim[0] && this.mouse.y < this.zoom.ylim[1];
  return resx && resy;
}

_cancel_drag(){
  this.draginfo.active_drag = false;
  this.draginfo.validsampletargetix = -1;
  this.canvas.style.cursor = "default";
}

  _set_mouse_cursor(e){

    if (this.draginfo.active_drag == true){
      return; // Do not change until drag has finished.
    }
    this.canvas.style.cursor = "default";

    if (e.altKey &&
        this.mouse_on_sample() != -1){
         this.canvas.style.cursor = "not-allowed";
         return;
      }
    if(e.altKey)
      return; // We are looking for a point to delete
    if (e.shiftKey &&
       this.mouse_on_horizontal_plotline()){
         this.canvas.style.cursor = "copy";
         return;
      }

    if(this.mouse_on_vertical_plotline()){
      this.canvas.style.cursor = "col-resize";
      return;
    }
    if(this.mouse_on_horizontal_plotline()){
      this.canvas.style.cursor = "ns-resize";
      return;
    }

  }//_set_mouse_cursor
  _translate_internal_mouse(e){
    let pos = this.mouse2canvas(e);
    let canvas_x = pos.x;
    let canvas_y = pos.y;
    // Update internal mouse pointer before new draw:
    //console.log("Dragging: Active drag is ", this.draginfo.active_drag, this.draginfo.validsampletargetix)
    this.mouse.x = this.canvas2signal_x(canvas_x);
    this.mouse.y = this.canvas2signal_y(canvas_y);

    var len = this.x.length;
    if (this.mouse.x < this.x[this.mouse.old_t]){
      // Mouse moved to left:er x index.
      while(this.mouse.old_t > 0 && this.mouse.x < this.x[this.mouse.old_t]){this.mouse.old_t-- }
    } else{
      while (this.mouse.old_t < len -1 && this.mouse.x > this.x[this.mouse.old_t + 1 ]){this.mouse.old_t++}
    }
    //console.log("_translate_internal_mouse::", this.mouse.old_t, this.mouse.x, this.mouse.y)
  }//_translate_internal_mouse


    snap_to(v,snap){
      if (snap <= 0){
        return v
      }else {
        return Math.floor(v / snap) * snap;
      }
    }//snap_to_x

  onOtherCanvasMouseMoved(e,elementid){
    if(this.elementid == elementid)
        return;
     // if the mouse is moved in another editor, we synchronize the
    // mouse x coordinates.
    var oldy = this.mouse.y ;
    this._translate_internal_mouse(e);
    this._cancel_drag();
    this.mouse.y = oldy; // restore since new y val is in another canvas.
    this.mouse.active = false;
    this.clear();
    this.draw();
    this.draw_mouse();
  }
  onMouseMove(e){
    this.mouse.active = true;
    this._translate_internal_mouse(e);
    // If the mouse is outside the plot area, we cancel any drag operation AND allow default behavior.
    if(this._mouse_in_plot_area() == false){
        this._cancel_drag();
      	this.clear();
      	this.draw();
        return true; // if browser implements, use default behavior.
    }

    bus.$emit('signalcanvas-mouse-moved', e, this.elementid);

      // Overload protection
      // If the number of sample points are too many
      // the performance will suffer severely...
      // TODO: Tell user about it.
      if (this.x.length > 1000){
        return;
      }
    // Change mouse cursor




    let pos = this.mouse2canvas(e);
    let canvas_x = pos.x;
    let canvas_y = pos.y;


    this.clear();
    //this.debug_draw_mouse();

      this.draw_mouse();

    // Immeadetly cancel any dragging operation if we start pressing the alt key (remove sample)
    if(e.altKey){this.draginfo.active_drag = false;this.draginfo.validsampletargetix = -1;}

    this._set_mouse_cursor(e);

    if(this.draginfo.active_drag == true){
      if(this.draginfo.action == this.DRAG_VERTICAL){

        // move the y element
        //console.log("Dragging vertically", this.draginfo.validsampletargetix)
        if(this.draginfo.validsampletargetix != -1){
          var deltay = this.draginfo.starty - this.canvas2signal_y(canvas_y)

          this.y[this.draginfo.validsampletargetix] -= deltay;
          this.y[this.draginfo.validsampletargetix] = this.snap_to(
                                   this.y[this.draginfo.validsampletargetix],
                                   this.axis.snap_y);
          this.draginfo.startx = this.canvas2signal_x(canvas_x);
          this.draginfo.starty = this.y[this.draginfo.validsampletargetix]
        }
      }//vertical drag
      else if(this.draginfo.action == this.DRAG_HORIZONTAL){
        //console.log("Dragging horizontally", this.draginfo.validsampletargetix)


        var deltax = this.canvas2signal_x(canvas_x) - this.draginfo.startx;
        var newX = this.x[this.draginfo.validsampletargetix] + deltax;
        var within_nearest_points = newX > this.x[Math.max(this.draginfo.validsampletargetix - 1,0)] &&
                                    newX < this.x[Math.min(this.draginfo.validsampletargetix + 1,this.x.length - 1)];
        var endpoints = this.draginfo.validsampletargetix == 0 ||
                        (this.draginfo.validsampletargetix == this.x.length -1 &&
                         newX <   _getXmax());
        //console.log(within_nearest_points , endpoints, "Dragging point " + this.draginfo.validsampletargetix + " " + this.x.length)

        if (within_nearest_points || endpoints){
            this.x[this.draginfo.validsampletargetix] = this.snap_to(newX,this.axis.snap_x);
            this.draginfo.startx = this.x[this.draginfo.validsampletargetix]
            this.draginfo.starty = this.canvas2signal_y(canvas_y);
        }
      }//horizontal drag
        else if(this.draginfo.action == this.DRAG_ZOOM &&
                e.shiftKey == false){
        // draw a filled blue rectangle from where we started the drag.
        var x1 = Math.min(this.draginfo.startx,this.mouse.x);
        var y1 = Math.max(this.draginfo.starty,this.mouse.y);
        var h  = Math.abs(this.draginfo.starty - this.mouse.y);
        var w  = Math.abs(this.draginfo.startx - this.mouse.x);
        this.ctx.beginPath();
        this.ctx.strokeStyle = "rgb(0,0,255,0.5)";
        this.ctx.fillStyle   = "rgb(0,0,255,0.1)";
        this.ctx.lineWidth   = 1;
        this.ctx.fillRect(this.signal2plotpos_x(x1),
                     this.signal2plotpos_y(y1),
                     w * this.xscale,
                     h * this.yscale);

        this.ctx.closePath();
        this.ctx.stroke();
      }//zoooming
      else if(this.draginfo.action == this.DRAG_PAN &&
              e.shiftKey == true){
                // The user has requested dx,dy pan.
                var dy = this.draginfo.starty - this.mouse.y;
                var dx = this.draginfo.startx - this.mouse.x;

                //console.log("PAN: remaining space tl ", this.axis.xlim[0] - this.zoom.xlim[0])
                this.zoom.xlim = [this.zoom.xlim[0] + dx,
                                  this.zoom.xlim[1] + dx,
                                 ]
                this.zoom.ylim = [ this.zoom.ylim[0] + dy,
                                   this.zoom.ylim[1] + dy,
                                 ]
                bus.$emit('signalcanvas-panned', this.zoom);

                this.updateAutoTicks();
              }
    }

    if (this.draginfo.active_drag == false &&
        !e.altKey){
    this.set_current_drag_target()
    }
    // This is for debug purposes (when we change the scaling and stuff it will be quite helpful)
    //this.draw_drag_boxes();

    this.draw();
    //return false;
  }// onMouseMove


  onModifierDown(e){
    this.draginfo.active_drag = false;
  }


  onMouseUp(e){
    this._translate_internal_mouse(e);
    // If the mouse is outside the plot area, we cancel any drag operation AND allow default behavior.
    if(this._mouse_in_plot_area() == false){
        this._cancel_drag();
        return true; // if browser implements, use default behavior.
    }
    // Finish all drag operations
    //console.log("MouseUP active drag ", this.draginfo.active_drag, " dragtype ",this.draginfo.action)
    if(this.draginfo.active_drag == true &&
       this.draginfo.action == this.DRAG_ZOOM){
         // to avoid annoying zooming, we make a quick check that the zoom attempt
         // is atleast 500ms long
         var h = this.signal2plotpos_y(Math.abs(this.mouse.y - this.draginfo.starty));
         var w = this.signal2plotpos_x(Math.abs(this.mouse.x - this.draginfo.startx));
         //if (h > 10 && w > 10){
         if((e.timeStamp - this.mouse.timeStamp) > 500){
           // console.log("ZOOMING ", h, w , " pixels")
           this.zoom.xlim = [Math.min(this.mouse.x,this.draginfo.startx),
                             Math.max(this.mouse.x,this.draginfo.startx),
                               ];
           this.zoom.ylim = [Math.min(this.mouse.y,this.draginfo.starty),
                             Math.max(this.mouse.y,this.draginfo.starty),
                               ];
          this.updateAutoTicks();
          bus.$emit('signalcanvas-zoomed', this.zoom);
         } // end zoom box big enough
       } // end zoom
    this.draginfo.active_drag = false;
    this.clear();
    this.draw();
    bus.$emit('edited-signal-updated',this.name);
    return false;

  }//onMouseUp
  _checkAndStartSamplePointDrag(pos){

    if((this.draginfo.validsampletargetix != -1) &&
       ((this.draginfo.action == this.DRAG_VERTICAL)||
        (this.draginfo.action == this.DRAG_HORIZONTAL))){
          this.draginfo.startx = this.canvas2signal_x(pos.x);
          this.draginfo.starty = this.canvas2signal_y(pos.y);
          this.draginfo.active_drag = true;
          //console.log("STARTING DRAG")
          return true;
    }else{
      return false;
    }
  }//_checkAndStartSamplePointDrag
  onMouseDown(e){
    // If we have control pressed, it is a Pan
    // if we have a valid sample drag, we simply move point.
    this._translate_internal_mouse(e);
    if(this._mouse_in_plot_area() == false){
        this._cancel_drag();
        return true; // if browser implements, use default behavior.
    }
    let pos = this.mouse2canvas(e);
    this.mouse.timeStamp = e.timeStamp;
    if(this.draginfo.active_drag == true){
      console.log("ERROR - Unfinished drag")
    }
    // IF the modifier key SHIFT is pressed, we add a points
    if (e.shiftKey) {
      if((this.draginfo.validsampletargetix != -1) &&
         this.draginfo.action == this.DRAG_VERTICAL){
          // We should add a point to the "right" of validsampletargetix
          this.y.splice(this.draginfo.validsampletargetix + 1,0,this.y[this.draginfo.validsampletargetix]);
          this.x.splice(this.draginfo.validsampletargetix + 1,0,this.canvas2signal_x(pos.x));
          this.clear();
          this.draw();
          return;
      }
    }//add
    if(e.altKey){  // IF the modifier key ALT is pressed, we remove a point
      var target_ix = this.mouse_on_sample()
      if(target_ix != -1){
        this.x.splice(target_ix,1);
        this.y.splice(target_ix,1);
        this.clear();
        this.draw();
        bus.$emit('edited-signal-updated',this.name);
        return;
      }
    }//remove

   // We are (possibly) dragging a point.
   if (this._checkAndStartSamplePointDrag(pos))
        return;

    // If we reach here, it is either a zoom or pan
    if(e.shiftKey){
      this.draginfo.action = this.DRAG_PAN;
    }
    else{
      this.draginfo.action = this.DRAG_ZOOM;
    }
    this.draginfo.active_drag = true;
    this.draginfo.startx = this.canvas2signal_x(pos.x);
    this.draginfo.starty = this.canvas2signal_y(pos.y);
  // return false;
  }//onMouseDown
  onMouseLeave(e){
    //console.log("AXIS on mouse leave!!!");
    // Cancel any ongoing drag operations.

      this.draginfo.activetool = this.DRAGTOOL_POINTDRAG;
      this.draginfo.active_drag = false;
      this.mouse.x = this.draginfo.startx;
      this.mouse.y = this.draginfo.starty;

      this.clear();
      this.draw();
      var e = {};
      // Hide the crosshair in all editors
      e.clientX = -10;
      e.clientY = -10;
      bus.$emit('signalcanvas-mouse-moved', e, this.elementid);


  }//onMouseLeave
}
