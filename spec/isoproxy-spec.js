import assert from "power-assert";
import IsoProxy from "../src/isoproxy";
import jsonrpc from "../src/jsonrpc";

function defineHello(proxy) {
  proxy.methods.hello = (name) => `hello ${name}`;
}

function defineAsyncHello(proxy) {
  proxy.methods.hello = (name) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`hello ${name}`);
      }, 1);
    });
  };
}

function defineMathAdd(proxy) {
  proxy.ns("math").methods.add = (x, y) => x + y;
}

describe("IsoProxy", () => {

  let proxy = null;

  describe("server", () => {

    beforeEach(() => {
      proxy = new IsoProxy({root: "/api", isServer: true});
    });

    it("simple", (done) => {
      defineHello(proxy);
      const api = proxy.api;
      api.hello("world").then((result) => {
        assert(result === "hello world");
        done();
      });
    });

    it("async", (done) => {
      defineAsyncHello(proxy);
      const api = proxy.api;
      api.hello("world").then((result) => {
        assert(result === "hello world");
        done();
      });
    });

    it("namespace", (done) => {
      defineMathAdd(proxy);
      const api = proxy.ns("math").api;
      api.add(1, 2).then((result) => {
        assert(result === 3);
        done();
      });
    });

    describe("#traverse()", () => {

      it("simple", (done) => {
        defineHello(proxy);
        proxy.traverse((urlPath, processJsonrpcRequest) => {
          assert(urlPath === "/api/hello");
          processJsonrpcRequest(jsonrpc.createRequest("hello", ["world"]))
          .then((result) => {
            assert.deepEqual(
              jsonrpc.createResponse(null, "hello world"),
              result
            );
            done();
          });
        });
      });

      it("namespace", (done) => {
        defineMathAdd(proxy);
        proxy.traverse((urlPath, processJsonrpcRequest) => {
          assert(urlPath === "/api/math/add");
          processJsonrpcRequest(jsonrpc.createRequest("add", [1, 2]))
          .then((result) => {
            assert.deepEqual(
              jsonrpc.createResponse(null, 3),
              result
            );
            done();
          });
        });
      });

    });

  });

});
