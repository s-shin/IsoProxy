import proxy from "./proxy";

window.app = {
  hello1() {
    this.show(proxy.api.hello("world"));
  },
  hello2() {
    this.show(proxy.ns("math").api.add(1, 2));
  },
  show(response) {
    response
    .then((result) => {
      console.log("Result: " + result);
    })
    .catch((error) => {
      console.log("Error: " + error);
    });
  }
};
