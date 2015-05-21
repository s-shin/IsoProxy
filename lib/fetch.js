/**
 * WHATWG fetch polyfill for client side.
 */

"use strict";

var _Object$defineProperty = require("babel-runtime/core-js/object/define-property")["default"];

_Object$defineProperty(exports, "__esModule", {
  value: true
});

var fetch;

if (typeof window !== "undefined") {
  if (!window.fetch) {
    require("whatwg-fetch");
  }
  fetch = window.fetch;
}

exports["default"] = fetch;
module.exports = exports["default"];