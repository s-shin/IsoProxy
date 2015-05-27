import IsoProxy from "isoproxy";
import {isServer} from "./runtime";

const proxy = new IsoProxy({
  root: "/api",
  isServer
});

export default proxy;
