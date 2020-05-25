import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import chalk from "chalk";
import {
  Db,
  Middleware,
  MiddlewareParams,
  DataUrl,
  Config,
  Globals,
} from "./model";
import { default_db, default_config, default_globals } from "./defaults";

let globals: any = { ...default_globals };
let db: any = [...default_db];
let config: any = { ...default_config };

const getStatusCodeColor = (statusCode: number) => {
  if (statusCode === 200) {
    return chalk.green(statusCode);
  } else if (statusCode >= 300 && statusCode < 400) {
    return chalk.blue(statusCode);
  } else if (statusCode >= 400 && statusCode < 500) {
    return chalk.red(statusCode);
  } else {
    return chalk.yellow(statusCode);
  }
};

const logResponseTime = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
    console.log(
      `${req.method} ${req.path} ` +
        getStatusCodeColor(res.statusCode) +
        ` ${elapsedTimeInMs} ms`
    );
  });

  next();
};

const app: express.Application = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(logResponseTime);

const fs = require("fs"),
  path = require("path");

const availableRoutes: string[] = [];
const defaultRoutes: string[] = [];
const fullDbData: object = {};

export const getConfig = (): Config => config;

export const getDb = (): Db[] => db;

export const getGlobals = (): Globals => globals;

const startServer = () => {
  return new Promise((resolve) => {
    app.listen(config.port, () => {
      console.log(`Server listening at http://localhost:${config.port}`);
      console.log();
      resolve();
    });
  });
};

const isDuplicateRoute = (route: string, data: any) => {
  if (availableRoutes.indexOf(route) < 0) {
    fullDbData[route] = data;
    return false;
  } else {
    console.log();
    console.log(`Duplicate route : ${route}`);
    console.log();
    return true;
  }
};

const getMiddlewareValue = (
  route: string,
  middleware: Middleware,
  params: MiddlewareParams
) => {
  let common: Middleware | boolean = false;
  const specific = middleware(params);

  if (config.middleware.excludeRoutes.indexOf(route) < 0) {
    common = config.middleware.func(params);
  }

  return { specific, common };
};

const getDelayTime = (route: string, delay: number) => {
  let commonDelayTime = 0;

  if (config.delay.excludeRoutes.indexOf(route) < 0) {
    commonDelayTime = config.delay.time;
  }

  return typeof delay !== "undefined" && delay >= 0 ? delay : commonDelayTime;
};

const sendResponse = (
  data: any,
  dataType: string,
  route: string,
  middleware: Middleware = () => {},
  delay: number
) => {
  app.all(route, (req: express.Request, res: express.Response) => {
    try {
      const delayTime = getDelayTime(route, delay);
      setTimeout(() => {
        const params: MiddlewareParams = { req, res, data, globals };
        const middlwares = getMiddlewareValue(route, middleware, params);
        const response = middlwares.specific || middlwares.common || data;
        dataType === "file" ? res.sendFile(response) : res.send(response);
      }, delayTime);
    } catch (err) {
      console.log();
      console.error(err);
      console.log();
      res.send(err);
    }
  });
};

const fillArray = (value: Middleware | number, len: number) => {
  var arr = [];
  for (var i = 0; i < len; i++) {
    arr.push(value);
  }
  return arr;
};

async function asyncFunction(db: Db, resolve: Function) {
  const {
    data = "",
    dataType = "default",
    routes = [],
    middlewares = [],
    delays = [],
  } = db;

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

    const len = routes.length;

    const mdlwar = Array.isArray(middlewares)
      ? middlewares
      : fillArray(middlewares, len);

    const dly = Array.isArray(delays) ? delays : fillArray(delays, len);

    routes.map((route: string, i: number) => {
      if (!isDuplicateRoute(route, resp)) {
        sendResponse(resp, dataType, route, mdlwar[i], dly[i]);
      }
    });
  } catch (err) {
    console.log();
    console.error(err);
    console.log();
  } finally {
    resolve();
  }
}

const log = () => {
  console.log();
  console.log(chalk.green.bold("Done. Fake Response Server Started..."));
  console.log();
  console.log(chalk.white.bold("Resources : "));
  console.log();
  app._router.stack.map((r) => {
    if (r.route && r.route.path && defaultRoutes.indexOf(r.route.path) < 0) {
      console.log("  http://localhost:" + config.port + r.route.path);
    }
  });
  if (defaultRoutes.length > 0) {
    console.log();
    console.log(chalk.white.bold("Default Routes : "));
  }
  console.log();
  defaultRoutes.map((route) => {
    const name = route === "/" ? "HOME" : route.replace("/", "").toUpperCase();
    console.log(chalk.white.bold(name));
    console.log("  http://localhost:" + config.port + route);
    console.log();
  });

  return;
};

const createDefaultAPIS = () => {
  const HOME = "/",
    DB = "/db",
    ROUTESLIST = "/routesList",
    FAVICON = "/favicon.ico";
  if (availableRoutes.indexOf(HOME) < 0) {
    defaultRoutes.push(HOME);
    app.all(HOME, (req, res) => {
      res.sendFile(path.join(__dirname, "../assets", "index.html"));
    });
  }
  if (availableRoutes.indexOf(DB) < 0) {
    defaultRoutes.push(DB);
    app.all(DB, (req, res) => {
      res.send(fullDbData);
    });
  }
  if (availableRoutes.indexOf(ROUTESLIST) < 0) {
    defaultRoutes.push(ROUTESLIST);
    app.all(ROUTESLIST, (req, res) => {
      res.send(Object.keys(fullDbData));
    });
  }
  if (availableRoutes.indexOf(FAVICON) < 0) {
    defaultRoutes.push(FAVICON);
    app.all(FAVICON, (req, res) => {
      res.sendFile(path.join(__dirname, "../assets/favicon.ico"));
    });
  }

  return;
};

const init = (userDb: Db[], userConfig: Config, userGlobals: Globals) => {
  console.log();
  console.log(chalk.blue("/{^_^}/ hi!"));
  console.log();
  console.log(chalk.gray("Loading Db"));
  if (!userDb) {
    console.log();
    console.log(chalk.yellow("Oops, Db not found. Using sample DB"));
  }
  if (!userConfig) {
    console.log(chalk.yellow("Oops, Config not found. Using default Config"));
  }
  if (!userGlobals) {
    console.log(chalk.yellow("Oops, Globals not found. Using default Globals"));
  }

  db = userDb || db;
  config = { ...config, ...userConfig };
  globals = { ...globals, ...userGlobals };
};

export const getResponse = (
  userDb?: Db[],
  userConfig?: Config,
  userGlobals?: Globals
) => {
  return new Promise((resolve, reject) => {
    try {
      init(userDb, userConfig, userGlobals);

      let requests = db.map(
        (data: Db) =>
          new Promise((_resolve) => {
            asyncFunction(data, _resolve);
          })
      );

      Promise.all(requests)
        .then(() => createDefaultAPIS())
        .then(() => log())
        .then(() => startServer())
        .then(() => resolve({ db, config, fullDbData, globals }));
    } catch (err) {
      console.log();
      console.error(err);
      console.log();
      reject(err);
    }
  });
};
