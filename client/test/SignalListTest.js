import Vue from 'vue'
import bus from '../js/EventBus.vue'
import signalListVue from '../js/SignalList.vue'

// SignalList has changed a lot these tests do not make sense anymore.
/*
describe('SignalList tests.', function() {
    var signalList;
	  const LOG_FILE_WITH_GEAR = 'test/json/SimpleLogWithGear.jsondiff';
	  const LOG_FILE_WITHOUT_GEAR = 'test/json/SimpleLogWithoutGear.jsondiff';

    beforeAll(function() {
        signalList = new Vue(signalListVue);

        signalList.loadSignals(readJSON(LOG_FILE_WITH_GEAR));
    });

    it('Signal found by its short name', function() {
  		expect(signalList.getSignalIfExists("Gear")).not.toBeNull();
  	});

    it('Signal not found when it is missing', function() {
  		expect(signalList.getSignalIfExists("WheelSpeed")).toBeNull();
  	});

    it('xmax broadcasted', function() {
      spyOn(bus, '$emit');
      signalList.loadSignals(readJSON(LOG_FILE_WITH_GEAR));
      expect(bus.$emit).toHaveBeenCalledWith('xmax', 265.53);
    });
});

*/
