
/**
 * Simple JSON-RPC compatible request/response creators.
 */
const jsonrpc = {

  createRequest(name, params) {
    return {
      jsonrpc: "2.0",
      id: 1,
      method: name,
      params: params
    };
  },

  createResponse(error = null, result = null) {
    return {
      jsonrpc: "2.0",
      id: 1,
      result: result,
      error: error
    };
  }

};

export default jsonrpc;
