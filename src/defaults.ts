import { Config, Db, Globals, Middleware } from "./model";

const path = require("path");

const emptyMiddleware = ({ next }) => {
  next();
};

const override: Middleware = ({ res }) => {
  res.send({
    id: 2,
    value: "This is a overridden response",
  });
};

const responseSequence: Middleware = ({ res, data, globals }) => {
  const resp = [data, "init", "start", "hold", "stop"];
  const currentRespIndex = resp.indexOf(globals.value);
  globals.value = resp[currentRespIndex + 1] || resp[0]; // loop through responses for each request
  res.send(globals.value);
};

const setResponseToGlobal: Middleware = ({ res, req, globals }) => {
  if (Object.keys(req.query).length > 0) {
    globals.queryParams = req.query;
    res.send(`The query params are shared to /getResponse route.`);
  } else {
    res.send("Please set any query param to share to /getResponse route.");
  }
};

const getSharedResponse: Middleware = ({ res, globals }) => {
  const queryParams = globals.queryParams || {};
  const resp =
    Object.keys(queryParams).length > 0
      ? queryParams
      : "change the query param of /shareResponse route to get a dynamic result";
  res.send(resp);
};

export const default_db: Db[] = [
  {
    data: "Hello World",
    routes: "hello",
  },
  {
    data: "Response changes for each request",
    routes: "/sequence",
    middlewares: responseSequence,
  },
  {
    data: "This a shared response",
    routes: "/shareResponse",
    middlewares: setResponseToGlobal,
  },
  {
    routes: "getResponse",
    middlewares: [getSharedResponse], // returns the query params from `/shareResponse` route
  },
  {
    data: "This response is delayed for 3000 milliseconds",
    routes: "delay",
    delays: 3000,
  },
  {
    data: { id: 1, value: "My Response" },
    routes: "override",
    middlewares: override,
  },
  {
    data: "You could assign multiple routes, middlewares and delays for a single response",
    routes: ["/users", "/data/:id", "/parent/child"],
    delays: [1000, 2000, 3000],
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
  rootPath: "./",
  middleware: {
    func: emptyMiddleware,
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
