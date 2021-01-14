<script>
    import Vue from 'vue'
    import * as Util from './Util.js';
    import * as EvalContext from './EvalContext.js';
    import FileFormats from  './FileFormats.js';
    var time;

    const bus = new Vue({
        name: "bus",
        data() {
            return {
                socket: {},
                serverListening:false,
                listeners:{},
                logfile_parts : "" // Used for loading large log files in chunks to not crasch firefox....
            }
        },
        methods: {
            addListener(eventType, f){
                var self = this;
                self.listeners[eventType] = f;
            },
            on_bus_jsondiff(jsondiff){
              let self = this;
              var ff = new FileFormats.JSONDIFF();
              // Server files always clearContext
              var signals = ff.load(jsondiff,"",false);
              EvalContext.getInstance().clearContext();
              EvalContext.getInstance().mergeSignals(signals,false);
              self.$emit('new-eval-context-avaliable', EvalContext.getInstance().getExposedInternalSignalStructure());
            },

        },
        created() {
            var self = this;
            self.socket = new WebSocket("ws://" + window.location.hostname + ":4001");
            self.socket.binaryType = "arraybuffer";
            self.socket.onopen = function(e) {
                console.log("The socket is open");

                time = Date.now();
                self.socket.send(JSON.stringify({
                    type: 'check-roundtrip'
                }));
                self.serverListening = true;
                self.$emit('socket-open');
            };

            // Whenever the FileBrowser has loaded and converted a new Log-File:

            self.$on('jsondiff-loaded', self.on_bus_jsondiff);


            self.socket.onclose = function(c) {
                console.log("The socket has closed");
                self.serverListening = false;
            };

            self.socket.onmessage = function(e) {
                //console.log("EventBus::onSocketMessage ", e)
                if (typeof e.data === "string") {
                    var jsonResponse = JSON.parse(e.data);

                    if (jsonResponse.hasOwnProperty("type")) {
                        if (jsonResponse["type"] === "file" &&
                            jsonResponse.hasOwnProperty("data")) {

                            self.$emit('jsondiff-loaded', jsonResponse["data"]);
                        } else if (jsonResponse["type"] === "save-resp") {
                            self.$emit('save-resp', jsonResponse["message"]);
                        } else if (jsonResponse["type"] === "resp-roundtrip") {
                            time = Date.now() - time;
                            console.log("Round-trip time: " + time + " ms");
                        } else if (jsonResponse["type"] === "invalid-config") {
                            self.$emit('invalid-config', jsonResponse["value"]);
                        
                        } else if (jsonResponse["type"] === "ga-text") {
                            self.$emit('edit-text', "",'tears-editor-horizontal',true,false);
                            self.$emit('edit-text', jsonResponse["data"],'tears-editor-vertical',true,false);
                        } else if (jsonResponse["type"] === "bt-log-part") {
                            self.logfile_parts += jsonResponse["data"];
                            // TODO assert that each part refers to the same file being transferred
                         } else if (jsonResponse["type"] === "bt-log-complete") {
                             let fformatid = jsonResponse["formatid"]
                             if (fformatid == undefined)
                                        fformatid = 1
                             let fname = jsonResponse["filename"]
                             console.log("Loading ",fname," as format nr",fformatid)
                             let formatter = FileFormats.getFormat(fformatid);  
                              
                             var signals = formatter.load( self.logfile_parts, fname, true);
                             self.logfile_parts = ""
                             //console.log("Got signals")
                             
                             EvalContext.getInstance().forceUnitTestSignals(signals);;
                             EvalContext.getInstance().updateShortNames();
                             EvalContext.getInstance().updateRange();
                             //console.table(signals);
                             bus.$emit('new-eval-context-avaliable', EvalContext.getInstance().getExposedInternalSignalStructure());
                         } else if (jsonResponse["type"] === "ga-main") {
                                //console.log("Receiving some GA-Main-Data",jsonResponse["data"])
                                let gaText = jsonResponse["data"];
                                let fname  = jsonResponse["filename"]
                                let defBlock =  {
                                content:gaText,
                                fileName: self.definitionFile,
                                active:true
                                }
                                EvalContext.getInstance().setDefaultDefinitionBlock(defBlock);
                         }
                         
                        // Non standard requests have to be registered before
                        console.log("Eventbus::socket::onmessage Non standard reply from server")
                        if (!undefined == self.listeners[jsonResponse["type"]]){
                            self.listeners[jsonResponse["type"]](jsonResponse);
                        }
                    }
                }
            };

            self.$on('signal-list-updated', function(signals = undefined) {
               if(signals != undefined){
                // Note that the signals argument is ONLY sent from the
                // unit tests. Regular code should NOT send the signal list.
                 EvalContext.getInstance().forceUnitTestSignals(signals);
               }
               EvalContext.getInstance().updateShortNames();
               EvalContext.getInstance().updateRange();

            });
            self.$on('karma-unit-test-force-set-signal', function(signals) {
               EvalContext.getInstance().signals = signals;
               EvalContext.getInstance().updateShortNames();
               EvalContext.getInstance().updateRange();

            });

        }//created
    })
    export default bus;
</script>
