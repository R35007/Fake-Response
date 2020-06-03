import axios from "axios";
import bodyParser from "body-parser";
import chalk from "chalk";
import cors from "cors";
import express from "express";
import { Server } from "http";
import * as _ from "lodash";
import { Config, Db, Globals, Middleware, MiddlewareParams, RouteResult, Status, UserDB } from "./model";
import { Validators } from "./Validators";

const fs = require("fs"),
  path = require("path");

export class FakeResponse extends Validators {
  app: express.Application;
  server: Server;
  availableRoutes: string[] = [];
  fullDbData: object = {};
  routesResults: RouteResult[] = [];

  private isServerLaunched = false;
  private isExpressAppCreated = false;
  private isDataLoaded = false;
  private isServerStarted = false;
  private isResourcesLoaded = false;
  private isDefaultsCreated = false;

  constructor(db?: UserDB, config?: Config, globals?: Globals) {
    super(db, config, globals);
  }

  launchServer = async () => {
    try {
      if (this.isServerLaunched) return;
      this.createExpressApp();
      this.loadData();
      const server = await this.startServer();
      const results = await this.loadResources();
      await this.createDefaultRoutes();
      console.log("\n" + chalk.gray("watching...") + "\n");
      this.isServerLaunched = true;
      return {
        app: this.app,
        server,
        results,
        db: <Db[]>this.db,
        config: this.config,
        globals: this.globals,
        fullDbData: this.fullDbData,
      };
    } catch (err) {
      console.error(chalk.red(err.message));
    }
  };

  createExpressApp = () => {
    if (this.isExpressAppCreated) return this.app;
    this.app = express();
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(bodyParser.json());
    this.app.use(logResponseTime);
    this.app.use(errorHandler);
    this.app.use(cors({ origin: true, credentials: true }));
    this.isExpressAppCreated = true;
    return this.app;
  };

  loadData = (
    userConfig: Config = this.config,
    userGlobals: Globals = this.globals,
    userDb: Db[] | object | string = this.db
  ) => {
    if (this.isDataLoaded) {
      return {
        db: this.db,
        config: this.config,
        globals: this.globals,
      };
    }
    console.log("\n" + chalk.blue("/{^_^}/ Hi!"));
    console.log("\n" + chalk.gray("Loading Data..."));

    const { valid_config, valid_globals, valid_db } = this.getValidData(userConfig, userGlobals, userDb);

    this.db = valid_db;
    this.config = valid_config;
    this.globals = valid_globals;

    console.log(chalk.gray("Done."));
    this.isDataLoaded = true;
    return {
      db: valid_db,
      config: valid_config,
      globals: valid_globals,
    };
  };

  startServer = (port: number = this.config.port): Promise<Server> => {
    if (this.isServerStarted) return Promise.resolve(this.server);
    return new Promise((resolve, reject) => {
      console.log("\n" + chalk.gray("Starting Server..."));
      this.server = this.app
        .listen(port, () => {
          console.log(chalk.green.bold("Fake Response Server Started"));
          this.isServerStarted = true;
          resolve(this.server);
        })
        .on("error", (err) => {
          this.isServerStarted = false;
          reject(err);
        });
    });
  };

  stopServer = (): Promise<Boolean> => {
    return new Promise((resolve, reject) => {
      this.server
        .close(() => {
          console.log(chalk.gray("\n Fake Response Server Stopped"));
          resolve(true);
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  };

  // #region Load Resources
  loadResources = async () => {
    if (this.isResourcesLoaded) return Promise.resolve(this.routesResults);
    if (!this.isDataLoaded) {
      this.loadData();
    }
    try {
      console.log("\n" + chalk.gray("Loading Resources...") + "\n");
      const dbList = <Db[]>this.db;
      const requests = dbList.map(
        (data, i) =>
          new Promise(async (resolve) => {
            const results = await this.generateRoutes(data, i);
            resolve(results);
          })
      );
      const results = await Promise.all(requests);
      console.log("\n" + chalk.gray("Done. Resources Loaded."));
      this.routesResults = <RouteResult[]>_.flatten(results);
      this.isResourcesLoaded = true;
      return this.routesResults;
    } catch (err) {
      console.error(chalk.red(err.message));
    }
  };

  /**
   * @private This method is used privately inside the class. Please avoid using externally
   */
  private generateRoutes = async (db: Db, index: number): Promise<RouteResult[]> => {
    const { data = "", dataType = "default", routes = [], _d_index = index }: Db = db;

    try {
      const response =
        dataType === "url"
          ? await this.getResponseFromURL(data)
          : dataType === "file"
          ? this.getResponseFromFile(data, db)
          : data;

      const results = (<string[]>routes).reduce((result: RouteResult[], route, i) => {
        return result.concat(this.generateRoute(route, response, db, i, index));
      }, []);
      return results;
    } catch (err) {
      console.error(chalk.red(`  http://localhost:${this.config.port} `) + `- ${err.message} @index : ${_d_index}`);
      return [{ routes, _d_index, _s_index: index, status: "failure", error: err.message }];
    }
  };

  /**
   * @private This method is used privately inside the class. Please avoid using externally
   */
  private generateRoute = (route, response, db, _r_index, _s_index): RouteResult => {
    const { dataType, middlewares, delays, _d_index = _s_index } = db;
    try {
      this.createRoute(response, dataType, route, middlewares[_r_index], delays[_r_index]);
      const status = <Status>"success";
      return { routes: route, _d_index, _s_index, _r_index, status };
    } catch (err) {
      console.log(
        chalk.red(`  http://localhost:${this.config.port}${route} `) +
          `- ${err.message} @index : ${_d_index}:${_r_index}`
      );
      const status = <Status>"failure";
      return { routes: route, _d_index, _s_index, _r_index, status, error: err.message };
    }
  };

  /**
   * @private This method is used privately inside the class. Please avoid using externally
   */
  private getResponseFromURL = async (data) => {
    if (_.isString(data) && this.isValidURL(data)) {
      return await axios.get(data).then((res) => res.data);
    } else if (_.isPlainObject(data) && _.isString(data.url) && this.isValidURL(data.url)) {
      const { url, config = {} } = data;
      return await axios.get(url, config).then((res) => res.data);
    } else {
      throw new Error("Invalid URL. Please provide a valid URL");
    }
  };

  /**
   * @private This method is used privately inside the class. Please avoid using externally
   */
  private getResponseFromFile = (data, db) => {
    const parsedUrl = this.parseUrl(data);
    if (!_.isObject(data) && _.isString(data) && fs.existsSync(parsedUrl)) {
      const fileExtension = path.extname(parsedUrl);
      if (fileExtension === ".json" || fileExtension === ".txt") {
        db.dataType = "default";
      }
      return fileExtension === ".json"
        ? JSON.parse(fs.readFileSync(parsedUrl, "utf8"))
        : fileExtension === ".txt"
        ? fs.readFileSync(parsedUrl, "utf8")
        : parsedUrl;
    }

    throw new Error("Invalid Path. Please provide a valid path.");
  };
  // #endregion Load Resources

  createRoute = (
    data: any,
    dataType: string,
    route: string,
    middleware: Middleware = this.emptyMiddleware,
    delay?: number
  ) => {
    this.checkRoute(dataType, route, middleware, delay); // throws Error if any of the data is invalid.
    this.fullDbData[route] = data;
    const delayTime = getDelayTime(route, delay, this.config.delay);
    this.app.all(route, [
      specificMiddleware(data, middleware, this.globals, delayTime),
      commonMiddleware(data, this.config.middleware, this.globals, delayTime),
      defaultMiddleware(data, dataType),
    ]);
    console.log("  http://localhost:" + this.config.port + route);
  };

  private checkRoute(dataType, route, middleware, delay) {
    if (["url", "file", "default"].indexOf(dataType) < 0) throw new Error("Please provide a valid dataType");
    if (!_.isString(route) || !route.startsWith("/") || isDuplicateRoute(route, this.availableRoutes))
      throw new Error("Please provide a valid route");
    if (!_.isFunction(middleware)) throw new Error("Please provide a valid middleware");
    if (typeof delay !== "undefined" && !_.isInteger(delay)) throw new Error("Please provide a valid delay");
  }

  createDefaultRoutes = () => {
    if (this.isDefaultsCreated) return;
    const HOME = "/",
      DB = "/db",
      ROUTESLIST = "/routesList";
    const defaultRoutes = [];

    if (this.availableRoutes.indexOf(HOME) < 0) {
      defaultRoutes.push(HOME);
      this.app.use(express.static(path.join(__dirname, "../public")));
    }
    if (this.availableRoutes.indexOf(DB) < 0) {
      defaultRoutes.push(DB);
      this.app.all(DB, (req, res) => {
        res.send(this.fullDbData);
      });
    }
    if (this.availableRoutes.indexOf(ROUTESLIST) < 0) {
      defaultRoutes.push(ROUTESLIST);
      this.app.all(ROUTESLIST, (req, res) => {
        res.send(this.availableRoutes);
      });
    }
    defaultRoutesLog(defaultRoutes, this.config.port);
    this.isDefaultsCreated = true;
  };
}

// #region Default Common Middlewares
const logResponseTime = (req, res, next) => {
  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
    if (["/style.css", "/script.js", "/favicon.ico"].indexOf(req.path) < 0)
      console.log(`${req.method} ${req.path} ` + getStatusCodeColor(res.statusCode) + ` ${elapsedTimeInMs} ms`);
  });

  next();
};

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

const errorHandler = (err, req, res, next) => {
  if (!err) return next();
  console.log(chalk.red("! Error.Something went wrong"));
};
//#endregion

//#region User Middlewares
const specificMiddleware = (data: any, middleware: Middleware, globals: Globals, delay: number) => {
  return (req, res, next) => {
    const params: MiddlewareParams = { req, res, next, data, globals };
    setTimeout(() => {
      try {
        middleware(params);
      } catch (err) {
        console.error("\n" + chalk.red(err.message));
        res.send(err);
      }
    }, delay);
  };
};

const commonMiddleware = (data: any, middleware, globals: Globals, delay: number) => {
  return (req, res, next) => {
    if (middleware.excludeRoutes.indexOf(req.path) < 0) {
      const params: MiddlewareParams = { req, res, next, data, globals };
      setTimeout(() => {
        try {
          middleware.func(params);
        } catch (err) {
          console.error("\n" + chalk.red(err.message));
          res.send(err);
        }
      }, delay);
    } else {
      next();
    }
  };
};

const defaultMiddleware = (data: any, dataType: string) => {
  return (req, res, next) => {
    try {
      if (!res.headersSent) {
        dataType === "file" ? res.sendFile(this.parseUrl(data)) : res.send(data);
      }
    } catch (err) {
      console.error("\n" + chalk.red(err.message));
      res.send(err);
    }
  };
};
//#endregion

const getDelayTime = (route, specificDelay, commonDelay) => {
  const commonDelayTime = commonDelay.excludeRoutes.indexOf(route) < 0 ? commonDelay.time : 0;
  return typeof specificDelay !== "undefined" && specificDelay >= 0 ? specificDelay : commonDelayTime.time;
};

const isDuplicateRoute = (route, availableRoutes) => {
  if (availableRoutes.indexOf(route) < 0) {
    availableRoutes.push(route);
    return false;
  }
  throw new Error("Duplicate Route");
};

const defaultRoutesLog = (defaultRoutes, port) => {
  if (defaultRoutes.length > 0) {
    console.log("\n" + chalk.white.bold("Default Routes : ") + "\n");
  }
  defaultRoutes.map((route) => {
    const name = route === "/" ? "HOME" : route.replace("/", "").toUpperCase();
    console.log(chalk.white.bold(name) + "  :  http://localhost:" + port + route);
  });
};

/**
 * @deprecated Since version 2.1.1. has be deleted in version 3.0. Use fakeResponse = new FakeResponse().launchServer(); instead.
 */
export const getResponse = (db?: Db[], config?: Config, globals?: Globals) => {
  console.warn("\n" + chalk.red("! Calling deprecated function !") + "\n");
  console.warn(chalk.red("This function has been deprecated since version 2.1.1."));
  console.warn(chalk.red("Please use use the below code \n"));
  console.log(chalk.gray('import { FakeResponse } from "fake-response"'));
  console.log(chalk.gray("const fakeResponse = new FakeResponse(db, config, globals)"));
  console.log(chalk.gray("const fakeResponse.launchServer();"));
};
