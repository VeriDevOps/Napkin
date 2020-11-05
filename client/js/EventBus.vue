<script>
    import Vue from 'vue'
    import * as Util from './Util.js';
    import * as EvalContext from './EvalContext.js';
    var time;

    const bus = new Vue({
        name: "bus",
        data() {
            return {
                socket: {},
            }
        },
        //TODO: Refactor - the utility methods should probably by in some other module
        /**************************************************************************/
        /* Common utility methods 												  */
        /**************************************************************************/
        methods: {

            //TODO remove....
            getShortName(signal) {
                return Util.getShortName(signal.name);
            },
            // This version of getSignal is used by the expression evaluation.

            getSignal(shortName) {
              EvalContext.getInstance().getSignal(shortName);
            },

            getSignalDataWideSearch(signalName) {

              return  EvalContext.getInstance().getSignalDataWideSearch(signalName);
            },
            getAllSignalNames() {
               return EvalContext.getInstance().getAllSignalNames();
            },
            getXmin() {
                //console.log("Eventbus::getXmin", EvalContext.getInstance().magic_nr);

                return EvalContext.getInstance().xmin;
            },
            getXmax() {
                return EvalContext.getInstance().xmax;
            },
            addConsts(consts) {
                EvalContext.getInstance().setConsts(consts);
            },
            addAliases(aliases) {
                EvalContext.getInstance().setAliases(aliases);
            },
            getEvalContext(){
               return EvalContext.getInstance();
            },
            on_bus_jsondiff(jsondiff){
              let self = this;

              //console.log("EventBus.vue::on_bus_jsondiff populating EvalContext object.",JSON.stringify(EvalContext.getInstance()));

              EvalContext.getInstance().setSignalsFromSagaJSONDIFF(jsondiff);
              //EvalContext.getInstance().dumpToConsole();
              //console.log("EventBus.vue:: emitting: 'new-eval-context-avaliable' ");
              //console.table(EvalContext.getInstance().getExposedInternalSignalStructure());

              self.$emit('new-eval-context-avaliable', EvalContext.getInstance().getExposedInternalSignalStructure());

              self.$emit('clear-plots');
            },

        },
        created() {
            var self = this;

            //self.evalContext = new EvalContext.EvalContext();

            //self.evalContext = EvalContext.getInstance();

            self.socket = new WebSocket("ws://" + window.location.hostname + ":4001");
            self.socket.binaryType = "arraybuffer";

            self.socket.onopen = function(e) {
                console.log("The socket is open");

                time = Date.now();
                self.socket.send(JSON.stringify({
                    type: 'check-roundtrip'
                }));

                self.$emit('socket-open');
            };

            // Whenever the FileBrowser has loaded and converted a new Log-File:
            self.$on('jsondiff-loaded', self.on_bus_jsondiff);


            self.socket.onclose = function(c) {
                console.log("The socket has closed");
            };

            self.socket.onmessage = function(e) {
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
