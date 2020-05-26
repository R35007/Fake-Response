import { Db, Middleware, Config, Globals } from "./model";

const path = require("path");

const override: Middleware = () => ({
  id: 2,
  value: "This is a overridden response",
});

const responseSequence: Middleware = ({ data, globals }) => {
  const responses = [data, "init", "start", "hold", "stop"];
  globals.value = responses[responses.indexOf(globals["value"]) + 1]; // loop through responses for each request
  return globals.value;
};

const setResponseToGlobal: Middleware = ({ data, globals }) => {
  globals.sharedResponse = data;
  return false;
};

const getSharedResponse: Middleware = ({ globals }) => {
  return globals.sharedResponse;
};

export const default_db: Db[] = [
  {
    data: "Hello World",
    routes: ["/hello"],
  },
  {
    data: "Response changes for each request",
    routes: ["/sequence"],
    middlewares: responseSequence,
  },
  {
    data: "This response is shared",
    routes: ["/shareResponse"],
    middlewares: setResponseToGlobal,
  },
  {
    routes: ["/getResponse"],
    middlewares: [getSharedResponse], // returns the `This response is shared` from `/shareResponse` route
  },
  {
    data: "This response is delayed for 6000 milliseconds",
    routes: ["/delay"],
    delays: 6000,
  },
  {
    data: { id: 1, value: "My Response" },
    routes: ["/override", "/override/:id"],
    middlewares: override,
  },
  {
    data: require("../assets/users.json"),
    routes: ["/users", "/data/:id", "/parent/child"],
    middlewares: [, override, override],
    delays: [2000, 3000, 5000],
  },
  {
    data: path.resolve(__dirname, "../assets/users.json"),
    dataType: "file",
    routes: ["/json"],
  },
  {
    data: path.resolve(__dirname, "../assets/article.txt"),
    dataType: "file",
    routes: ["/txt"],
  },
  {
    data: "https://jsonplaceholder.typicode.com/todos/1",
    dataType: "url",
    routes: ["/todos/:id"],
  },
  {
    data: {
      url: "https://jsonplaceholder.typicode.com/posts/1",
      config: {}, // can pass any authorization or other option. Please verify Axios
    },
    dataType: "url",
    routes: ["/posts/:id"],
  },
];

export const default_config: Config = {
  port: 3000,
  middleware: {
    func: () => false,
    excludeRoutes: [],
  },
  delay: {
    time: 0, // must be in milliseconds
    excludeRoutes: [],
  },
};

export const default_globals: Globals = {};

export const db = default_db;
export const config = default_config;
export const globals = default_globals;
