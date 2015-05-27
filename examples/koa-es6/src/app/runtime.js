
const isServer = typeof window === "undefined";
const isClient = !isServer;

export {isServer, isClient};
