var proxy = require("./proxy");

window.app = {
  ex1() {
    proxy.api.math.add(1, 2).then(function(r){ console.log(r); }, function(err) { console.error(err); });
  },
  ex2() {
    proxy.api.math.sub(1, 2).then(function(r){ console.log(r); }, function(err) { console.error(err); });
  }
};
