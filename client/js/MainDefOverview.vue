<template>
<div id="maindefview" style='height: 692px; width:100%;background:yellow resize: inherit;'> 
    <small> Use the "Load " tab in the left pane to load main definition file. Not that this list shows the result of the last successful evaluation.<br><code> {{currentMainFile}}</code> </small><br>
  Filter:<input v-model="filter_text" placeholder="filter"/>  
 	<div id="maindefscroll" style='height:940px;overflow: auto;'>
     <b-table small inline striped hover sticky-header="300px" stacked=false :items="filteredItems" :fields="fields" >


    
      </b-table>    
  
	</div>
</div>
</template>

<script>
import bus from "./EventBus.vue"
import * as EvalContext from './EvalContext.js';

export default {
	name: 'maindefview',
  components: {
   
  },
	data() {
		return {
       fields: [

         { label:"Identifier",
           key: 'identifier',
           sortable: true
         },
         { label:"Definition",
           key: 'source',
           sortable: true,
         }
         /*,
          { label:"DefType",
            key: 'defType',
            sortable: true
          },
          { label:"Type",
             key: 'type',
             sortable: true
           },
         
         
           { label:"Scope",
           key: 'scope',
           sortable: true,
         }*/
       ],
       items: [],//{"deftype":"alias","type":"identifier","identifier":"MWT_MIO_S_Leading_trainset_redundant","value":"[semantics wrapper for Tears2Grammar]","scope":"global"},{"deftype":"alias","type":"identifier","identifier":"MWT_MIO_S_Leading_trainset_primary","value":"[semantics wrapper for Tears2Grammar]","scope":"global"},{"deftype":"def","type":"Intervals","identifier":"cab_A2_leading","value":"[semantics wrapper for Tears2Grammar]","scope":"global"},{"deftype":"def","type":"Intervals","identifier":"cab_A1_leading","value":"[semantics wrapper for Tears2Grammar]","scope":"global"},{"deftype":"alias","type":"identifier","identifier":"MWT_standstill","value":"[semantics wrapper for Tears2Grammar]","scope":"global"}]
       filter_text:"",
       currentMainFile: " No main definition file used."
  	}//return
  },
  computed: {
	   
      filteredItems:function(){
        var self = this
        var fa = self.filter_text.split(" ");
        
        return  self.items.filter(function(definition){
                return  (self.filter_text.length < 1) ||
                         self.match_filter(fa,definition.identifier) ||
                         self.match_filter(fa,definition.source);
        })
		 
      } 
       
       
      
	}, //computed
  watch: {
  //    items(newVal, oldVal) {
  //      console.log("Unittest.vue::watch, item changed",JSON.stringify(newVal),JSON.stringify(oldVal));
  //    },
  },
	methods: {
    match_filter:function(fa,signame){
			var len = fa.length;
			for(var i = 0; i < len ; i++){
					if((signame.toLowerCase().indexOf(fa[i].toLowerCase()) == -1))
						return false;
      }//for
      
			return true;
		},
    on_window_resize(){
        
      let self = this;

      var leftPane      = document.getElementById('left-pane')
      var rightPane     = document.getElementById("right-pane");
      var thisContainer =  document.getElementById("maindefscroll");
 
       if((leftPane == null)||
         ( rightPane == null) ||
           thisContainer == null )
            return;

       // Resize the tab-card first
       leftPane.style.height = rightPane.offsetHeight + "px";
       leftPane.style['max-height'] = rightPane.offsetHeight + "px";


       thisContainer.style.height = rightPane.offsetHeight -
                                     thisContainer.offsetTop - 10 + "px";
       
    }
  },
	created() {
		var self = this;
    bus.$on('ga-evaluated', function(evalDataStr) {
          //console.log("MainDefOverview got new evaluation" )
          self.items = []
          EvalContext.getInstance().getMainDefEval().forEach(e => {
               
                self.items.push(
                                { 
                                  deftype:e.deftype,
                                  type:e.type,
                                  identifier:e.identifier,
                                  source : e.value.sourceString ,
                                  scope:e.scope
                                });

           });//foreach
        var ctx = EvalContext.getInstance().getDefaultDefinitionBlock()
         
        if (ctx && ctx.active){
          self.currentMainFile =  ctx.fileName
        }
        else{
          self.currentMainFile =  " No main definition file used."
        }
            
    });
    bus.$on('new-eval-context-avaliable', function(_data) {
             //console.log("MainDefOverview new eval context, resetting the main def" )
             self.items = [];
         });
    bus.$on('window-resize'    , self.on_window_resize); // i.e GUI resize
	}
 
}
</script>

<style>
 

</style>
