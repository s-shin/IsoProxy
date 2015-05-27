import _ from "lodash";
import jsonrpc from "./jsonrpc";
import fetch from "./fetch";

/**
 * Isomorphic API Proxy
 */
export default class IsoProxy {

  /**
   * @param {Object} opts
   * @param {string} opts.root Root url path, that is beginning with "/" and NOT end with "/".
   * @param {boolean} opts.isServer Server mode or not.
   */
  constructor(opts = {}) {
    const {root = "", isServer = true} = opts;
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

  /**
   * @access public
   * @param {Object} {namespace: {methodName: function}}
   */
  setInterfaces(interfaces) {
    this.interfaces = interfaces;
    this.updateApi();
    this.updateRoutes();
  }

  /**
   * @access public
   */
  setImplementations(implementations) {
    if (!this.isServer) {
      throw new Error("Implementations are required only in server mode.");
    }
    this.implementations = implementations;
    this.updateApi();
    this.updateRoutes();
  }

  /**
   * @access private
   */
  updateApi() {
    return this.isServer ? this.updateServerApi() : this.updateClientApi();
  }

  /**
   * @access private
   */
  preprocessMethodDefinitions(methodDefinitions) {
    if (_.isArray(methodDefinitions)) {
      // ["add", "sub"] => {add: {}, sub: {}}
      methodDefinitions = _.reduce(methodDefinitions, (r, methodName) => {
        r[methodName] = {}; // no options
        return r;
      }, {});
    }
    return methodDefinitions;
  }

  /**
   * @access private
   */
  updateServerApi() {
    this.api = {};
    _.forEach(this.interfaces, (methodDefinitions, ns) => {
      methodDefinitions = this.preprocessMethodDefinitions(methodDefinitions);
      this.api[ns] = {};
      _.forEach(methodDefinitions, (methodOpts, methodName) => {
        const impl = _.get(this.implementations, [ns, methodName]);
        if (impl) {
          // wrap with Promise.
          this.api[ns][methodName] = (...args) => {
            return Promise.resolve(impl(...args));
          };
        } else {
          // mock method.
          this.api[ns][methodName] = (...args) => {
            const argsStr = _.map(args, (p) => p.toString()).join(", ");
            throw new Error(`${ns}.${methodName}(${argsStr}) is called but is not implemented.`);
          };
        }
      });
    });
  }

  /**
   * @access private
   */
  updateClientApi() {
    this.api = {};
    _.forEach(this.interfaces, (methodDefinitions, ns) => {
      methodDefinitions = this.preprocessMethodDefinitions(methodDefinitions);
      this.api[ns] = {};
      _.forEach(methodDefinitions, (methodOpts, methodName) => {
        this.api[ns][methodName] = (...params) => {
          return new Promise((resolve, reject) => {
            // RPC
            fetch(this.createPath(ns), {
              method: "post",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(jsonrpc.createRequest(methodName, params))
            })
            .then((response) => {
              if (!response.ok) {
                reject(response.error());
                return null;
              }
              return response.json();
            })
            .then((jsonrpcResponse) => {
              if (jsonrpcResponse.error) {
                return reject(jsonrpcResponse.error);
              }
              resolve(jsonrpcResponse.result);
            })
            .catch((error) => {
              reject(error);
            });
          });
        };
      });
    });
  }

  /**
   * @access private
   */
  updateRoutes() {
    _.forEach(this.implementations, (methods, ns) => {
      this.routes[this.createPath(ns)] = (jsonrpcRequest) => {
        return new Promise((resolve) => {
          Promise
            .resolve(methods[jsonrpcRequest.method](...jsonrpcRequest.params))
            .then((result) => {
              resolve(jsonrpc.createResponse(null, result));
            })
            .catch((error) => {
              resolve(jsonrpc.createResponse(error));
            });
        });
      };
    });
  }

  /**
   * @access private
   */
  createPath(ns) {
    return `${this.root}/${ns}`;
  }

}
