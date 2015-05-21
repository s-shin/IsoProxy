# IsoProxy - General Isomorphic API Proxy with JSONRPC.

IsoProxy is a simple proxy inspired [Fetchr](https://github.com/yahoo/fetchr),
and the motivation is the same as in Fetchr.

[![Build Status](https://travis-ci.org/s-shin/isoproxy.svg)](https://travis-ci.org/s-shin/isoproxy)

## Features

* Isolation from a web application framework by adopting JSONRPC.
* ES6 friendly with Promise.

## Install

```sh
npm install isoproxy --save
```

## Example

Define isomorphic API:

```js
// proxy.js
var IsoProxy = require("isoproxy");

var proxy = new IsoProxy({
  root: "/api",
  isServer: (typeof window === "undefined")
});

proxy.methods.hello = function(name) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve("hello " + name);
    }, 100);
  });
};

proxy.ns("math").methods.add = function(a, b) {
  return a + b;
}

module.exports = proxy;
```

Server side (express):

```js
// server.js
var express = require("express");
var bodyParser = require("body-parser");
var proxy = require("./proxy");

var app = express();
app.use(bodyParser.json());

proxy.traverse(function(urlPath, processJsonrpcRequest) {
  app.post(urlPath, function(req, res) {
    processJsonrpcRequest(req.body).then(function(jsonrpcResponse) {
      res.send(jsonrpcResponse);
    });
  });
});

app.get("/hello/:name", function(req, res) {
  proxy.api.hello(req.params.name).then(function(result) {
    res.send(result);
  });
});
```

Client side (browserify):

```js
// client.js
var proxy = require("./proxy");

proxy.api.hello("world").then(function(result) {
  console.log(result); // => hello world
});

proxy.ns("math").api.add(1, 2).then(function(result) {
  console.log(result); // => 3
});
```

See more examples:

* [ES5, express, and browserify](examples/express/)
* [ES6, koa, and babelify](examples/koa-es6/)
