import IsoProxy from "isoproxy";

const proxy = new IsoProxy({
  root: "/api",
  isServer: (typeof window === "undefined")
});

proxy.methods.hello = (name) => `hello ${name}`;

proxy.ns("math").methods = {
  add(x, y) { return x + y; },
  sub(x, y) { return x - y; },
  mul(x, y) { return x * y; },
  div(x, y) { return x / y; }
};

export default proxy;
