# IsoProxy - General Isomorphic API Proxy

IsoProxy is a simple proxy inspired [Fetchr](https://github.com/yahoo/fetchr),
and the motivation is the same as in Fetchr.

[![Build Status](https://travis-ci.org/s-shin/isoproxy.svg)](https://travis-ci.org/s-shin/isoproxy)
[![npm version](https://badge.fury.io/js/isoproxy.svg)](http://badge.fury.io/js/isoproxy)
[![Dependency Status](https://david-dm.org/s-shin/isoproxy.svg)](https://david-dm.org/s-shin/isoproxy)
[![devDependency Status](https://david-dm.org/s-shin/isoproxy/dev-status.svg)](https://david-dm.org/s-shin/isoproxy#info=devDependencies)
[![license](https://img.shields.io/github/license/s-shin/isoproxy.svg)](https://github.com/s-shin/isoproxy/blob/master/LICENSE)

## Features

* Isolation from a web application framework by adopting JSONRPC.
* ES6 friendly with Promise.

## Install

```sh
npm install isoproxy --save
```

## Usage

Define isomorphic API:

```js
// proxy.js
var IsoProxy = require("isoproxy");

var proxy = new IsoProxy({
  root: "/api",
  isServer: (typeof window === "undefined")
});

proxy.setInterfaces({
  math: ["add", "sub"]
});

proxy.setImplementations({
  math: {
    add: function(x, y) { return x + y; },
    sub: function(x, y) { return x - y; }
  }
});

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

Object.keys(proxy.routes).forEach(function(urlPath) {
  var processJsonrpcRequest = proxy.routes[urlPath];
  app.post(urlPath, function(req, res) {
    processJsonrpcRequest(req.body).then(function(jsonrpcResponse) {
      res.send(jsonrpcResponse);
    });
  });
});

app.get("/add/:x/:y", function(req, res) {
  proxy.api.math.add(+req.params.x, +req.params.y)
    .then(function(result) {
      res.send(""+result);
    });
});
```

Client side (browserify):

```js
// client.js
var proxy = require("./proxy");

proxy.api.math.add(1, 2).then(function(r) {
  console.log(r); // => 3
});

proxy.api.math.sub(1, 2).then(function(r) {
  console.log(r); // => -1
});
```

## Why interfaces and implementations are separated?

It is because the client side need not know implementation details.
In other words, implementations can be hidden from users.

Please see [this example](example/koa-es6) for more information.

## Examples

* [ES5, express, and browserify](examples/express/)
* [ES6, koa, and babelify](examples/koa-es6/)

## Supported Browsers

Above Internet Explorer 9 and other modern browsers.

## License

The MIT License.
