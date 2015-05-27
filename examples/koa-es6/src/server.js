import path from "path";
import koa from "koa";
import koaRouter from "koa-router";
import koaStatic from "koa-static";
import koaLogger from "koa-logger";
import koaBodyParser from "koa-bodyparser";
import proxy from "./app/proxy";
import apiInterfaces from "./api/interfaces";
import apiImplementaions from "./api/implementations";

proxy.setInterfaces(apiInterfaces);
proxy.setImplementations(apiImplementaions);

const app = koa();
const router = koaRouter();

app.use(koaLogger());
app.use(koaBodyParser());

app.use(koaStatic(path.join(__dirname, "../public")));

Object.keys(proxy.routes).forEach((urlPath) => {
  const processJsonrpcRequest = proxy.routes[urlPath];
  router.post(urlPath, function *() {
    this.body = yield processJsonrpcRequest(this.request.body);
  });
});

router.get("/hello/:name", function *() {
  this.body = yield proxy.api["*"].hello(this.params.name);
});

router.get("/add/:x/:y", function *() {
  const {x, y} = this.params;
  this.body = yield proxy.api.math.add(+x, +y);
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = process.env.PORT || 3000;
app.listen(port);
console.log(`listening on port ${port}`);
