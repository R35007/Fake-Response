/**
 * Try it out the samples here.
 * To Run the Sample, Go to command Prompt and Run the following command
 *
 * Fake-Response
 *
 */
import { Config, Db, Globals, Injectors } from "../model";
import {
  commonMiddleware,
  getJsonData,
  getSharedResponse,
  globalDescription,
  override,
  responseSequence,
  setResponseToGlobal,
  getInjectedData,
  queryUser,
} from "./middlewares";

const path = require("path");

export const sample_db: Db[] = [
  {
    data: "Hello World",
    routes: ["hello", "world"],
  },
  {
    routes: ["globalDescription"],
    middlewares: globalDescription,
  },
  {
    data: "Response changes for each request",
    routes: "/sequence",
    middlewares: responseSequence,
  },
  {
    env: {
      prod: "This is a prod env response",
      anyUserDefinedEnv: "Any other response",
    },
    data: "this is a default response. its changes as per the config env",
    routes: ["env"],
  },
  {
    routes: "getResponse",
    middlewares: [getSharedResponse], // returns the query params from `/shareResponse` route
  },
  {
    data: "This a shared response",
    routes: "/shareResponse",
    middlewares: setResponseToGlobal,
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
    data: "This Route has been injected with a middleware using Injectors",
    routes: "injector",
  },
  {
    data: "./users.json", // is relative to the rootPath in config
    dataType: "file",
    routes: ["/json", "queryUser/:id"],
    middlewares: [getJsonData, queryUser],
  },
  {
    data: "https://jsonplaceholder.typicode.com/posts/:id/comments",
    dataType: "url",
    routes: ["/posts/:id/comments"],
  },
  {
    data: "https://r35007.github.io/Siva_Profile/images/portfolio/Sunset_Birds.jpg",
    dataType: "url",
    routes: ["/imageUrl"],
  },
  {
    data: {
      url: "https://jsonplaceholder.typicode.com/comments/:id",
      config: {}, // can pass any authorization or other option. Please verify Axios
    },
    dataType: "url",
    routes: ["/comments/:id"],
  },
  {
    data: "This routes are proxy routes",
    routes: ["dummy/1", "dummy/2", "dummy/1/2"],
  },
  {
    data: "data 1",
    routes: ["parent/1"],
  },
  {
    data: "data 2",
    routes: ["parent/2"],
  },
  {
    data: "data 3, 4",
    routes: ["parent/3", "parent/4"],
  },
];

export const sample_config: Config = {
  port: 3000,
  env: "prod", // empty by default
  rootPath: path.resolve(__dirname, "../../public"),
  middleware: {
    func: commonMiddleware,
    excludeRoutes: [],
  },
  delay: {
    time: 200, // must be in milliseconds
    excludeRoutes: ["hello", "world", "url", "json", "txt"],
  },
  groupings: {
    "parent/:id": "groupedRoute/:id",
  },
  proxy: {
    exactMatch: {
      "dummy/2": "proxy/2",
    },
    patternMatch: {
      "dummy/:child/:id": "proxy/:child/:id",
    },
  },
  // Note : First it applies proxy and then it excludes routes
  excludeRoutes: {
    exactMatch: ["dummy/1/2"], // excludes routes with exact match
    patternMatch: ["dummy/:id", "parent/:id"], // excludes every routes that matches this pattern
  },
};

export const sample_globals: Globals = {
  value: false,
  queryParams: false,
  description: "Hi! Welcome to Fake-Response Server. This response is from global default value",
};

// Helps to inject a middleware or delay for a specific route
export const sample_injectors: Injectors[] = [
  {
    middleware: getInjectedData,
    routes: ["/injector"],
  },
  {
    delay: 300,
    routes: ["/injector", "/delay"], // the delay 300 ms will ignored for /delay route since it already has a specific delay
  },
];

export const db = sample_db;
export const config = sample_config;
export const globals = sample_globals;
export const injectors = sample_injectors;
