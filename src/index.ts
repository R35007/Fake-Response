import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { RouteConfig, Middleware, DataUrl } from "./route-config-model";
import sample_route from "./route";

const app: express.Application = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const fs = require("fs"),
  path = require("path");

const availableRoutes: string[] = [];
const defaultRoutes: string[] = [];
const db: object = {};

const startServer = (port: number) => {
  app.listen(port, () =>
    console.log(`Server listening at http://localhost:${port}`)
  );
};

const isDuplicateRoute = (route: string, data: any) => {
  if (availableRoutes.indexOf(route) < 0) {
    db[route] = data;
    return false;
  } else {
    console.log();
    console.log(`Duplicate route : ${route}`);
    console.log();
    return true;
  }
};

const sendResponse = (
  data: any,
  dataType: string,
  route: string,
  middleware: Middleware = () => {}
) => {
  app.all(route, (req: express.Request, res: express.Response) => {
    const overrideData = middleware(req, res, data);
    dataType === "file"
      ? res.sendFile(overrideData || data)
      : res.send(overrideData || data);
  });
};

async function asyncFunction(routeConfig: RouteConfig, resolve: Function) {
  const {
    data = "",
    dataType = "default",
    routes = [],
    middlewares = [],
  } = routeConfig;

  let resp: any = "";

  try {
    if (dataType.toLowerCase() === "url") {
      if (typeof data === "string") {
        resp = await axios.get(data).then((res) => res.data);
      } else if (typeof data === "object") {
        const { url = "", config = {} } = <DataUrl>data;
        resp = await axios.get(url, config).then((res) => res.data);
      }
    } else if (
      dataType.toLowerCase() === "file" ||
      dataType.toLowerCase() === "default"
    ) {
      resp = data;
    } else {
      throw Error(
        "Invalid Data Type. The Data type must be one of there. `default` | `file` || `url `"
      );
    }

    routes.map((route: string, i: number) => {
      if (!isDuplicateRoute(route, resp)) {
        sendResponse(resp, dataType, route, middlewares[i]);
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    resolve();
  }
}

const log = (port: number) => {
  console.log();
  app._router.stack.map((r) => {
    if (r.route && r.route.path && defaultRoutes.indexOf(r.route.path) < 0) {
      console.log("http://localhost:" + port + r.route.path);
    }
  });

  console.log();
  defaultRoutes.map((route) => {
    const name = route === "/" ? "HOME" : route.replace("/", "").toUpperCase();
    console.log(name);
    console.log("http://localhost:" + port + route);
    console.log();
  });

  startServer(port);
};

const createDefaultAPIS = (port: number) => {
  const HOME = "/",
    DB = "/db",
    ROUTESLIST = "/routesList";
  if (availableRoutes.indexOf(HOME) < 0) {
    defaultRoutes.push(HOME);
    app.all(HOME, (req, res) => {
      res.sendFile(path.join(__dirname, "../assets", "index.html"));
    });
  }
  if (availableRoutes.indexOf(DB) < 0) {
    defaultRoutes.push(DB);
    app.all(DB, (req, res) => {
      res.send(db);
    });
  }
  if (availableRoutes.indexOf(ROUTESLIST) < 0) {
    defaultRoutes.push(ROUTESLIST);
    app.all(ROUTESLIST, (req, res) => {
      res.send(Object.keys(db));
    });
  }

  log(port);
};

export const getResponse = (
  routeConfig: RouteConfig[] = sample_route,
  port: number = 3000
) => {
  try {
    let requests = routeConfig.map(
      (data: RouteConfig) =>
        new Promise((resolve) => {
          asyncFunction(data, resolve);
        })
    );

    Promise.all(requests).then(() => {
      createDefaultAPIS(port);
    });
  } catch (err) {
    console.log(err);
  }
};
