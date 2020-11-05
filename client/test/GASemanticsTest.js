/*
import Vue from 'vue'
import gasemantics from '../js/GASemantics.vue'
import bus from '../js/EventBus.vue'

describe('GASemantics', function() {
  describe('accepts a valid parse tree', function() {
    // This test was moved to ExpressionsTest.js
    xit('(with defines)', function() {
      bus.addSignalForTesting("EngineSpeed");
      bus.addSignalForTesting("TCOVehSpeed");
      bus.addSignalForTesting("SelectorLever");
      var parseTree = {
        "defines":[{"name":"Se","body":[{"lhs":"SelectorLever","operator":">","rhs":"0"}]}],
        "config":{"lhs":"Gear","operator":"==","rhs":"defined"},
        "guard":{"state":{"and":[{"lhs":"EngineSpeed","operator":">","rhs":"1000"},{"def":"Se"}]}},
        "assertion":{"lhs":"TCOVehSpeed","operator":">","rhs":"45","timing":[{"type":"within","unit":"s","value":"3"}]},
        "file":"ga_1_2_3"
      }
      expect(gasemantics.checkValid(parseTree)).toBe(true);
    });
  });

  describe('rejects an ivalid parse tree', function() {
    // This test was moved to ExpressionsTest.js
    xit('(def, but no defines)', function() {
      bus.addSignalForTesting("EngineSpeed");
      bus.addSignalForTesting("TCOVehSpeed");
      var parseTree = {
        "config":{"lhs":"Gear","operator":"==","rhs":"defined"},
        "guard":{"state":{"and":[{"lhs":"EngineSpeed","operator":">","rhs":"1000"},{"def":"Se"}]}},
        "assertion":{"lhs":"TCOVehSpeed","operator":">","rhs":"45","timing":[{"type":"within","unit":"s","value":"3"}]},
        "file":"ga_1_2_3"
      }
      expect(gasemantics.checkValid(parseTree)).toBe(false);
    });
  });
});
*/
