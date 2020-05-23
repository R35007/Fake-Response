import express from "express";
import { RouteConfig } from "./route-config-model";

const fs = require("fs"),
  path = require("path");

const logTime = (req: express.Request, res: express.Response, data: any) => {
  console.log(new Date());
};

const override = (req: express.Request) => ({ id: 2, ...req.body });

const getData = () => ({ id: 1, name: "Siva" });

const routeConfigs: RouteConfig[] = [
  {
    data: { id: 1, name: "Siva" },
    routes: ["/users/:id"],
  },
  {
    data: "Hello World",
    routes: ["/hello"],
  },
  {
    data: getData(),
    routes: ["/func"],
  },
  {
    data: require("../assets/users.json"),
    routes: ["/users", "/data/:id", "/users/siva"],
    middlewares: [, override, logTime],
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

export default routeConfigs;
