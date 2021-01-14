import Vue from 'vue'
import VueWorker from 'vue-worker';
Vue.use(VueWorker);

import BootstrapVue from 'bootstrap-vue'
Vue.use(BootstrapVue)

require("!style-loader!css-loader!../assets/dygraph.css");
require('vue-context/dist/css/vue-context.css');
require('bootstrap/dist/css/bootstrap.min.css');
import App from './App.vue'

//import { VueContext } from 'vue-context';
//Vue.use(VueContext)

import { TabsPlugin } from 'bootstrap-vue'
Vue.use(TabsPlugin)


import { AlertPlugin } from 'bootstrap-vue'
Vue.use(AlertPlugin)

import { ButtonGroupPlugin } from 'bootstrap-vue'
Vue.use(ButtonGroupPlugin)

import { ButtonPlugin } from 'bootstrap-vue'
Vue.use(ButtonPlugin)

import { FormFilePlugin } from 'bootstrap-vue'
Vue.use(FormFilePlugin)

import { ModalPlugin } from 'bootstrap-vue'
Vue.use(ModalPlugin)

import { FormInputPlugin } from 'bootstrap-vue'
Vue.use(FormInputPlugin)

import { FormGroupPlugin } from 'bootstrap-vue'
Vue.use(FormGroupPlugin)

import { TablePlugin } from 'bootstrap-vue'
Vue.use(TablePlugin)

import { FormSelectPlugin } from 'bootstrap-vue'
Vue.use(FormSelectPlugin)

import { FormCheckboxPlugin } from 'bootstrap-vue'
Vue.use(FormCheckboxPlugin)

import { FormTextareaPlugin } from 'bootstrap-vue'
Vue.use(FormTextareaPlugin)

import { LayoutPlugin } from 'bootstrap-vue'
Vue.use(LayoutPlugin)

 
new Vue({
  el: '#app',
  render: h => h(App)
})
window.onbeforeunload = function() {
  return "Are you sure you want to navigate away?";
}
