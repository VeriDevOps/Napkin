require('bootstrap/dist/css/bootstrap.min.css')
import Vue from 'vue'
import bus from '../js/EventBus.vue'
import editorVue from '../js/GAEditor.vue'
import VueWorker from 'vue-worker';
import { Layout } from 'bootstrap-vue/es/components';
Vue.use(VueWorker);

describe('GAEditor tests.', function() {
    var editor;
    var gearSignal = {
        name: 'asm_mdl_env.MDL_PAR.ManualControl.Gear',
        data: {
            xAxis: -0.01000000001,
            values: 0
        }
    };
    var gearboxInReverseSignal = {
        name: 'central1_can2\/BusSystems\/CAN\/Yellow_Main\/TI_T\/RX\/GearboxInReverse',
        data: {
            xAxis: -0.01500000001,
            values: 0
        }
    };

    beforeAll(function() {
        document.body.insertAdjacentHTML(
			'afterbegin',
			'<div id="gaeditor">' +
				'<b>GA-editor:</b>' +
				'<div id="tears-editor"></div>');
		document.body.insertAdjacentHTML(
			'beforeend',
			'<div id="param-editor"></div>');
        editor = new Vue(editorVue);
		editor.$mount();
        // setTextInGAEditor('@ga_1_2_3\n' +
		// 				  'where\n' +
		// 					  '\tGear == defined\n' +
		// 				  'shall\n' +
		// 					  '\tGearboxInReverse == 1\n' +
		// 				  'within 3s');
    });



    describe('Editor highlighting.', function() {
        beforeEach(function() {
            editor.clearMarkings();
        });
/* REMOVED
    	it('"signalExists"-emission is handled in GAEditor', function() {
    		spyOn(editor, 'handleSignalExists');
    		bus.$emit('signalExists', true, gearSignal, 5);
    		expect(editor.handleSignalExists).toHaveBeenCalledWith(true, gearSignal, 5);
    	});

        it('All editored signals were loaded, no highlight', function() {
            editor.handleSignalExists(true, gearSignal, 2);
            editor.handleSignalExists(true, gearboxInReverseSignal, 4);
            expect(Object.keys(editor.markings).length).toEqual(0);
        });

        //TODO: Make it work again (Implement FileExpression and ConfigExpression)
        xit('Missing signal leads to highlight', function() {
            editor.handleSignalExists(false, gearSignal, 2);
            editor.handleSignalExists(true, gearboxInReverseSignal, 4);
            expect(Object.keys(editor.markings).length).toEqual(1);
        });
        */

    });

    // function setTextInGAEditor(text) {
	// 	document.getElementById('gaeditor');
	// 	document.body.insertAdjacentHTML(
	// 		'afterbegin',
	// 			'<b>GA-editor:</b>' +
	// 			'<div id="tears-editor">' + text + '</div>');
	// 	editor.getTearsSession().setValue(text);
	// }
});
 
