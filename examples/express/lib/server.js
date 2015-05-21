var path = require("path");
var express = require("express");
var bodyParser = require("body-parser");
var morgan = require("morgan");
var proxy = require("./proxy");

var app = express();

app.use(bodyParser.json());
app.use(morgan("combined"));
app.use(express.static(path.join(__dirname, "../public")));

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

var port = process.env.PORT || 3000;
var server = app.listen(port, function() {
  var host = server.address().address;
  console.log("listening at http://%s:%s", host, port);
});
