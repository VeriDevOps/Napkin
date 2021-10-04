<template>
<div   v-on:keydown.ctrl.enter="evaluateAll($event,items.item)">
<small> Use the "Load Signals" tab in the left pane to load signal files.  </small><br>
<table><tr><td>
	<label for="unitLoader" class="button">Load Unit Tests</label>
	<input size="sm"
		id="unitLoader" ref="unitLoader" type="file"
			@change="loadUnitTests()" accept=".js, .txt"
			  style="display:none"/>

  <b-button size="sm" @click=onDownloadTests variant="success"> Download Unit Tests  </b-button>

</td>
<td align="right">  <b-button size="sm" @click=evaluateAll variant="success"> EVALUATE ALL TESTS  </b-button>

</td>
</tr></table>
<div id="unittest-table-scroll" style='background:white;height:940px;overflow: auto; padding-left:0px;'>
  <b-table   small striped hover :items="items" :fields="fields">
        <template  align="center" v-slot:cell(actionReq)="items">
                 <input
                        type="checkbox"
                        style=" -moz-transform: scale(1.8);"

                        v-model="items.actionReq"
                      />

          </template>

          <template  v-slot:cell(suspicious)="items">
                   <input
                          type="checkbox"
                          style=" -moz-transform: scale(1.8);"
                          v-model="items.suspicious"
                        />

            </template>

          <template v-slot:cell(tears_expression)="rows">
                         <b-form-textarea
                         placeholder="Enter T-EARS expression here..."
                                style="width:100%;"
                                max-rows = "30"
                                rows = 0
                                v-model="rows.item.tears_expression"


                                v-on:keyup = evaluateAll($event,rows.item)
                              />
          </template>
          <template v-slot:cell(tears_description)="rows">
                         <b-form-textarea
                         placeholder="Enter description expression here, then choose OK or SX=syntax error, or EX = (syntax ok but did not evaluate)"

                                rows=0
                                style="width:100%;"
                                v-model="rows.item.tears_description"

                              />
          </template>

          <template v-slot:cell(expected)="rows" >
               <b-form-select   style="width:5em;"
                                v-model="rows.item.expected"
                                :options="['SX','EX','OK']"
                                v-on:input="evaluateAll($event,rows.item)"

                >

              </b-form-select>
          </template>

          <template     style="width:100%;" slot="row-details" slot-scope="row">
              <b>  <pre>{{row.item.tears_expression}}</pre></b>
              <hr>
                <pre>{{row.item.res}}</pre>
          </template>

  </b-table>
<b-button size="sm" @click=addTest variant="success"> Add Test  </b-button>
</div>

 
<vue-context id="CtxMenu" ref="menu">
      <li>
          <a href="#" @click.prevent="onClick('details')">Show/Hide Details</a>
      </li>
       <li>
           <a href="#" @click.prevent="onClick('re-eval')">Re-Evaluate</a>
       </li>
       <li>
           <a href="#" @click.prevent="onClick('subplots')">Show Subplots</a>
       </li>
       <li>
           <a href="#" @click.prevent="onClick('edit-v')">Copy file to Left Pane Editor</a>
       </li>
       <li>
           <a href="#" @click.prevent="onClick('edit-h')">Copy file to Snippet Editor</a>
       </li>
       <hr>
       <li>
           <a href="#" @click.prevent="onClick('remove')">Remove G/A file</a>
       </li>
   </vue-context>

 
</div>
</template>

<script>
import bus from "./EventBus.vue"
import * as EvalContext from './EvalContext.js';
import { VueContext } from 'vue-context';
var tears = require('./Tears.js');


export default {
	name: 'unittest',
  components: {
    VueContext
  },
	data() {
		return {
       definitionFile:"No definition file loaded.",
       definitions:"// This should contain common def and aliases",
       files: [],
       currentCtxEntry:undefined, //If we select a row for context menu...


       // ID TEARSEXPR COMMENT EXPECTED RESULT

       fields: [

         { label:"Act",
           key: 'actionReq',
           sortable: true
         },
          { label:"Sus",
            key: 'suspicious',
            sortable: true
          },
          { label:"T-EARS Expression",
             key: 'tears_expression',
             sortable: true
           },
         { label:"Description",
           key: 'tears_description',
           sortable: true
         },
         { label:"Expected ",
           key: 'expected',
           sortable: true,
         }
       ],
       items: [
       ]


  	}//return
	},
  watch: {
  //    items(newVal, oldVal) {
  //      console.log("Unittest.vue::watch, item changed",JSON.stringify(newVal),JSON.stringify(oldVal));
  //s    },
  },
	methods: {
    addTest(){
      this.items.push(   { tears_expression:"",tears_description:"", expected:"OK",_rowVariant:'none',dirtyFlag : true});

    },
    evaluateAll(e,item){
      bus.$emit('focus-changed-to',1234); // Take out editors!
      console.log("evaluateAll",item)
      if(typeof item !== 'undefined')
        var items = [item]
      else items = this.items;

    items.forEach(item => {
        let evaluation = tears.evaluate_tears_expression( item.tears_expression, false, true);
        let expected = item.expected;
        item.res = evaluation;
        console.log("evaluating ", item.tears_expression)
        item.dirtyFlag = false;
        let res = ""

        switch (evaluation.status) {
            case 'FAIL_SYNTAX':
                 res =  "SX";
                 break;
            case 'FAIL_EVAL':
                 res = "EX";
                 break;
            case 'OK':
                 res = "OK";
            break;
        }

         if(res != expected){
           console.log("res != expected ", item)
           item._rowVariant='danger';
           item.res = evaluation;
           item._showDetails = true;

         }else {

                 item._rowVariant='none';
                 item._showDetails = false;
                 item._cellVariants= {expected: 'success' }

         }

       //  if(res === "OK")   res =   "✔";  // cosmetic


       }
     );
     this.$forceUpdate();
    },
    handleChangedTears(e,line){
               console.log("New value " ,e,line)

    },
    loadUnitTests(){

    },
    onDownloadTests(){
         var fileName = "saga_unittests.js";
         var element = document.createElement('a');
         element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.items)));
         element.setAttribute('download', fileName);
         element.style.display = 'none';
         document.body.appendChild(element);
         element.click();
         document.body.removeChild(element);
    },
    loadUnitTests() {
      var self = this;
      console.log("LOADING",self.$refs.unitLoader.files[0].name)

      //bus.$emit('started-loading-data',self.leftToLoad);
      var reader = new FileReader();
      reader.onload = function(e) {
        self.items = JSON.parse(e.target.result);
        console.log("LOADED",e.target.result)


      }; // READER callback end
      reader.readAsText(self.$refs.unitLoader.files[0]);

    },
    on_window_resize(){

      let self = this;

      var leftPane      = document.getElementById('left-pane')
      var rightPane     = document.getElementById("right-pane");
      var thisContainer = document.getElementById("ga-table-scroll");

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
      
        var helpPane     = document.getElementById("help-pane4");
        helpPane.style['max-height'] = rightPane.offsetHeight -70 + "px";
        helpPane.style['height'] = rightPane.offsetHeight -70 + "px";
	},
	created() {
		var self = this;

  //  bus.$on('window-resize'    , self.on_window_resize); // i.e GUI resize


	}
}
}
</script>

<style>
.button {
	display: inline-block;
	background:#28a745;
	border-radius: 4px;


	font-size: 14px;
	color: white;

	cursor: pointer;

}
.button:hover{
  	background:#218838;
}

.garow {
   font-weight: normal;
}
.gaOK {
   font-weight: bold;
  background:#28a745;
}
.gaNotRun {
   font-weight: normal;
  background:yellow;
}
.gaSyntaxFail {
   font-weight: normal;
  background:pink;
}
.gaFailed {
   font-weight: normal;
  background:red;
}

#galist_table {
    font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
    border-collapse: collapse;
  font-size: 12px;
}

#galist_table td, #siglist_table th {
    border: 1px solid #ddd;
    padding: 4px;

}

#galist_table tr:nth-child(even){background-color: #f2f2f2;   }

#galist_table tr:hover {background-color: #ddd;   }

#galist_table th {
    padding-top: 2px;
    padding-bottom: 2px;
    text-align: left;
    background-color: #4CAF50;
    color: white;
    font-size: 12px;
}

</style>
