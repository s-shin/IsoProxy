"use strict";

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _toConsumableArray = require("babel-runtime/helpers/to-consumable-array")["default"];

var _Object$defineProperty = require("babel-runtime/core-js/object/define-property")["default"];

var _Promise = require("babel-runtime/core-js/promise")["default"];

var _interopRequireDefault = require("babel-runtime/helpers/interop-require-default")["default"];

_Object$defineProperty(exports, "__esModule", {
  value: true
});

var _jsonrpc = require("./jsonrpc");

var _jsonrpc2 = _interopRequireDefault(_jsonrpc);

var _fetch = require("./fetch");

var _fetch2 = _interopRequireDefault(_fetch);

/**
 * Isomorphic API Proxy
 */

var IsoProxy = (function () {

  /**
   * @param {Object} opts
   * @param {string} opts.root Root url path, that is beginning with "/" and NOT end with "/".
   * @param {boolean} opts.isServer Server mode or not.
   */

  function IsoProxy() {
    var opts = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, IsoProxy);

    this.methods = {};
    this.children = {};
    var _opts$root = opts.root;
    var root = _opts$root === undefined ? "" : _opts$root;
    var _opts$isServer = opts.isServer;
    var isServer = _opts$isServer === undefined ? true : _opts$isServer;

    this.root = root;
    this.isServer = isServer;
  }

  _createClass(IsoProxy, [{
    key: "ns",

    /**
     * @access public
     * @param {string} ns Namespace.
     * @return {IsoProxy} Child proxy instance.
     */
    value: function ns(_ns) {
      if (!this.children[_ns]) {
        this.children[_ns] = new IsoProxy({
          root: this.createPath(_ns),
          isServer: this.isServer
        });
      }
      return this.children[_ns];
    }
  }, {
    key: "traverse",

    /**
     * Traverse all methods for routing in server.
     *
     * @access public
     * @param {function(urlPath: string, processJsonrpcRequest: function(jsonrpcRequest: Object): Promise): null} callback
     */
    value: function traverse(callback) {
      var _this = this;

      var callCallback = function callCallback(path, method) {
        callback(path, function (jsonrpcRequest) {
          console.assert(_this.methods[jsonrpcRequest.method] === method);
          return new _Promise(function (resolve) {
            _Promise.resolve(method.apply(undefined, _toConsumableArray(jsonrpcRequest.params))).then(function (result) {
              resolve(_jsonrpc2["default"].createResponse(null, result));
            })["catch"](function (error) {
              // resolve() is used because the error is sent to client.
              resolve(_jsonrpc2["default"].createResponse(error));
            });
          });
        });
      };
      for (var _name in this.methods) {
        callCallback(this.createPath(_name), this.methods[_name]);
      }
      for (var _name2 in this.children) {
        this.children[_name2].traverse(callback);
      }
    }
  }, {
    key: "api",

    /**
     * Get isomorphic method collection.
     *
     * @access public
     * @return {Object} Isomorphically wrapped methods not including ones in namespaces.
     * @example
     * proxy.methods.add = (x, y) => x + y;
     * proxy.api; // => {add: (x, y) => { (isomorphic blackbox) }}
     */
    get: function () {
      return this.isServer ? this.getServerApi() : this.getClientApi();
    }
  }, {
    key: "getServerApi",

    /**
     * @access private
     */
    value: function getServerApi() {
      var _this2 = this;

      return this.createApi(function (name) {
        return function () {
          var _methods;

          for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
            params[_key] = arguments[_key];
          }

          // call directly
          return _Promise.resolve((_methods = _this2.methods)[name].apply(_methods, params));
        };
      });
    }
  }, {
    key: "getClientApi",

    /**
     * @access private
     */
    value: function getClientApi() {
      var _this3 = this;

      return this.createApi(function (name) {
        return function () {
          for (var _len2 = arguments.length, params = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            params[_key2] = arguments[_key2];
          }

          return new _Promise(function (resolve, reject) {
            // RPC
            (0, _fetch2["default"])(_this3.createPath(name), {
              method: "post",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(_jsonrpc2["default"].createRequest(name, params))
            }).then(function (response) {
              if (!response.ok) {
                reject(response.error());
                return null;
              }
              return response.json();
            }).then(function (response) {
              if (response.error) {
                return reject(response.error);
              }
              resolve(response.result);
            });
          });
        };
      });
    }
  }, {
    key: "createPath",

    /**
     * @access private
     */
    value: function createPath(name) {
      return "" + this.root + "/" + name;
    }
  }, {
    key: "createApi",

    /**
     * @access private
     */
    value: function createApi(createMethod) {
      var api = {};
      for (var _name3 in this.methods) {
        api[_name3] = createMethod(_name3);
      }
      return api;
    }
  }]);

  return IsoProxy;
})();

exports["default"] = IsoProxy;
module.exports = exports["default"];

/**
 * API method container.
 *
 * @access public
 * @type {Object}
 * @example
 * proxy.method.add = (x, y) => x + y;
 */

/**
 * @access private
 */