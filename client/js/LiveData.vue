<template>
<div>
 
 
 <table>
   <tr>
        <td width=20%>
                <table align="center">
                        <tr align="center"> <b-button  variant='success' @click='onGetUsedSignals' >  Get Used Signals </b-button>
                        </tr><tr align="center">
                        or..
                        </tr><tr align="center">
                        <label for="sigListLoader"  class="button">Select Signal List file</label>
                        <input
                        id="sigListLoader" ref="sigListLoader" type="file"
                        @change="updateSignalFileSelection()" accept=".txt"
                        multiple="single" style="display:none">
                         </tr><tr align="center">
                        <i>{{signalFile}}</i>
                        </tr>
                </table>
        </td><td width=10%>
                <b-form-checkbox
                        id="checkbox-ccu1"
                        v-model="use_ccu1"
                        name="CCU1"
                        value="CCU1"
                        unchecked-value=""
                        disabled: true >
                CCU1
                </b-form-checkbox>
                <b-form-checkbox
                        id="checkbox-ccu2"
                        v-model="use_ccu2"
                        name="CCU2"
                        value="CCU2"
                        unchecked-value="">
                CCU2
                </b-form-checkbox>
                  
        </td><td>
                <b-form-textarea
                        placeholder="Signal List here...."
                        style="width:100%; font-size: 8pt;"
                        max-rows = "3"
                        rows = 5
                        v-model="signalList"
                        wrap ="off"
                        no-resize
                />
        </td>
  </tr>
</table>
<hr>
          <b-form inline>
            <b-form-select   style="width:7em;"
                                v-model="connType"
                                :options="['TCP/IP','RS232']"

                />  
            &nbsp;
          <label class="mr-sm-2" for="addr-input">{{arg1_label}}</label>
              &nbsp;
            <b-form-input
                v-if="connType=='TCP/IP'"
                style="width:7em;"
                id="addr-input"
                v-model="addr"
                required
                placeholder="10.0.0.1"
              ></b-form-input>
               &nbsp;

              <label class="mr-sm-2" for="port-input">{{arg2_label}}</label>
              <b-form-input
               style="width:7em;"
                id="port-input"
                v-model="port"
                required
                placeholder="9001"
              ></b-form-input>
               
 </b-form>
 <hr>
 <b-form inline>
          <label class="mr-sm-2" for="max-duration">Max Duration</label>
   
            <b-form-input
                id="max-duration"
                style="width:5em;"
                v-model="max_duration"
                required
                placeholder="300s"
              ></b-form-input>
               &nbsp; &nbsp; &nbsp; &nbsp;
              <label class="mr-sm-2" for="update-rate">Update Rate</label>
             
              <b-form-input
                id="update-rate"
                 style="width:5em;"
                v-model="update_rate"
                required
                placeholder="2s"
              ></b-form-input>
                <b-button pill :variant='startButtonVariant' @click='onStartSubscription' >  Start </b-button>
                <b-button pill :variant='stopButtonVariant'  @click='onStopSubscription'>   Stop </b-button>
      </b-form>
  <hr>
 
 


<hr>
Debug:
  <b-form-textarea
        placeholder="Debug output ...."
        style="width:100%;"
        max-rows = "3"
        rows = 3
        v-model="debugMessages"
      />
</div>

</template>

<script>
import bus from "./EventBus.vue"
 
const FileFormats = require('./FileFormatStream.js')
 
import * as EvalContext from './EvalContext.js';
import axios from 'axios';   

var tears = require('./Tears.js');


export default {
	name: 'livedata',
  components: { 
     
  },
 
  data() {
               
        return {
                max_duration:"300s",
                update_rate:"2s", 
                signalFile:"no file selected",
                signalList:  "MWT.TC_C_TC_C_Sup_T3.TC_BI_CCUS_S_RdyToRn_A1\nMWT.TC_BI_iCCUS_AToCCUO.TC_BI_CCUS_X_LifeSignA",
                startButtonVariant:"success",
                stopButtonVariant:"",
                debugMessages:"",
                        
                port:6001,
                addr:"10.0.0.1",
                
                connType:"TCP/IP",
                sid:null,
                intervalId:null,
                 use_ccu1 : "CCU1",
                use_ccu2 :""
                }
  },
  computed:{
    arg1_label(){
      return "Host"
    },
    arg2_label(){
      return "Port"
    },
    startButtonVariant2(){
      var self = this;
      console.log("computing....")
      return  self.startButtonVariant == 'success' && (self.signaList && self.signalList.len >0)?"success":"";
    },
    signals(){
        var self = this
        var res =[]
        self.signalList.split('\n').forEach(s =>{
            s = s.trim()
            s = "MWT" + s.split('MWT')[1];
            if(self.use_ccu1 == "CCU1")
                res.push("CCU1." + s);
            if(self.use_ccu2 == "CCU2")
                res.push("CCU2." + s);
        })
        return res
    }
  },
  watch:{
    signalList(val){
      var self = this
      self.startButtonVariant = 'success';
    }
  },
        methods: {

                onGetUsedSignals(){
                        var self = this
                        var sigs = tears.getUsedSignals("dummy");
                        if(sigs.length == 10){
                                alert("No current signal list. Have you evaluated an expression?")
                                return
                        }
                        self.signalList = "";
                        sigs.forEach(s => {
                                self.signalList += '\n' + s;
                                console.log("Adding ",s, " to signal list");
                        })
                        if(self.signalList.length>0 && self.signalList[0] == '\n')
                                self.signalList = self.signalList.substr(1)  // remove first newline
                },
                updateSignalFileSelection() {

                var self = this;
                
                self.signalFile = self.$refs.sigListLoader.files[0].name;
                //console.log("LiveView.vue::updateSignalFileSelection", self.signalFile)
                var reader = new FileReader();
                reader.onload = function(e) {
                        self.signalList = e.target.result;
                        //Send requenst to server
                        //console.log("LiveView.vue::updateSignalFileSelection", self.signalList)
                        self.startButtonVariant = 'success'
                
                }; // READER callback end
                reader.readAsText(self.$refs.sigListLoader.files[0]);
                },
    onStartSubscription(){
        var self = this
        if(self.startButtonVariant != 'success') return
        self.startButtonVariant = ''
        self.stopButtonVariant = 'success'
   
        self.debugMessages +='Connecting and Setting up subscription. \n'

        var args =  
            'type=' + self.connType    + '&' + 
            'arg1=' + self.addr        + '&' +
            'arg2=' + self.port        + '&' +
            'logger=t4'                + '&' + 
            'signals=' +  JSON.stringify(self.signals)

        console.log("Setting up subscription as ",args);   
        /* TODO switch to POST instead
        axios({
                method: 'post',
                url: self.DCUTermIP  + "/connect",
                data: {
                     type: self.connType, 
                     arg1: self.addr,
                     arg2: self.port,
                     logger:'t4' ,
                     signals: self.signals
                }
        })
        .then
        .except and so on.....
        */
        axios.get('http://192.168.1.122:8090/connect?' + args)
       .then(response => {
               
                // JSON responses are automatically parsed.
                self.debugMessages += "GOT:"

                self.debugMessages += "" + response.data.msg
                console.log("onStartSubscription::response from server",response,self)
                self.sid = response.data.sid // TODO: Double check that we do not have
            
                self.stream = new FileFormats.PolledStream()
                console.log("onStartSubscription:: new ")
                self.sigcache = self.stream.init(self.signals, 5*60);
                bus.$emit('remove-all-manual-plots')
                bus.$emit('new-eval-context-avaliable', EvalContext.getInstance().getExposedInternalSignalStructure());
                //EvalContext.getInstance().dumpToConsole();

                var ival = self.update_rate.trim().substr(0,self.update_rate.length -1)
                self.intervalId = setInterval(self.onPollSubscription, parseInt(ival)*1000)   
        })
    /*   .catch(e => {
                self.debugMessages += "onStartSubscription::VueException:"+ e
                // TODO: let go of failed sid
                self.stopButtonVariant = ''
                self.startButtonVariant = 'success'
                self.sid = null
        })*/
        .then(function(){
            console.log("onStartSubscription:: done...")
        });

      
 
    },
    onPollSubscription(){
        var self = this;
        console.log("LiveData::onPollSubscription:",self)
        self.debugMessages +="."
        axios.get('http://192.168.1.122:8090/get_next_chunk?sid=' + self.sid)
        .then(response => {
              // JSON responses are automatically parsed.
              // TODO: Assert that response.data.sid == self.sid // TODO: Double check that we do not have
              //console.log("onPollSubscription::GOT response from server",response)
              self.stream.update(response.data.updates, self.sigcache)
              //console.log("onPollSubscription::sigdata updated, sending signal")
              
              bus.$emit('edited-signal-updated',self.signals)
              // TODO: Send data to EvalContext as a StreamUpdate
              // TODO: Is this another thread or still the vue one and only thread

              // Send out that the context is updated. (Signal edited?`or complete context? Migth be flickerish
              // if all plots are removed instead of redrawn. Possibly a new event is needed. 'stream_updated'???)
        })
       /*.catch(e => {
             self.debugMessages += "onPollSubscription::VueException:"+ e
              if(self.intervalId) clearInterval(self.intervalId)
             // TODO: let go of failed sid / close connection properly. 
              self.stopButtonVariant = ''
              self.startButtonVariant = 'success'
              self.sid = null
        })*/


    },
    onStopSubscription(){
      var self = this
      if(this.stopButtonVariant != 'success') return
        this.stopButtonVariant = ''
        this.startButtonVariant = 'success'
        this.debugMessages +="Tearing down subscription\n"
        console.log("STOPPING Subscription")
        if (self.intervalId) clearInterval(self.intervalId)

        axios.get('http://192.168.1.122:8090/disconnect?sid=' + this.sid)
       
       .then(response => {
              console.log("LiveView::onStopSubscription:")
              self.debugMessages += "" + response.data.msg 
              // TODO: Assert that response.data.sid == this.sid // TODO: Double check that we do not have
 
        })
       .catch(e => {
             self.debugMessages += ""+ e
             console.log("LiveView::onStopSubscription: Exception ",e)
              
             // TODO: let go of failed sid / close connection properly. 
              this.stopButtonVariant = ''
              this.startButtonVariant = 'success'
              this.sid = null
        })

    },
    on_window_resize(){
      let self = this;

    }
	},
	created() {
		var self = this;
	
    bus.$on('window-resize'    , self.on_window_resize); // i.e GUI resize

	}
}
</script>

<style>

</style>
