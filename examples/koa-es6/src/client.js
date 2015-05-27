import proxy from "./app/proxy";
import apiInterfaces from "./api/interfaces";

proxy.setInterfaces(apiInterfaces);
const api = proxy.api;

window.app = {
  ex1() {
    api["*"].hello("world").then((r) => console.log(r), (err) => console.error(err));
  },
  ex2() {
    api.math.add(1, 2).then((r) => console.log(r), (err) => console.error(err));
  }
};
