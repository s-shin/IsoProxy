import path from "path";
import koa from "koa";
import koaRouter from "koa-router";
import koaStatic from "koa-static";
import koaLogger from "koa-logger";
import koaBodyParser from "koa-bodyparser";
import proxy from "./proxy";

const app = koa();
const router = koaRouter();

app.use(koaLogger());
app.use(koaBodyParser());

app.use(koaStatic(path.join(__dirname, "../public")));

proxy.traverse((urlPath, processJsonrpcRequest) => {
  router.post(urlPath, function *() {
    this.body = yield processJsonrpcRequest(this.request.body);
  });
});

router.get("/hello/:name", function *() {
  this.body = yield proxy.api.hello(this.params.name);
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = process.env.PORT || 3000;
app.listen(port);
console.log(`listening on port ${port}`);
