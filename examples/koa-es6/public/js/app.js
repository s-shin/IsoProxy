(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _IsoProxy = require("IsoProxy");

var _IsoProxy2 = _interopRequireDefault(_IsoProxy);

var proxy = new _IsoProxy2["default"]({
  root: "/api",
  isServer: typeof window === "undefined"
});

proxy.methods.hello = function (name) {
  return "hello " + name;
};

proxy.ns("math").methods = {
  add: function add(x, y) {
    return x + y;
  },
  sub: function sub(x, y) {
    return x - y;
  },
  mul: function mul(x, y) {
    return x * y;
  },
  div: function div(x, y) {
    return x / y;
  }
};

exports["default"] = proxy;
module.exports = exports["default"];

},{"IsoProxy":3}],2:[function(require,module,exports){
(function() {
  'use strict';

  if (self.fetch) {
    return
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = name.toString();
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = value.toString();
    }
    return value
  }

  function Headers(headers) {
    this.map = {}

    var self = this
    if (headers instanceof Headers) {
      headers.forEach(function(name, values) {
        values.forEach(function(value) {
          self.append(name, value)
        })
      })

    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        self.append(name, headers[name])
      })
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var list = this.map[name]
    if (!list) {
      list = []
      this.map[name] = list
    }
    list.push(value)
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    var values = this.map[normalizeName(name)]
    return values ? values[0] : null
  }

  Headers.prototype.getAll = function(name) {
    return this.map[normalizeName(name)] || []
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = [normalizeValue(value)]
  }

  // Instead of iterable for now.
  Headers.prototype.forEach = function(callback) {
    var self = this
    Object.getOwnPropertyNames(this.map).forEach(function(name) {
      callback(name, self.map[name])
    })
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    reader.readAsArrayBuffer(blob)
    return fileReaderReady(reader)
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    reader.readAsText(blob)
    return fileReaderReady(reader)
  }

  var support = {
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob();
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self
  }

  function Body() {
    this.bodyUsed = false


    this._initBody = function(body) {
      this._bodyInit = body
      if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (!body) {
        this._bodyText = ''
      } else {
        throw new Error('unsupported BodyInit type')
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        return this.blob().then(readBlobAsArrayBuffer)
      }

      this.text = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text')
        } else {
          return Promise.resolve(this._bodyText)
        }
      }
    } else {
      this.text = function() {
        var rejected = consumed(this)
        return rejected ? rejected : Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(url, options) {
    options = options || {}
    this.url = url

    this.credentials = options.credentials || 'omit'
    this.headers = new Headers(options.headers)
    this.method = normalizeMethod(options.method || 'GET')
    this.mode = options.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && options.body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(options.body)
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function headers(xhr) {
    var head = new Headers()
    var pairs = xhr.getAllResponseHeaders().trim().split('\n')
    pairs.forEach(function(header) {
      var split = header.trim().split(':')
      var key = split.shift().trim()
      var value = split.join(':').trim()
      head.append(key, value)
    })
    return head
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this._initBody(bodyInit)
    this.type = 'default'
    this.url = null
    this.status = options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = options.statusText
    this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers)
    this.url = options.url || ''
  }

  Body.call(Response.prototype)

  self.Headers = Headers;
  self.Request = Request;
  self.Response = Response;

  self.fetch = function(input, init) {
    // TODO: Request constructor should accept input, init
    var request
    if (Request.prototype.isPrototypeOf(input) && !init) {
      request = input
    } else {
      request = new Request(input, init)
    }

    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest()
      if (request.credentials === 'cors') {
        xhr.withCredentials = true;
      }

      function responseURL() {
        if ('responseURL' in xhr) {
          return xhr.responseURL
        }

        // Avoid security warnings on getResponseHeader when not allowed by CORS
        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
          return xhr.getResponseHeader('X-Request-URL')
        }

        return;
      }

      xhr.onload = function() {
        var status = (xhr.status === 1223) ? 204 : xhr.status
        if (status < 100 || status > 599) {
          reject(new TypeError('Network request failed'))
          return
        }
        var options = {
          status: status,
          statusText: xhr.statusText,
          headers: headers(xhr),
          url: responseURL()
        }
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(name, values) {
        values.forEach(function(value) {
          xhr.setRequestHeader(name, value)
        })
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})();

},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _jsonrpc = require("./jsonrpc");

var _jsonrpc2 = _interopRequireDefault(_jsonrpc);

var _fetch = require("./fetch");

var _fetch2 = _interopRequireDefault(_fetch);

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
          return new Promise(function (resolve) {
            Promise.resolve(method.apply(undefined, _toConsumableArray(jsonrpcRequest.params))).then(function (result) {
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
    value: function getServerApi() {
      var _this2 = this;

      return this.createApi(function (name) {
        return function () {
          var _methods;

          for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
            params[_key] = arguments[_key];
          }

          // call directly
          return Promise.resolve((_methods = _this2.methods)[name].apply(_methods, params));
        };
      });
    }
  }, {
    key: "getClientApi",
    value: function getClientApi() {
      var _this3 = this;

      return this.createApi(function (name) {
        return function () {
          for (var _len2 = arguments.length, params = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            params[_key2] = arguments[_key2];
          }

          return new Promise(function (resolve, reject) {
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

},{"./fetch":4,"./jsonrpc":5}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
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

},{"whatwg-fetch":2}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var jsonrpc = {

  /**
   * create JSON-RPC compatible message
   */
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

},{}],6:[function(require,module,exports){
"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _proxy = require("./proxy");

var _proxy2 = _interopRequireDefault(_proxy);

window.app = {
  hello1: function hello1() {
    this.show(_proxy2["default"].api.hello("world"));
  },
  hello2: function hello2() {
    this.show(_proxy2["default"].ns("math").api.add(1, 2));
  },
  show: function show(response) {
    response.then(function (result) {
      console.log("Result: " + result);
    })["catch"](function (error) {
      console.log("Error: " + error);
    });
  }
};

},{"./proxy":1}]},{},[6])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvcHJveHkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwiLi4vLi4vc3JjL0lzb1Byb3h5LmpzIiwiLi4vLi4vc3JjL2ZldGNoLmpzIiwiLi4vLi4vc3JjL2pzb25ycGMuanMiLCJzcmMvc3JjL2NsaWVudC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7O3dCQ0FxQixVQUFVOzs7O0FBRS9CLElBQU0sS0FBSyxHQUFHLDBCQUFhO0FBQ3pCLE1BQUksRUFBRSxNQUFNO0FBQ1osVUFBUSxFQUFHLE9BQU8sTUFBTSxLQUFLLFdBQVcsQUFBQztDQUMxQyxDQUFDLENBQUM7O0FBRUgsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsVUFBQyxJQUFJO29CQUFjLElBQUk7Q0FBRSxDQUFDOztBQUVoRCxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sR0FBRztBQUN6QixLQUFHLEVBQUEsYUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQUUsV0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQUU7QUFDM0IsS0FBRyxFQUFBLGFBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUFFLFdBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztHQUFFO0FBQzNCLEtBQUcsRUFBQSxhQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFBRSxXQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7R0FBRTtBQUMzQixLQUFHLEVBQUEsYUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQUUsV0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQUU7Q0FDNUIsQ0FBQzs7cUJBRWEsS0FBSzs7OztBQ2hCcEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozt1QkM5VW9CLFdBQVc7Ozs7cUJBQ2IsU0FBUzs7OztJQUVOLFFBQVE7Ozs7Ozs7O0FBc0JoQixXQXRCUSxRQUFRLEdBc0JKO1FBQVgsSUFBSSxnQ0FBRyxFQUFFOzswQkF0QkYsUUFBUTs7U0FVM0IsT0FBTyxHQUFHLEVBQUU7U0FLWixRQUFRLEdBQUcsRUFBRTtxQkFRMEIsSUFBSSxDQUFsQyxJQUFJO1FBQUosSUFBSSw4QkFBRyxFQUFFO3lCQUFxQixJQUFJLENBQXZCLFFBQVE7UUFBUixRQUFRLGtDQUFHLElBQUk7O0FBQ2pDLFFBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ2pCLFFBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0dBQzFCOztlQTFCa0IsUUFBUTs7Ozs7Ozs7V0FpQ3pCLFlBQUMsR0FBRSxFQUFFO0FBQ0wsVUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRSxDQUFDLEVBQUU7QUFDdEIsWUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFFLENBQUMsR0FBRyxJQUFJLFFBQVEsQ0FBQztBQUMvQixjQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFFLENBQUM7QUFDekIsa0JBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtTQUN4QixDQUFDLENBQUM7T0FDSjtBQUNELGFBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFFLENBQUMsQ0FBQztLQUMxQjs7Ozs7Ozs7OztXQVFPLGtCQUFDLFFBQVEsRUFBRTs7O0FBQ2pCLFVBQU0sWUFBWSxHQUFHLFNBQWYsWUFBWSxDQUFJLElBQUksRUFBRSxNQUFNLEVBQUs7QUFDckMsZ0JBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBQyxjQUFjLEVBQUs7QUFDakMsaUJBQU8sQ0FBQyxNQUFNLENBQUMsTUFBSyxPQUFPLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLE1BQU0sQ0FBQyxDQUFDO0FBQy9ELGlCQUFPLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFLO0FBQzlCLG1CQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0scUNBQUksY0FBYyxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQ2hELElBQUksQ0FBQyxVQUFDLE1BQU0sRUFBSztBQUNoQixxQkFBTyxDQUFDLHFCQUFRLGNBQWMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQzthQUMvQyxDQUFDLFNBQ0ksQ0FBQyxVQUFDLEtBQUssRUFBSzs7QUFFaEIscUJBQU8sQ0FBQyxxQkFBUSxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUN4QyxDQUFDLENBQUM7V0FDSixDQUFDLENBQUM7U0FDSixDQUFDLENBQUM7T0FDSixDQUFDO0FBQ0YsV0FBSyxJQUFJLEtBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQzdCLG9CQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUksQ0FBQyxDQUFDLENBQUM7T0FDekQ7QUFDRCxXQUFLLElBQUksTUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDOUIsWUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7T0FDeEM7S0FDRjs7Ozs7Ozs7Ozs7OztTQVdNLFlBQUc7QUFDUixhQUFPLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztLQUNsRTs7O1dBRVcsd0JBQUc7OztBQUNiLGFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFBLElBQUksRUFBSTtBQUM1QixlQUFPLFlBQWU7Ozs0Q0FBWCxNQUFNO0FBQU4sa0JBQU07Ozs7QUFFZixpQkFBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQUEsT0FBSyxPQUFPLEVBQUMsSUFBSSxPQUFDLFdBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztTQUN2RCxDQUFDO09BQ0gsQ0FBQyxDQUFDO0tBQ0o7OztXQUVXLHdCQUFHOzs7QUFDYixhQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBQSxJQUFJLEVBQUk7QUFDNUIsZUFBTyxZQUFlOzZDQUFYLE1BQU07QUFBTixrQkFBTTs7O0FBQ2YsaUJBQU8sSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFLOztBQUV0QyxvQ0FBTSxPQUFLLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUMzQixvQkFBTSxFQUFFLE1BQU07QUFDZCxxQkFBTyxFQUFFO0FBQ1Asd0JBQVEsRUFBRSxrQkFBa0I7QUFDNUIsOEJBQWMsRUFBRSxrQkFBa0I7ZUFDbkM7QUFDRCxrQkFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQVEsYUFBYSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQzthQUMxRCxDQUFDLENBQ0QsSUFBSSxDQUFDLFVBQUMsUUFBUSxFQUFLO0FBQ2xCLGtCQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRTtBQUNoQixzQkFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBQ3pCLHVCQUFPLElBQUksQ0FBQztlQUNiO0FBQ0QscUJBQU8sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO2FBQ3hCLENBQUMsQ0FDRCxJQUFJLENBQUMsVUFBQyxRQUFRLEVBQUs7QUFDbEIsa0JBQUksUUFBUSxDQUFDLEtBQUssRUFBRTtBQUNsQix1QkFBTyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO2VBQy9CO0FBQ0QscUJBQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDMUIsQ0FBQyxDQUFDO1dBQ0osQ0FBQyxDQUFDO1NBQ0osQ0FBQztPQUNILENBQUMsQ0FBQztLQUNKOzs7Ozs7O1dBS1Msb0JBQUMsSUFBSSxFQUFFO0FBQ2Ysa0JBQVUsSUFBSSxDQUFDLElBQUksU0FBSSxJQUFJLENBQUc7S0FDL0I7Ozs7Ozs7V0FLUSxtQkFBQyxZQUFZLEVBQUU7QUFDdEIsVUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ2IsV0FBSyxJQUFJLE1BQUksSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQzdCLFdBQUcsQ0FBQyxNQUFJLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBSSxDQUFDLENBQUM7T0FDaEM7QUFDRCxhQUFPLEdBQUcsQ0FBQztLQUNaOzs7U0E5SWtCLFFBQVE7OztxQkFBUixRQUFROzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDSDdCLElBQUksS0FBSyxDQUFDOztBQUVWLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFO0FBQ2pDLE1BQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO0FBQ2pCLFdBQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztHQUN6QjtBQUNELE9BQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO0NBQ3RCOztxQkFFYyxLQUFLOzs7Ozs7Ozs7O0FDUnBCLElBQU0sT0FBTyxHQUFHOzs7OztBQUtkLGVBQWEsRUFBQSx1QkFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFO0FBQzFCLFdBQU87QUFDTCxhQUFPLEVBQUUsS0FBSztBQUNkLFFBQUUsRUFBRSxDQUFDO0FBQ0wsWUFBTSxFQUFFLElBQUk7QUFDWixZQUFNLEVBQUUsTUFBTTtLQUNmLENBQUM7R0FDSDs7QUFFRCxnQkFBYyxFQUFBLDBCQUE4QjtRQUE3QixLQUFLLGdDQUFHLElBQUk7UUFBRSxNQUFNLGdDQUFHLElBQUk7O0FBQ3hDLFdBQU87QUFDTCxhQUFPLEVBQUUsS0FBSztBQUNkLFFBQUUsRUFBRSxDQUFDO0FBQ0wsWUFBTSxFQUFFLE1BQU07QUFDZCxXQUFLLEVBQUUsS0FBSztLQUNiLENBQUM7R0FDSDs7Q0FFRixDQUFDOztxQkFFYSxPQUFPOzs7Ozs7OztxQkMxQkosU0FBUzs7OztBQUUzQixNQUFNLENBQUMsR0FBRyxHQUFHO0FBQ1gsUUFBTSxFQUFBLGtCQUFHO0FBQ1AsUUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7R0FDckM7QUFDRCxRQUFNLEVBQUEsa0JBQUc7QUFDUCxRQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQzNDO0FBQ0QsTUFBSSxFQUFBLGNBQUMsUUFBUSxFQUFFO0FBQ2IsWUFBUSxDQUNQLElBQUksQ0FBQyxVQUFDLE1BQU0sRUFBSztBQUNoQixhQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQztLQUNsQyxDQUFDLFNBQ0ksQ0FBQyxVQUFDLEtBQUssRUFBSztBQUNoQixhQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQztLQUNoQyxDQUFDLENBQUM7R0FDSjtDQUNGLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IElzb1Byb3h5IGZyb20gXCJJc29Qcm94eVwiO1xuXG5jb25zdCBwcm94eSA9IG5ldyBJc29Qcm94eSh7XG4gIHJvb3Q6IFwiL2FwaVwiLFxuICBpc1NlcnZlcjogKHR5cGVvZiB3aW5kb3cgPT09IFwidW5kZWZpbmVkXCIpXG59KTtcblxucHJveHkubWV0aG9kcy5oZWxsbyA9IChuYW1lKSA9PiBgaGVsbG8gJHtuYW1lfWA7XG5cbnByb3h5Lm5zKFwibWF0aFwiKS5tZXRob2RzID0ge1xuICBhZGQoeCwgeSkgeyByZXR1cm4geCArIHk7IH0sXG4gIHN1Yih4LCB5KSB7IHJldHVybiB4IC0geTsgfSxcbiAgbXVsKHgsIHkpIHsgcmV0dXJuIHggKiB5OyB9LFxuICBkaXYoeCwgeSkgeyByZXR1cm4geCAvIHk7IH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IHByb3h5O1xuIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24obmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgc2VsZi5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgc2VsZi5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIGxpc3QgPSB0aGlzLm1hcFtuYW1lXVxuICAgIGlmICghbGlzdCkge1xuICAgICAgbGlzdCA9IFtdXG4gICAgICB0aGlzLm1hcFtuYW1lXSA9IGxpc3RcbiAgICB9XG4gICAgbGlzdC5wdXNoKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICAgIHJldHVybiB2YWx1ZXMgPyB2YWx1ZXNbMF0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldIHx8IFtdXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gW25vcm1hbGl6ZVZhbHVlKHZhbHVlKV1cbiAgfVxuXG4gIC8vIEluc3RlYWQgb2YgaXRlcmFibGUgZm9yIG5vdy5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5tYXApLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgY2FsbGJhY2sobmFtZSwgc2VsZi5tYXBbbmFtZV0pXG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKCk7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmXG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICB9XG5cbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQgOiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QodXJsLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB0aGlzLnVybCA9IHVybFxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIG9wdGlvbnMuYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShvcHRpb25zLmJvZHkpXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhlYWRlcnMoeGhyKSB7XG4gICAgdmFyIGhlYWQgPSBuZXcgSGVhZGVycygpXG4gICAgdmFyIHBhaXJzID0geGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgdmFyIHNwbGl0ID0gaGVhZGVyLnRyaW0oKS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gc3BsaXQuc2hpZnQoKS50cmltKClcbiAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJzonKS50cmltKClcbiAgICAgIGhlYWQuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgfSlcbiAgICByZXR1cm4gaGVhZFxuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnVybCA9IG51bGxcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9IG9wdGlvbnMuc3RhdHVzVGV4dFxuICAgIHRoaXMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMgPyBvcHRpb25zLmhlYWRlcnMgOiBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzO1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0O1xuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgLy8gVE9ETzogUmVxdWVzdCBjb25zdHJ1Y3RvciBzaG91bGQgYWNjZXB0IGlucHV0LCBpbml0XG4gICAgdmFyIHJlcXVlc3RcbiAgICBpZiAoUmVxdWVzdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnB1dCkgJiYgIWluaXQpIHtcbiAgICAgIHJlcXVlc3QgPSBpbnB1dFxuICAgIH0gZWxzZSB7XG4gICAgICByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2NvcnMnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiByZXNwb25zZVVSTCgpIHtcbiAgICAgICAgaWYgKCdyZXNwb25zZVVSTCcgaW4geGhyKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5yZXNwb25zZVVSTFxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXZvaWQgc2VjdXJpdHkgd2FybmluZ3Mgb24gZ2V0UmVzcG9uc2VIZWFkZXIgd2hlbiBub3QgYWxsb3dlZCBieSBDT1JTXG4gICAgICAgIGlmICgvXlgtUmVxdWVzdC1VUkw6L20udGVzdCh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5nZXRSZXNwb25zZUhlYWRlcignWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHN0YXR1cyA9ICh4aHIuc3RhdHVzID09PSAxMjIzKSA/IDIwNCA6IHhoci5zdGF0dXNcbiAgICAgICAgaWYgKHN0YXR1cyA8IDEwMCB8fCBzdGF0dXMgPiA1OTkpIHtcbiAgICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcnMoeGhyKSxcbiAgICAgICAgICB1cmw6IHJlc3BvbnNlVVJMKClcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dDtcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbihuYW1lLCB2YWx1ZXMpIHtcbiAgICAgICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkoKTtcbiIsImltcG9ydCBqc29ucnBjIGZyb20gXCIuL2pzb25ycGNcIjtcbmltcG9ydCBmZXRjaCBmcm9tIFwiLi9mZXRjaFwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJc29Qcm94eSB7XG5cbiAgLyoqXG4gICAqIEFQSSBtZXRob2QgY29udGFpbmVyLlxuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAZXhhbXBsZVxuICAgKiBwcm94eS5tZXRob2QuYWRkID0gKHgsIHkpID0+IHggKyB5O1xuICAgKi9cbiAgbWV0aG9kcyA9IHt9O1xuXG4gIC8qKlxuICAgKiBAYWNjZXNzIHByaXZhdGVcbiAgICovXG4gIGNoaWxkcmVuID0ge307XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLnJvb3QgUm9vdCB1cmwgcGF0aCwgdGhhdCBpcyBiZWdpbm5pbmcgd2l0aCBcIi9cIiBhbmQgTk9UIGVuZCB3aXRoIFwiL1wiLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdHMuaXNTZXJ2ZXIgU2VydmVyIG1vZGUgb3Igbm90LlxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0cyA9IHt9KSB7XG4gICAgY29uc3Qge3Jvb3QgPSBcIlwiLCBpc1NlcnZlciA9IHRydWV9ID0gb3B0cztcbiAgICB0aGlzLnJvb3QgPSByb290O1xuICAgIHRoaXMuaXNTZXJ2ZXIgPSBpc1NlcnZlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gbnMgTmFtZXNwYWNlLlxuICAgKiBAcmV0dXJuIHtJc29Qcm94eX0gQ2hpbGQgcHJveHkgaW5zdGFuY2UuXG4gICAqL1xuICBucyhucykge1xuICAgIGlmICghdGhpcy5jaGlsZHJlbltuc10pIHtcbiAgICAgIHRoaXMuY2hpbGRyZW5bbnNdID0gbmV3IElzb1Byb3h5KHtcbiAgICAgICAgcm9vdDogdGhpcy5jcmVhdGVQYXRoKG5zKSxcbiAgICAgICAgaXNTZXJ2ZXI6IHRoaXMuaXNTZXJ2ZXJcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jaGlsZHJlbltuc107XG4gIH1cblxuICAvKipcbiAgICogVHJhdmVyc2UgYWxsIG1ldGhvZHMgZm9yIHJvdXRpbmcgaW4gc2VydmVyLlxuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcGFyYW0ge2Z1bmN0aW9uKHVybFBhdGg6IHN0cmluZywgcHJvY2Vzc0pzb25ycGNSZXF1ZXN0OiBmdW5jdGlvbihqc29ucnBjUmVxdWVzdDogT2JqZWN0KTogUHJvbWlzZSk6IG51bGx9IGNhbGxiYWNrXG4gICAqL1xuICB0cmF2ZXJzZShjYWxsYmFjaykge1xuICAgIGNvbnN0IGNhbGxDYWxsYmFjayA9IChwYXRoLCBtZXRob2QpID0+IHtcbiAgICAgIGNhbGxiYWNrKHBhdGgsIChqc29ucnBjUmVxdWVzdCkgPT4ge1xuICAgICAgICBjb25zb2xlLmFzc2VydCh0aGlzLm1ldGhvZHNbanNvbnJwY1JlcXVlc3QubWV0aG9kXSA9PT0gbWV0aG9kKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKG1ldGhvZCguLi5qc29ucnBjUmVxdWVzdC5wYXJhbXMpKVxuICAgICAgICAgIC50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoanNvbnJwYy5jcmVhdGVSZXNwb25zZShudWxsLCByZXN1bHQpKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIC8vIHJlc29sdmUoKSBpcyB1c2VkIGJlY2F1c2UgdGhlIGVycm9yIGlzIHNlbnQgdG8gY2xpZW50LlxuICAgICAgICAgICAgcmVzb2x2ZShqc29ucnBjLmNyZWF0ZVJlc3BvbnNlKGVycm9yKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgICBmb3IgKGxldCBuYW1lIGluIHRoaXMubWV0aG9kcykge1xuICAgICAgY2FsbENhbGxiYWNrKHRoaXMuY3JlYXRlUGF0aChuYW1lKSwgdGhpcy5tZXRob2RzW25hbWVdKTtcbiAgICB9XG4gICAgZm9yIChsZXQgbmFtZSBpbiB0aGlzLmNoaWxkcmVuKSB7XG4gICAgICB0aGlzLmNoaWxkcmVuW25hbWVdLnRyYXZlcnNlKGNhbGxiYWNrKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGlzb21vcnBoaWMgbWV0aG9kIGNvbGxlY3Rpb24uXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqIEByZXR1cm4ge09iamVjdH0gSXNvbW9ycGhpY2FsbHkgd3JhcHBlZCBtZXRob2RzIG5vdCBpbmNsdWRpbmcgb25lcyBpbiBuYW1lc3BhY2VzLlxuICAgKiBAZXhhbXBsZVxuICAgKiBwcm94eS5tZXRob2RzLmFkZCA9ICh4LCB5KSA9PiB4ICsgeTtcbiAgICogcHJveHkuYXBpOyAvLyA9PiB7YWRkOiAoeCwgeSkgPT4geyAoaXNvbW9ycGhpYyBibGFja2JveCkgfX1cbiAgICovXG4gIGdldCBhcGkoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNTZXJ2ZXIgPyB0aGlzLmdldFNlcnZlckFwaSgpIDogdGhpcy5nZXRDbGllbnRBcGkoKTtcbiAgfVxuXG4gIGdldFNlcnZlckFwaSgpIHtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGVBcGkobmFtZSA9PiB7XG4gICAgICByZXR1cm4gKC4uLnBhcmFtcykgPT4ge1xuICAgICAgICAvLyBjYWxsIGRpcmVjdGx5XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5tZXRob2RzW25hbWVdKC4uLnBhcmFtcykpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldENsaWVudEFwaSgpIHtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGVBcGkobmFtZSA9PiB7XG4gICAgICByZXR1cm4gKC4uLnBhcmFtcykgPT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgIC8vIFJQQ1xuICAgICAgICAgIGZldGNoKHRoaXMuY3JlYXRlUGF0aChuYW1lKSwge1xuICAgICAgICAgICAgbWV0aG9kOiBcInBvc3RcIixcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgXCJBY2NlcHRcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoanNvbnJwYy5jcmVhdGVSZXF1ZXN0KG5hbWUsIHBhcmFtcykpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgcmVqZWN0KHJlc3BvbnNlLmVycm9yKCkpO1xuICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5lcnJvcikge1xuICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHJlc3BvbnNlLmVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UucmVzdWx0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBhY2Nlc3MgcHJpdmF0ZVxuICAgKi9cbiAgY3JlYXRlUGF0aChuYW1lKSB7XG4gICAgcmV0dXJuIGAke3RoaXMucm9vdH0vJHtuYW1lfWA7XG4gIH1cblxuICAvKipcbiAgICogQGFjY2VzcyBwcml2YXRlXG4gICAqL1xuICBjcmVhdGVBcGkoY3JlYXRlTWV0aG9kKSB7XG4gICAgbGV0IGFwaSA9IHt9O1xuICAgIGZvciAobGV0IG5hbWUgaW4gdGhpcy5tZXRob2RzKSB7XG4gICAgICBhcGlbbmFtZV0gPSBjcmVhdGVNZXRob2QobmFtZSk7XG4gICAgfVxuICAgIHJldHVybiBhcGk7XG4gIH1cblxufVxuIiwidmFyIGZldGNoO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICBpZiAoIXdpbmRvdy5mZXRjaCkge1xuICAgIHJlcXVpcmUoXCJ3aGF0d2ctZmV0Y2hcIik7XG4gIH1cbiAgZmV0Y2ggPSB3aW5kb3cuZmV0Y2g7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZldGNoO1xuIiwiXG5jb25zdCBqc29ucnBjID0ge1xuXG4gIC8qKlxuICAgKiBjcmVhdGUgSlNPTi1SUEMgY29tcGF0aWJsZSBtZXNzYWdlXG4gICAqL1xuICBjcmVhdGVSZXF1ZXN0KG5hbWUsIHBhcmFtcykge1xuICAgIHJldHVybiB7XG4gICAgICBqc29ucnBjOiBcIjIuMFwiLFxuICAgICAgaWQ6IDEsXG4gICAgICBtZXRob2Q6IG5hbWUsXG4gICAgICBwYXJhbXM6IHBhcmFtc1xuICAgIH07XG4gIH0sXG5cbiAgY3JlYXRlUmVzcG9uc2UoZXJyb3IgPSBudWxsLCByZXN1bHQgPSBudWxsKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGpzb25ycGM6IFwiMi4wXCIsXG4gICAgICBpZDogMSxcbiAgICAgIHJlc3VsdDogcmVzdWx0LFxuICAgICAgZXJyb3I6IGVycm9yXG4gICAgfTtcbiAgfVxuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBqc29ucnBjO1xuIiwiaW1wb3J0IHByb3h5IGZyb20gXCIuL3Byb3h5XCI7XG5cbndpbmRvdy5hcHAgPSB7XG4gIGhlbGxvMSgpIHtcbiAgICB0aGlzLnNob3cocHJveHkuYXBpLmhlbGxvKFwid29ybGRcIikpO1xuICB9LFxuICBoZWxsbzIoKSB7XG4gICAgdGhpcy5zaG93KHByb3h5Lm5zKFwibWF0aFwiKS5hcGkuYWRkKDEsIDIpKTtcbiAgfSxcbiAgc2hvdyhyZXNwb25zZSkge1xuICAgIHJlc3BvbnNlXG4gICAgLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCJSZXN1bHQ6IFwiICsgcmVzdWx0KTtcbiAgICB9KVxuICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3I6IFwiICsgZXJyb3IpO1xuICAgIH0pO1xuICB9XG59O1xuIl19
