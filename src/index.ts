import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { Db, Middleware, DataUrl, Config } from "./model";
import { db as sample_db } from "./db";

const app: express.Application = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const fs = require("fs"),
  path = require("path");

const availableRoutes: string[] = [];
const defaultRoutes: string[] = [];
const db: object = {};
const config: Config = {
  port: 3000,
  middleware: () => false,
  excludeRoutes: [],
};

export const getConfig = (): Config => config;

export const getSampleDb = (): Db[] => sample_db;

export const getDb = (): object => db;

const setConfig = ({ port, middleware, excludeRoutes }: Config) => {
  config.port = port || config.port;
  config.middleware = middleware || config.middleware;
  config.excludeRoutes = excludeRoutes || config.excludeRoutes;
};

const startServer = () => {
  app.listen(config.port, () => {
    console.log(`Server listening at http://localhost:${config.port}`);
    console.log();
  });
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
    let commonMiddleware: Middleware | boolean = false;
    const specificMiddleware = middleware(req, res, data);
    if (config.excludeRoutes.indexOf(route) < 0) {
      commonMiddleware = config.middleware(req, res, data);
    }

    const response = specificMiddleware || commonMiddleware || data;
    dataType === "file" ? res.sendFile(response) : res.send(response);
  });
};

async function asyncFunction(db: Db, resolve: Function) {
  const { data = "", dataType = "default", routes = [], middlewares = [] } = db;

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
        "Invalid Data Type. The Data type must be one of these. `default` | `file` || `url `"
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

const log = () => {
  console.log();
  console.log("Fake Response Server Started...");
  console.log();
  console.log("Resources : ");
  console.log();
  app._router.stack.map((r) => {
    if (r.route && r.route.path && defaultRoutes.indexOf(r.route.path) < 0) {
      console.log("http://localhost:" + config.port + r.route.path);
    }
  });
  if (defaultRoutes.length > 0) {
    console.log();
    console.log("Default Routes : ");
  }
  console.log();
  defaultRoutes.map((route) => {
    const name = route === "/" ? "HOME" : route.replace("/", "").toUpperCase();
    console.log(name);
    console.log("http://localhost:" + config.port + route);
    console.log();
  });

  startServer();
};

const createDefaultAPIS = () => {
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

  log();
};

export const getResponse = (db?: Db[], config?: Config) => {
  try {
    if (!db) {
      console.log();
      console.log("Db not found. using sample DB");
      db = getSampleDb();
    }

    if (!config) {
      console.log("Config not found. using default Config");
      console.log();
      getConfig();
    } else {
      setConfig(config);
    }

    let requests = db.map(
      (data: Db) =>
        new Promise((resolve) => {
          asyncFunction(data, resolve);
        })
    );

    Promise.all(requests).then(() => {
      createDefaultAPIS();
    });
  } catch (err) {
    console.log(err);
  }
};
