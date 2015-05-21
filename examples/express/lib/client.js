var proxy = require("./proxy");

window.app = {
  hello1: function() {
    this.show(proxy.api.hello("world"));
  },
  hello2: function() {
    this.show(proxy.api.asyncHello("world"));
  },
  show(response) {
    response
    .then(function(result) {
      console.log("Result: " + result);
    })
    .catch(function(error) {
      console.log("Error: " + error);
    });
  }
};
