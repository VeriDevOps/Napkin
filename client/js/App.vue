<template>
<div id="app" width="100%">
     <!--<h1>{{ msgWelcome }}</h1>
   <p>{{ msgSelectSignals }}</p>-->
    <b-container fluid style="width:100%;padding-right: 0px; padding-left: 0px;">
          <b-row>
          <b-col md="5" style="vertical-align: top;padding-right: 0px; padding-left: 0px;">
              <b-card   no-body id="left-pane"  >
                    <b-tabs  card v-model="leftTabIndex" @input="onLeftTabChanged">

                      <b-tab title="File" active >
                           <filebrowser :buttontext="buttonText" :initialPath.sync="path" :separator="separator"></filebrowser>
                      </b-tab>
                      <b-tab title="Signal List"  >
                          <signallist></signallist>
                      </b-tab>
                      <b-tab title="Large Editor" >
                          <gaeditor editorID="tears-editor-vertical" theme="ace/theme/textmate" ></gaeditor>
                      </b-tab>
                      <!--  <b-tab title="X" style="width:0pt;"@onselect="console.log('X selected')">
                      </b-tab>-->
                      <b-tab title="Batch Evaluator" style="background:white;width:100%">
                            <batchevaluator></batchevaluator>
                      </b-tab>
                       <b-tab title="Live Stream" style="background:white;width:100%">
                            <livedata></livedata>
                      </b-tab>
                   </b-tabs>
            </b-card>
          </b-col>
          <b-col md="7" style="overflow:auto;vertical-align:top;padding-right: 0px; padding-left: 0px;">
            <b-card no-body id="right-pane" @resize="onLeftPaneResized">
                  <b-tabs card v-model="rightTabIndex" @input="onRightTabChanged">
                    <b-tab title="Signal Editor" active>
                             <signaleditor2></signaleditor2>
                     </b-tab>

                    <b-tab title="T-EARS Unit Tests" style="background:white;width:100%">
                        <unittest></unittest>
                    </b-tab>


                    <b-tab id="help-pane1" ref="help-panel1" title="Help(State)" style="background:white;max-heigth:300px;height:300px;overflow:scroll;"  >



                      <h2> State-driven Guarded Assertion </h2>
                      <h5> Allowed Patterns </h5>
                      <code> 'Ex-1' = while RG shall RA </code><br>
                      <code>'Ex-2' = while RG shall RA within t s  </code>

                      <table class="tg">
                        <tr>
                          <th class="tg-s268">Interval Grammar</th>
                          <th class="tg-s268">Signal Grammar</th>
                        </tr>
                        <tr>
                          <td class="tg-g03a">Intervals = </td>
                          <td class="tg-g03a">Signal =</td>
                        </tr>
                        <tr>
                          <td class="tg-g03a">| identifier</td>
                          <td class="tg-g03a">| identifier</td>
                        </tr>
                        <tr>
                          <td class="tg-g03a">| <span style="font-weight:bold">true</span> <span style="font-weight:bold">false</span></td>
                            <td class="tg-g03a">| Signal <span style="font-weight:bold">at</span> Events</td>
                        </tr>
                        <tr>
                          <td class="tg-g03a">| [ Time,...,Time]</td>
                          <td class="tg-jbkt">| Number  <span style="font-weight:bold">true false</span> </td>
                        </tr>
                        <tr>
                          <td class="tg-jbkt">| Signal<span style="font-weight:bold"> == != &gt;= &lt;= &gt;  &lt;</span> Signal</td>
                          <td class="tg-jbkt">| Signal <span style="font-weight:bold">+</span>
                                                       <span style="font-weight:bold">-</span>
                                                       <span style="font-weight:bold">*</span>

                                                       <span style="font-weight:bold">/</span> Signal</td>
                        </tr>
                        <tr>
                          <td class="tg-jbkt">| IntervalFunction</td>
                          <td class="tg-jbkt">| SignalFunction</td>
                        </tr>
                        <tr>
                          <td class="tg-jbkt">| Intervals <span style="font-weight:bold">longer than</span> Time</td>
                          <td class="tg-jbkt">   </td>
                        </tr>
                        <tr>
                          <td class="tg-jbkt">| Intervals <span style="font-weight:bold">shorter than</span> Time</td>
                          <td class="tg-jbkt"></td>
                        </tr>
                        <tr>
                          <td class="tg-jbkt">| Intervals <span style="font-weight:bold">and</span> <span style="font-weight:bold">or</span> Intervals</td>
                          <td class="tg-jbkt"></td>
                        </tr>
                        <tr>
                          <td class="tg-jbkt"> </td>
                          <td class="tg-jbkt"></td>
                        </tr>  <tr>
                            <td class="tg-last"> </td>
                            <td class="tg-last"></td>
                          </tr>
                       </table>
                       <hr>
                        <table class="tg">
                          <tr>
                            <th class="tg-s268"  style="font-weight:bold">Interval Functions</th>
                            <th class="tg-s268"  style="font-weight:bold">Signal Functions</th>
                        </tr>
                        <tr>
                          <td class="tg-apln"><span style="font-weight:bold;color:rgb(49, 102, 255)">between</span> ( Events|Time, Events|Time)</td>
                          <td class="tg-apln"><span style="font-weight:bold;color:rgb(49, 102, 255)">derivative</span> ( Timeout,)? Signal )</td>
                        </tr>
                        <tr>
                          <td class="tg-apln"><span style="font-weight:bold;color:rgb(49, 102, 255)">not</span>(Intervals)</td>

                          <td class="tg-apln"> <span style="font-weight:bold;color:rgb(49, 102, 255)">abs</span> ( Signal )</td>
                        </tr>
                        <tr>
                          <td class="tg-apln"></td>
                          <td class="tg-apln"><span style="font-weight:bold;color:rgb(49, 102, 255)"> bitmask</span> ( alnum+ , Signal )</td>
                        </tr>

                        <tr>
                          <td class="tg-apln"></td>
                          <td class="tg-apln"><span style="font-weight:bold;color:rgb(49, 102, 255)"> maxVal</span> ( [Signal,...,Signal] )</td>
                        </tr>
                        <tr>
                          <td class="tg-apln"></td>
                          <td class="tg-apln"><span style="font-weight:bold;color:rgb(49, 102, 255)"> select</span> ( Signal_control, Signal_true, Signal_false )</td>
                        </tr>
                        <tr>
                          <td class="tg-apln"></td>
                          <td class="tg-apln"><span style="font-weight:bold;color:rgb(49, 102, 255)"> exists</span> ( Signal )</td>
                        </tr>
                        <tr s>
                          <td class="tg-apln" style="border-bottom-width:1px;"></td>
                          <td class="tg-apln" style="border-bottom-width:1px;"> <span style="font-weight:bold;color:rgb(49, 102, 255)">count</span> ( Events , Intervals )</td>
                        </tr>

                      </table>

                    </b-tab>

                    <b-tab id="help-pane2" title="Help(Event)" style="background:white;max-heigth:300px;height:300px;overflow:scroll;"  >


                        <h2> Event-driven Guarded Assertion </h2>
                        <h5> Allowed Patterns </h5>
                        <code> // P = Events, R = Intervals, tw = Timout</code><br>
                        <code>// G = Guard, A = Assertion</code><br>
                        <code>'Case-1' = when PG shall RA</code><br>
                        <code>'Case-2' = when PG shall PA within tw </code><br>
                        <code>'Case-3' = when PG shall RA for tf within tw</code><br>
                        <code>'Case-4' = when PG shall RA within tw for tf</code><br>

                        <table class="tg">
                          <tr>
                            <th class="tg-s268">Event Grammar</th>
                            <th class="tg-s268">Event Functions</th>
                          </tr>
                          <tr>
                            <td class="tg-g03a">Events = </td>
                            <td class="tg-g03a">EventFunctions =</td>
                          </tr>
                          <tr>
                            <td class="tg-g03a"> [Time,...,Time] </td>
                            <td class="tg-g03a"> <span style="font-weight:bold;color:rgb(49, 102, 255)">rising_edge</span> (Signal | Intervals) </td>
                          </tr>

                          <tr>
                            <td class="tg-g03a">|  Events +|- Time </td>
                            <td class="tg-g03a"> <span style="font-weight:bold;color:rgb(49, 102, 255)">falling_edge</span> (Signal | Intervals) </td>
                          </tr>

                          <tr>
                            <td class="tg-g03a">| Events <span style="font-weight:bold">and</span> Intervals </td>
                            <td class="tg-g03a"> <span style="font-weight:bold;color:rgb(49, 102, 255)">cycle</span> (Events? , Time) </td>
                          </tr>
                          <tr>
                            <td class="tg-g03a">| Intervals <span style="font-weight:bold">and</span> Events </td>
                            <td class="tg-g03a">   </td>
                          </tr>
                          <tr>
                            <td class="tg-g03a">| Intervals <span style="font-weight:bold">for</span> Time </td>
                            <td class="tg-g03a">   </td>
                          </tr>
                          <tr>
                            <td class="tg-g03a">| EventFunctions </td>
                            <td class="tg-g03a">   </td>
                          </tr>
                           <tr>
                              <td class="tg-g03a">| Events <span style="font-weight:bold">or</span> Events  </td>
                              <td class="tg-g03a">   </td>
                          </tr>
                          <tr>
                               <td class="tg-g03a">| definedEvents </td>
                               <td class="tg-g03a">   </td>
                          </tr>
                          <tr>
                             <td class="tg-last">| Sequence   </td>
                             <td class="tg-last">   </td>
                         </tr>

                        </table>
                    </b-tab>
                    <b-tab id="help-pane3" title="Help(Plots)" style="background:white;max-heigth:300px;height:300px;overflow:scroll;"  >
                      <img src="./help_images/while_1.png" width=80% /><hr>
                      <img src="./help_images/events_intervals_for.png" width=80% /><hr>
                      <img src="./help_images/sequence(1).png" width=80%/>

                   </b-tab>
                   <b-tab title="Main Definitions" style="background:white;width:100%;overflow:hidden;">
                        <maindefview></maindefview>
                    </b-tab>

                 </b-tabs>
            </b-card>

          </b-col>

        </b-row>
       <b-row style="">
          <gaeditor style="width:100%;height:100%" editorID="tears-editor-horizontal" theme="ace/theme/monokai"></gaeditor>
        </b-row>
          <plotarea></plotarea>
         
     </b-container>

</div>
</template>

<script>
import bus from './EventBus.vue'
import filebrowser from './FileBrowser.vue'
import signallist from './SignalList.vue'
import gaeditor from './GAEditor.vue'
import signaleditor2 from './SignalEditor2.vue'
import plotarea from './PlotArea.vue'
import batchevaluator from './BatchEval.vue'
import unittest from './Unittest.vue'
import maindefview from './MainDefOverview.vue'
import livedata from  './LiveData.vue'

export default {
  name: 'app',
  components: {
    filebrowser,
    signallist,
    gaeditor,
    signaleditor2,
	  plotarea,
    batchevaluator,
    unittest,
    maindefview,
    livedata
  },
  data() {
	  return {
		  msgWelcome: 'Welcome to the SAGA Toolbox!',
	      msgSelectSignals: 'Select signals in the list to plot.',
	      buttonText: 'Load file(s)',
	      callbacks: {},
	      jsondiff: {},
	      initialPath: "../../../resources/loggar/TC0998_SAGA_TCOVehSpeed_Trajectory5_whole_2016_10_24_12_53_15.jsondiff",
        // initialPath: "../../../resources/loggar/paper_example.jsondiff"
        // ga=../../../resources/ga/SR_C30_SRS_Safe-REQ-283.txt&log=../../../resources/loggar/2_200_0_Passed_20200522_081904_TC-DriveBrake-S-001_SoftCCU_LOGDATA_20200522_081923_00.TXT&main=../../../resources/loggar/main_definitions.ga
        leftTabIndex : 0,
        rightTabIndex:0
	  }
  },
  computed: {
	  separator() {
		  var platform = window.navigator.platform;
		  if (platform.indexOf("Win") > -1)
			  return "\\\\";
		  else
			  return "/";
	  },
	  path() {
		  // Get the filename (the last part of the path)
		  return this.initialPath.split(new RegExp(this.separator, "i")).slice(-1)[0];
	  }
  },
  methods: {
    formatLeftPane(){

      if(this.leftTabIndex >= 3 ){
        console.log("Formatting left pane nr ", this.leftTabIndex)
        return  "overflow:scroll;background:yellow";

       }
      else
      return ""
    },
    onRightTabChanged(e){

      this.$nextTick(function() {
        //console.log("Right tab changed to ",e, "Resizing");
        bus.$emit('window-resize');
      });
      return; // TODO adjust sizes for Batch Evaluator
        var leftPane      = document.getElementById('left-pane').parentElement;

        leftPane.hidden = (e==1);


    },
    onLeftTabChanged(e){
      //console.log("Left tab changed to ",e);
      this.$nextTick(function() {
        bus.$emit('window-resize');
      });

    },
    onLeftPaneResized(e){

        //console.log("App.vue::onLeftPaneResized ",e);
    },
    onEditExternalText(t,target){
      if (target === 'tears-editor-vertical'){
        this.leftTabIndex = 2;
        bus.$emit('window-resize');
      }
    },
    loadFile(path, extraMsg) {
        extraMsg = (typeof extraMsg === "undefined") ? "" : extraMsg;
        var d = new Date();
        var n = d.getTime();
        console.log("App::loadFile Loading ",n,"" + extraMsg + path);
        bus.socket.send(JSON.stringify({ type: 'load-file', path: path}));
    },
    // Group loadMongo to a SCANIA plugin....
    loadMongoId(id) {
	      bus.socket.send(JSON.stringify({type: 'load-mongo', id: id}));
    },
    // Group next two in a BT backend plugin
    loadGaId(id) {
        console.log("Sending request to back end server id=",id)
	      bus.socket.send(JSON.stringify({type: 'bt-load-ga', path: id}));
    },
    loadLogId(id) {
	      bus.socket.send(JSON.stringify({ type: 'bt-load-log', path: id}));  
    },
     loadMainId(id) {
	      bus.socket.send(JSON.stringify({ type: 'bt-load-ga-main', path: id}));  
    },
  },
    created() {
      var self = this;
      bus.$on('edit-text',self.onEditExternalText);
      bus.$on("new-eval-context-avaliable", function() {
        self.leftTabIndex = 1;
        });
      
      // Handle back-end integration.
      var url = new URL(window.location.href);
      bus.$on("socket-open", function() {
          // TODO: break out into plug-in startup classes!
          
          // BT Startup code
         
          let fmain = url.searchParams.get("main");
          if (fmain !== null){
            self.loadMainId(fmain);
          }
          let log = url.searchParams.get("log");
          if (log !== null){
            self.loadLogId(log);
          } 
          let ga = url.searchParams.get("ga");
          if (ga !== null){
            self.loadGaId(ga);
          }

          // SCANIA Startup code 
          let urlId = url.searchParams.get("id");
          if (urlId !== null){
    	          self.loadMongoId(urlId);
          } else if (log == null){
	          self.loadFile(self.initialPath, "the default .jsondiff: ");
	        }

          console.log("UR called with ga =",ga," and log= ",log);

          this.$nextTick(function() {
            bus.$emit('window-resize');
          });
      });
    }
}
</script>
<style type="text/css">
.tg  {border-collapse:collapse;border-spacing:0;border:none;}
.tg td{font-family:Arial, sans-serif;padding:0px 5px;border-style:solid;border-width:0px;border-left-width:1px;border-right-width:1px;overflow:hidden;word-break:normal;}
.tg th{font-family:Arial, sans-serif;font-weight:bold;padding:0px 5px;border-style:solid;border-bottom-width:1px;border-width:1px;overflow:hidden;word-break:normal;}
.tg .tg-jbkt{font-family:"Courier New", Courier, monospace !important;;color:#00009b;text-align:left;vertical-align:top}
.tg .tg-s268{text-align:left}
.tg .tg-g03a{font-family:"Courier New", Courier, monospace !important;;color:#00009b;text-align:left}
.tg .tg-0lax{text-align:left;vertical-align:top}
.tg .tg-apln{font-family:"Courier New", Courier, monospace !important;;color:#036400;text-align:left;vertical-align:top}
.tg .tg-last{font-family:"Courier New", Courier, monospace !important;; ;text-align:left;vertical-align:top;border-bottom-width:1px}
</style>
<!--
<style>
	body {
		/* background: lightblue */
	}

</style>  -->
