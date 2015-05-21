var IsoProxy = require("isoproxy");

var proxy = new IsoProxy({
  root: "/api",
  isServer: (typeof window === "undefined")
});

proxy.methods = {
  hello: function(name) {
    return "hello " + name;
  },
  asyncHello: function(name) {
    return new Promise(function(resolve) {
      setTimeout(function() {
        resolve("hello " + name);
      }, 100);
    });
  }
};

module.exports = proxy;
