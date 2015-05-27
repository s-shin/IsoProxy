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

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

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

    var _opts$root = opts.root;
    var root = _opts$root === undefined ? "" : _opts$root;
    var _opts$isServer = opts.isServer;
    var isServer = _opts$isServer === undefined ? true : _opts$isServer;

    this.root = root;
    this.isServer = isServer;
    this.interfaces = {};
    this.implementations = {};
    /**
     * @access public
     */
    this.api = {};
    /**
     * @access public
     * @param {urlPath: function(jsonrpcRequest: Object): Promise): null} callback
     */
    this.routes = {};
  }

  _createClass(IsoProxy, [{
    key: "setInterfaces",

    /**
     * @access public
     * @param {Object} {namespace: {methodName: function}}
     */
    value: function setInterfaces(interfaces) {
      this.interfaces = interfaces;
      this.updateApi();
      this.updateRoutes();
    }
  }, {
    key: "setImplementations",

    /**
     * @access public
     */
    value: function setImplementations(implementations) {
      if (!this.isServer) {
        throw new Error("Implementations are required only in server mode.");
      }
      this.implementations = implementations;
      this.updateApi();
      this.updateRoutes();
    }
  }, {
    key: "updateApi",

    /**
     * @access private
     */
    value: function updateApi() {
      return this.isServer ? this.updateServerApi() : this.updateClientApi();
    }
  }, {
    key: "preprocessMethodDefinitions",

    /**
     * @access private
     */
    value: function preprocessMethodDefinitions(methodDefinitions) {
      if (_lodash2["default"].isArray(methodDefinitions)) {
        // ["add", "sub"] => {add: {}, sub: {}}
        methodDefinitions = _lodash2["default"].reduce(methodDefinitions, function (r, methodName) {
          r[methodName] = {}; // no options
          return r;
        }, {});
      }
      return methodDefinitions;
    }
  }, {
    key: "updateServerApi",

    /**
     * @access private
     */
    value: function updateServerApi() {
      var _this = this;

      this.api = {};
      _lodash2["default"].forEach(this.interfaces, function (methodDefinitions, ns) {
        methodDefinitions = _this.preprocessMethodDefinitions(methodDefinitions);
        _this.api[ns] = {};
        _lodash2["default"].forEach(methodDefinitions, function (methodOpts, methodName) {
          var impl = _lodash2["default"].get(_this.implementations, [ns, methodName]);
          if (impl) {
            // wrap with Promise.
            _this.api[ns][methodName] = function () {
              for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
              }

              return _Promise.resolve(impl.apply(undefined, args));
            };
          } else {
            // mock method.
            _this.api[ns][methodName] = function () {
              for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                args[_key2] = arguments[_key2];
              }

              var argsStr = _lodash2["default"].map(args, function (p) {
                return p.toString();
              }).join(", ");
              throw new Error("" + ns + "." + methodName + "(" + argsStr + ") is called but is not implemented.");
            };
          }
        });
      });
    }
  }, {
    key: "updateClientApi",

    /**
     * @access private
     */
    value: function updateClientApi() {
      var _this2 = this;

      this.api = {};
      _lodash2["default"].forEach(this.interfaces, function (methodDefinitions, ns) {
        methodDefinitions = _this2.preprocessMethodDefinitions(methodDefinitions);
        _this2.api[ns] = {};
        _lodash2["default"].forEach(methodDefinitions, function (methodOpts, methodName) {
          _this2.api[ns][methodName] = function () {
            for (var _len3 = arguments.length, params = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
              params[_key3] = arguments[_key3];
            }

            return new _Promise(function (resolve, reject) {
              // RPC
              (0, _fetch2["default"])(_this2.createPath(ns), {
                method: "post",
                headers: {
                  "Accept": "application/json",
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(_jsonrpc2["default"].createRequest(methodName, params))
              }).then(function (response) {
                if (!response.ok) {
                  reject(response.error());
                  return null;
                }
                return response.json();
              }).then(function (jsonrpcResponse) {
                if (jsonrpcResponse.error) {
                  return reject(jsonrpcResponse.error);
                }
                resolve(jsonrpcResponse.result);
              })["catch"](function (error) {
                reject(error);
              });
            });
          };
        });
      });
    }
  }, {
    key: "updateRoutes",

    /**
     * @access private
     */
    value: function updateRoutes() {
      var _this3 = this;

      _lodash2["default"].forEach(this.implementations, function (methods, ns) {
        _this3.routes[_this3.createPath(ns)] = function (jsonrpcRequest) {
          return new _Promise(function (resolve) {
            _Promise.resolve(methods[jsonrpcRequest.method].apply(methods, _toConsumableArray(jsonrpcRequest.params))).then(function (result) {
              resolve(_jsonrpc2["default"].createResponse(null, result));
            })["catch"](function (error) {
              resolve(_jsonrpc2["default"].createResponse(error));
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
    value: function createPath(ns) {
      return "" + this.root + "/" + ns;
    }
  }]);

  return IsoProxy;
})();

exports["default"] = IsoProxy;
module.exports = exports["default"];