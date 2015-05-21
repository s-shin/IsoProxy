import jsonrpc from "./jsonrpc";
import fetch from "./fetch";

/**
 * Isomorphic API Proxy
 */
export default class IsoProxy {

  /**
   * API method container.
   *
   * @access public
   * @type {Object}
   * @example
   * proxy.method.add = (x, y) => x + y;
   */
  methods = {};

  /**
   * @access private
   */
  children = {};

  /**
   * @param {Object} opts
   * @param {string} opts.root Root url path, that is beginning with "/" and NOT end with "/".
   * @param {boolean} opts.isServer Server mode or not.
   */
  constructor(opts = {}) {
    const {root = "", isServer = true} = opts;
    this.root = root;
    this.isServer = isServer;
  }

  /**
   * @access public
   * @param {string} ns Namespace.
   * @return {IsoProxy} Child proxy instance.
   */
  ns(ns) {
    if (!this.children[ns]) {
      this.children[ns] = new IsoProxy({
        root: this.createPath(ns),
        isServer: this.isServer
      });
    }
    return this.children[ns];
  }

  /**
   * Traverse all methods for routing in server.
   *
   * @access public
   * @param {function(urlPath: string, processJsonrpcRequest: function(jsonrpcRequest: Object): Promise): null} callback
   */
  traverse(callback) {
    const callCallback = (path, method) => {
      callback(path, (jsonrpcRequest) => {
        console.assert(this.methods[jsonrpcRequest.method] === method);
        return new Promise((resolve) => {
          Promise.resolve(method(...jsonrpcRequest.params))
          .then((result) => {
            resolve(jsonrpc.createResponse(null, result));
          })
          .catch((error) => {
            // resolve() is used because the error is sent to client.
            resolve(jsonrpc.createResponse(error));
          });
        });
      });
    };
    for (let name in this.methods) {
      callCallback(this.createPath(name), this.methods[name]);
    }
    for (let name in this.children) {
      this.children[name].traverse(callback);
    }
  }

  /**
   * Get isomorphic method collection.
   *
   * @access public
   * @return {Object} Isomorphically wrapped methods not including ones in namespaces.
   * @example
   * proxy.methods.add = (x, y) => x + y;
   * proxy.api; // => {add: (x, y) => { (isomorphic blackbox) }}
   */
  get api() {
    return this.isServer ? this.getServerApi() : this.getClientApi();
  }

  /**
   * @access private
   */
  getServerApi() {
    return this.createApi(name => {
      return (...params) => {
        // call directly
        return Promise.resolve(this.methods[name](...params));
      };
    });
  }

  /**
   * @access private
   */
  getClientApi() {
    return this.createApi(name => {
      return (...params) => {
        return new Promise((resolve, reject) => {
          // RPC
          fetch(this.createPath(name), {
            method: "post",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(jsonrpc.createRequest(name, params))
          })
          .then((response) => {
            if (!response.ok) {
              reject(response.error());
              return null;
            }
            return response.json();
          })
          .then((response) => {
            if (response.error) {
              return reject(response.error);
            }
            resolve(response.result);
          });
        });
      };
    });
  }

  /**
   * @access private
   */
  createPath(name) {
    return `${this.root}/${name}`;
  }

  /**
   * @access private
   */
  createApi(createMethod) {
    let api = {};
    for (let name in this.methods) {
      api[name] = createMethod(name);
    }
    return api;
  }

}
