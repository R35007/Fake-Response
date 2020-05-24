import express from "express";
import { Db, Globals } from "./model";

const path = require("path");

const override = () => ({
  id: 2,
  value: "This is a overridden response",
});

const getData = () => ({ id: 1, name: "Siva" });

const responseSequence = (
  req: express.Request,
  res: express.Response,
  data: any,
  globals: Globals
) => {
  const responses = [data, "init", "start", "hold", "stop"];
  globals.value = responses[responses.indexOf(globals["value"]) + 1]; // loop through responses for each request
  return globals.value;
};

const setResponseToGlobal = (
  req: express.Request,
  res: express.Response,
  data: any,
  globals: Globals
) => {
  globals.sharedResponse = data;
  return false;
};

const getSharedResponse = (
  req: express.Request,
  res: express.Response,
  data: any,
  globals: Globals
) => {
  return globals.sharedResponse;
};

export const db: Db[] = [
  {
    data: "Hello World",
    routes: ["/hello"],
  },
  {
    data: "Response changes for each request",
    routes: ["/sequence"],
    middlewares: [responseSequence],
  },
  {
    data: "This response is shared",
    routes: ["/shareResponse"],
    middlewares: [setResponseToGlobal],
  },
  {
    routes: ["/getResponse"],
    middlewares: [getSharedResponse], // returns the `This response is shared` from `/shareResponse` route
  },
  {
    data: "This response is delayed for 6000 milliseconds",
    routes: ["/delay"],
    delays: [6000],
  },
  {
    data: { id: 1, value: "My Response" },
    routes: ["/users/:id"],
    middlewares: [override],
  },
  {
    data: getData(),
    routes: ["/func"],
  },
  {
    data: require("../assets/users.json"),
    routes: ["/users", "/data/:id", "/parent/child"],
    middlewares: [, override, override],
  },
  {
    data: path.resolve(__dirname, "../assets/users.json"),
    dataType: "file",
    routes: ["/json"],
  },
  {
    data: path.resolve(__dirname, "../assets/Sunset_Birds.jpg"),
    dataType: "file",
    routes: ["/image"],
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
      url: "https://jsonplaceholder.typicode.com/todos",
      config: {}, // can pass any authorization or other option. Please verify Axios
    },
    dataType: "url",
    routes: ["/todos"],
  },
];

export const config = {
  port: 3000,
  middleware: {
    func: () => console.log(new Date()),
    excludeRoutes: ["/hello"],
  },
  delay: {
    time: 500,
    excludeRoutes: ["/hello"],
  },
};

export const globals = {
  value: false,
  sharedResponse: false,
};
