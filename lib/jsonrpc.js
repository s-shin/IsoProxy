
/**
 * Simple JSON-RPC compatible request/response creators.
 */
"use strict";

var _Object$defineProperty = require("babel-runtime/core-js/object/define-property")["default"];

_Object$defineProperty(exports, "__esModule", {
  value: true
});

var jsonrpc = {

  createRequest: function createRequest(name, params) {
    return {
      jsonrpc: "2.0",
      id: 1,
      method: name,
      params: params
    };
  },

  createResponse: function createResponse() {
    var error = arguments[0] === undefined ? null : arguments[0];
    var result = arguments[1] === undefined ? null : arguments[1];

    return {
      jsonrpc: "2.0",
      id: 1,
      result: result,
      error: error
    };
  }

};

exports["default"] = jsonrpc;
module.exports = exports["default"];