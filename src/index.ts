import bodyParser from "body-parser";
import chalk from "chalk";
import cors from "cors";
import express from "express";
import { Server } from "http";
import * as _ from "lodash";
import { Config, Db, Globals, Middleware, RouteResult, Status, UserDB, Injectors } from "./model";
import { Middlewares } from "./middlewares";

const fs = require("fs"),
  path = require("path");

export class FakeResponse extends Middlewares {
  app: express.Application;
  server: Server;
  availableRoutes: string[] = [];
  fullDbData: object = {};
  routesResults: RouteResult[] = [];

  private isServerLaunched = false;
  private isExpressAppCreated = false;
  private isServerStarted = false;
  private isResourcesLoaded = false;
  private isDefaultsCreated = false;

  constructor(db?: UserDB, config?: Config, globals?: Globals, injectors?: Injectors[]) {
    super(db, config, globals, injectors);
  }

  launchServer = async () => {
    try {
      if (!this.isValidated) throw new Error("Please fix the Data error before Launching Server");
      if (this.isServerLaunched) return;
      this.createExpressApp();
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
    this.app.use(this.logResponseTime);
    this.app.use(this.errorHandler);
    this.app.use(cors({ origin: true, credentials: true }));
    this.app.set("json spaces", 2);
    this.isExpressAppCreated = true;
    return this.app;
  };

  startServer = (port: number = this.config.port): Promise<Server> => {
    if(!this.app) this.createExpressApp();
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
    try {
      if(!this.app) this.createExpressApp();
      if (!this.isValidated) throw new Error("Please fix the Data error before Launching Server");
      if (this.isResourcesLoaded) return Promise.resolve(this.routesResults);
      console.log("\n" + chalk.gray("Loading Resources..."));
      const dbList = <Db[]>this.db;
      const requests = dbList.map(
        (db, dbIndex) =>
          new Promise(async (resolve) => {
            const results = await this.generateRoutes(db, dbIndex);
            resolve(results);
          })
      );
      const results = await Promise.all(requests);
      console.log(chalk.gray("Done. Resources Loaded."));
      this.routesResults = <RouteResult[]>_.flatten(results);
      this.isResourcesLoaded = true;
      return this.routesResults;
    } catch (err) {
      console.error(chalk.red(err.message));
    }
  };

  private generateRoutes = async (db: Db, _s_index: number): Promise<RouteResult[]> => {
    const { routes = [], _d_index = _s_index }: Db = db;
    try {
      if (routes.length === 0) throw new Error("routes not found. Please provide any route.");
      const results = (<string[]>routes).reduce((result: RouteResult[], route, _r_index) => {
        return result.concat(this.generateRoute(db, route, _r_index, _s_index));
      }, []);
      return results;
    } catch (err) {
      console.error(chalk.red(`  http://localhost:${this.config.port} `) + `- ${err.message} @index : ${_d_index}`);
      return [{ routes, _d_index, _s_index, status: "failure", error: err.message }];
    }
  };

  private generateRoute = (db, route, _r_index, _s_index): RouteResult => {
    const { data, dataType, middlewares, delays, _d_index = _s_index, env = {} } = db;
    try {
      const envData = env[this.config.env] || data;
      this.createRoute(envData, route, dataType, middlewares[_r_index], delays[_r_index]);
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

  createRoute = (data: any, route: string, dataType: string = "default", middleware?: Middleware, delay?: number) => {
    try {
      if(!this.app) this.createExpressApp();
      checkRoute(dataType, route, delay, this.availableRoutes); // throws Error if any of the data is invalid.
      this.fullDbData[route] = data;
      const delayTime = getDelayTime(route, delay, this.config.delay);
      const middlewareList = this.getMiddlewareList(data, dataType, middleware, this.config.middleware, delayTime, this.globals);
      this.app.all(route, middlewareList);
      // console.log("  http://localhost:" + this.config.port + route);
    } catch (err) {
      console.error(chalk.red(err.message));
    }
  };

  private getMiddlewareList(data, dataType, middleware, configMiddleware, delayTime, globals){
    if(configMiddleware.override){
      return[
        this.initialMiddlewareWrapper(data, dataType, middleware, configMiddleware, delayTime),
        this.commonMiddlewareWrapper(globals),
        this.specificMiddlewareWrapper(globals),
        this.defaultMiddleware,
      ]
    }

    return [
      this.initialMiddlewareWrapper(data, dataType, middleware, configMiddleware, delayTime),
      this.specificMiddlewareWrapper(globals),
      this.commonMiddlewareWrapper(globals),
      this.defaultMiddleware,
    ]
  }

  // #endregion Load Resources

  createDefaultRoutes = () => {
    if(!this.app) this.createExpressApp();
    if (this.isDefaultsCreated) return;
    const HOME = "/",
      DB = "/db",
      ROUTELIST = "/routesList";
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
    if (this.availableRoutes.indexOf(ROUTELIST) < 0) {
      defaultRoutes.push(ROUTELIST);
      this.app.all(ROUTELIST, (req, res) => {
        res.send(this.availableRoutes);
      });
    }
    defaultRoutesLog(defaultRoutes, this.config.port);
    this.isDefaultsCreated = true;
  };
}

// #region Utils
const getDelayTime = (route, specificDelay, commonDelay) => {
  const commonDelayTime = commonDelay.excludeRoutes.indexOf(route) < 0 ? commonDelay.time : false;
  if(commonDelay.override){
    return typeof commonDelayTime !== "undefined" && commonDelayTime >= 0 ? commonDelayTime : specificDelay;
  }
  return typeof specificDelay !== "undefined" && specificDelay >= 0 ? specificDelay : commonDelayTime || 0;
};

const checkRoute = (dataType, route, delay, availableRoutes) => {
  if (["url", "file", "default"].indexOf(dataType) < 0) throw new Error("Please provide a valid dataType");
  if (!_.isString(route) || !route.startsWith("/") || isDuplicateRoute(route, availableRoutes))
    throw new Error("Please provide a valid route");
  if (typeof delay !== "undefined" && !_.isInteger(delay)) throw new Error("Please provide a valid delay");
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

// #endregion