<template>
<div id="app" width="100%">
  <!--  <h1>{{ msgWelcome }}</h1>
    <p>{{ msgSelectSignals }}</p>-->
    <b-container fluid style="width:100%;padding-right: 0px; padding-left: 0px;">
          <b-row>
          <b-col md="5" style="vertical-align: top;padding-right: 0px; padding-left: 0px;">
            <b-card no-body >
                  <b-tabs card v-model="tabIndex">
                      <b-tab title="Signal List" style="" active>
                          <signallist></signallist>
                      </b-tab>
                      <b-tab title="Load Files" >
                           <filebrowser :buttontext="buttonText" :initialPath.sync="path" :separator="separator"></filebrowser>
                      </b-tab>
                      <!--  <b-tab title="X" style="width:0pt;"@onselect="console.log('X selected')">
                      </b-tab>-->
                   </b-tabs>
            </b-card>
          </b-col>
          <b-col md="7" style="overflow:auto;vertical-align:top;padding-right: 0px; padding-left: 0px;">
            <b-card no-body>
                  <b-tabs card>
                    <b-tab title="Signal Editor" active>
                         <signaleditor2></signaleditor2>
                     </b-tab>
                    <!--  <b-tab title="Signal Editor">
                          <signaleditor></signaleditor>
                      </b-tab>
                     <b-tab title="Signal Overview">
                        <img src="./signal_overview.png" height="400px"> </img>
                      </b-tab> -->
                   </b-tabs>
            </b-card>
          </b-col>

        </b-row>
        <b-row style="">
          <gaeditor style="width:100%;"></gaeditor>
        </b-row>
          <plotarea></plotarea>
          <embed width ="100%" height="700px" src="/client/documentation.pdf" type="application/pdf">
     </b-container>

</div>
</template>

<script>
import bus from './EventBus.vue'
import filebrowser from './FileBrowser.vue'
import signallist from './SignalList.vue'
import signaleditor from './SignalEditor.vue'
import signaleditor2 from './SignalEditor2.vue'
import plotarea from './PlotArea.vue'

import gaeditor from './GAEditor.vue'

import bTabs from 'bootstrap-vue/es/components/tabs/tabs';
import bTab from 'bootstrap-vue/es/components/tabs/tab';
import bCard from 'bootstrap-vue/es/components/card/card';

export default {
  name: 'app',
  components: {
    filebrowser,
    signallist,
    signaleditor2,
	  plotarea,
	  gaeditor,
    bCard,
    bTabs,
    bTab
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
        "tabIndex" : 0
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
	  loadFile(path, extraMsg) {
		  extraMsg = (typeof extraMsg === "undefined") ? "" : extraMsg;
      var d = new Date();
      var n = d.getTime();
		  console.log("App::loadFile Loading ",n,"" + extraMsg + path);
		  bus.socket.send(JSON.stringify({ type: 'load-file', path: path}));
	  },
      loadMongoId(id) {
	  bus.socket.send(JSON.stringify({type: 'load-mongo', id: id}));
      },
  },
  created() {
      var self = this;
      bus.$on("new-eval-context-avaliable", function() {
          self.tabIndex = 0;
      });
      var url = new URL(window.location.href);
      let urlId = url.searchParams.get("id");
      if (urlId !== null)
      {
    	  bus.$on("socket-open", function() {
    	      self.loadMongoId(urlId);
          //console.log("argument",this.$router.currentRoute.query)
    	  });
      }
      else
      {
	       bus.$on("socket-open", function() {
	      self.loadFile(self.initialPath, "the default .jsondiff: ");
	  });
      }
  }
}
</script>

<style>
	body {
		/* background: lightblue */
	}

</style>
