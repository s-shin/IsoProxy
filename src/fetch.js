/**
 * WHATWG fetch polyfill for client side.
 */

var fetch;

if (typeof window !== "undefined") {
  if (!window.fetch) {
    require("whatwg-fetch");
  }
  fetch = window.fetch;
}

export default fetch;
