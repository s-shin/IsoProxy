import assert from "power-assert";
import co from "co";
import IsoProxy from "../lib/isoproxy";
import jsonrpc from "../lib/jsonrpc";

const interfaces = {
  "*": ["hello"],
  math: ["add"]
};

const implementations = {
  "*": {
    hello(name) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(`hello ${name}`), 1);
      });
    }
  },
  math: {
    add: (x, y) => x + y
  }
};

describe("IsoProxy", () => {

  let proxy = null;

  describe("server", () => {

    beforeEach(() => {
      proxy = new IsoProxy({root: "/api", isServer: true});
    });

    it("Basic workflow with #setInterfaces(), #setImplementaions(), and .api", (done) => {
      // no api
      assert(!proxy.api["*"]);
      // register interfaces
      proxy.setInterfaces(interfaces);
      assert(proxy.api["*"]);
      assert(proxy.api["*"].hello);
      // but not implemented
      assert.throws(() => {
        proxy.api["*"].hello("world");
      });
      // register implementations
      proxy.setImplementations(implementations);
      // now implemented
      assert.doesNotThrow(() => {
        proxy.api["*"].hello("world");
      });
      // return value is just a Promise.
      proxy.api["*"].hello("world").then((result) => {
        assert(result === "hello world");
        // with co
        co(function *() {
          let result = yield proxy.api.math.add(1, 2);
          assert(result === 3);
          done();
        });
      });
    });

    it("traverse .routes", () => {
      proxy.setInterfaces(interfaces);
      proxy.setImplementations(implementations);
      let count = 0;
      for (let urlPath in proxy.routes) {
        count++;
        assert(["/api/*", "/api/math"].indexOf(urlPath) !== -1);
        let processJsonrpcRequest = proxy.routes[urlPath];
        assert(processJsonrpcRequest);
      }
      assert(count === 2);
    });

    it("match path with .routes", (done) => {
      proxy.setInterfaces(interfaces);
      proxy.setImplementations(implementations);
      const processJsonrpcRequest = proxy.routes["/api/math"];
      assert(processJsonrpcRequest);
      co(function *() {
        var body = jsonrpc.createRequest("add", [1, 2]);
        var answer = jsonrpc.createResponse(null, 3);
        const result = yield processJsonrpcRequest(body);
        assert.deepEqual(answer, result);
        done();
      });
    });

  });

});
