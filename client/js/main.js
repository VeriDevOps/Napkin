import Vue from 'vue'
import VueWorker from 'vue-worker';
import BootstrapVue from 'bootstrap-vue'

require("!style-loader!css-loader!../assets/dygraph.css");
require('bootstrap/dist/css/bootstrap.min.css')
import App from './App.vue'
import { Layout } from 'bootstrap-vue/es/components';

Vue.use(Layout);
Vue.use(VueWorker);

new Vue({
  el: '#app',
  render: h => h(App)
})
window.onbeforeunload = function() {
  return "Are you sure you want to navigate away?";
}
