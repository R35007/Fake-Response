import bodyParser from "body-parser";
import chalk from "chalk";
import cors from "cors";
import express from "express";
import { Server } from "http";
import * as _ from "lodash";
import * as path from "path";
import * as url from "url";
import { Middlewares } from "./middlewares";
import {
  Config,
  Db,
  Globals,
  HAR,
  HarEntry,
  Injectors,
  Middleware,
  RouteResult,
  Status,
  UserDB,
  Valid_Config,
  Valid_ConfigMiddleware,
  Valid_Db,
  Valid_Injectors,
} from "./model";
import { sample_config, sample_db, sample_globals, sample_injectors } from "./samples";

/**
 * Create a Fake Response server instance using this class constructor.
 * @example
 * const {FakeResponse} = require("fake-response");
 * // validates and sets the Data
 * const fakeResponse = new FakeResponse(db, config, injectors, globals) // all params are optional
 * fakeResponse.launchServer() // runs the initialized db
 * @link https://r35007.github.io/Fake-Response/ - For further info pls visit this ReadMe
 */
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

  commonMiddlewareExcludeRoutes = [];
  commonDelayExcludeRoutes = [];

  constructor(db?: UserDB, config?: Config, injectors?: Injectors[], globals?: Globals) {
    super();
    console.log("\n" + chalk.blue("/{^_^}/ Hi!"));

    if (!(!db && !config && !injectors && !globals)) {
      this.setData(db, config, injectors, globals);
    }
  }

  /**
   * This function validates and sets the Data explicitly
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * fakeResponse.setData(db, config, injectors, globals);
   * @link https://github.com/R35007/Fake-Response#setdata - For further info pls visit this ReadMe
   */
  setData = (
    db: UserDB | Valid_Db = this.valid_DB,
    config: Config | Valid_Config = this.valid_Config,
    injectors: Injectors[] | Valid_Injectors[] = this.valid_Injectors,
    globals: Globals = this.valid_Globals
  ) => {
    console.log("\n" + chalk.gray("Loading Data..."));

    this.valid_Config = this.getValidConfig(config);
    this.valid_Globals = this.getValidGlobals(globals);
    this.valid_Injectors = this.getValidInjectors(injectors);
    this.valid_DB = this.getValidDb(db, this.valid_Injectors);

    console.log(chalk.gray("Done."));
    return {
      getData: this.getData,
      launchServer: this.launchServer,
    };
  };

  /**
   * This function helps to get initialized data
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const {db, config, injectors, globals} = fakeResponse.getData();
   * @link https://github.com/R35007/Fake-Response#getdata - For further info pls visit this ReadMe
   */
  getData = () => {
    return {
      db: this.valid_DB,
      config: this.valid_Config,
      injectors: this.valid_Injectors,
      globals: this.valid_Globals,
      availableRoutes: this.availableRoutes,
    };
  };

  /**
   * This function give the the final mock generation with groupings, proxy, excludeRoutes
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse(db, config)
   * const mock = fakeResponse.getMockJSON();
   * @link https://github.com/R35007/Fake-Response#getmockjson - For further info pls visit this ReadMe
   */
  getMockJSON = (): Array<{ [key: string]: any }> => {
    const db = <Db[]>this.valid_DB;
    const mock = db.map((d) => {
      const routes = <string[]>d.routes;
      return { [routes.join(",")]: d.data };
    });

    return mock;
  };

  /**
   * This function creates express app, starts the server loads the resources and creates default routes.
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * fakeResponse.launchServer() // if not provided anything in the constructor runs the sample db
   * @link https://r35007.github.io/Fake-Response/#launchserver - For further info pls visit this ReadMe
   */
  launchServer = async () => {
    try {
      if (!this.valid_DB && !this.valid_Config && !this.valid_Globals && !this.valid_Injectors) {
        console.log(chalk.yellow("\nUsing Sample Db"));
        console.log("visit : " + chalk.gray("`https://github.com/R35007/Fake-Response/blob/master/src/samples/index.ts`") + "\n");

        this.setData(sample_db, sample_config, sample_injectors, sample_globals);
      }
      if (!this.isValidated) throw new Error("Please fix the Data error before Launching Server");
      if (this.isServerLaunched) return;
      const app = this.createExpressApp();
      const server = await this.startServer();
      const results = await this.loadResources();
      await this.createDefaultRoutes();
      console.log("\n" + chalk.gray("watching...") + "\n");
      this.isServerLaunched = true;
      return {
        app,
        server,
        results,
        availableRoutes: this.availableRoutes,
      };
    } catch (err) {
      console.error(chalk.red(err.message));
      if (this.shouldThrowError) throw new Error(err.message);
    }
  };

  /**
   * This function creates express app with default middlewares.
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse(db)
   * const app = fakeResponse.createExpressApp() // creates and returns the express app.
   * @link https://r35007.github.io/Fake-Response/#createexpressapp - For further info pls visit this ReadMe
   */
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

  /**
   * This function starts the express server.
   * Please make sure you create the express app before starting the server
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse(db)
   * const app = fakeResponse.createExpressApp()
   * fakeResponse.startServer(3000) // the port is an optional param
   * @link https://github.com/R35007/Fake-Response#startserver - For further info pls visit this ReadMe
   */
  startServer = (port: number = this.valid_Config.port): Promise<Server> => {
    if (!this.app) this.createExpressApp();
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

  /**
   * This function stops the express server
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse(db)
   * const isStopped = fakeResponse.stopServer() // make sure the server is already started
   * @link https://github.com/R35007/Fake-Response#stopserver - For further info pls visit this ReadMe
   */
  stopServer = (): Promise<Boolean> => {
    return new Promise((resolve, reject) => {
      this.server
        .close(() => {
          this.resetValues();
          console.log(chalk.gray("\n Fake Response Server Stopped"));
          resolve(true);
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  };

  private resetValues = () => {
    this.isServerLaunched = false;
    this.isServerStarted = false;
    this.isResourcesLoaded = false;
    this.isDefaultsCreated = false;
    this.isExpressAppCreated = false;

    this.app = undefined;
    this.server = undefined;

    this.availableRoutes = [];
    this.fullDbData = {};
    this.routesResults = [];
    this.commonMiddlewareExcludeRoutes = [];
    this.commonDelayExcludeRoutes = [];
  };

  // #region Load Resources
  /**
   * This function helps to generate a route before starting the server
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse(db)
   * const result = fakeResponse.loadResources();
   * @link https://github.com/R35007/Fake-Response#loadresources - For further info pls visit this ReadMe
   */
  loadResources = async () => {
    try {
      if (!this.app) this.createExpressApp();
      if (!this.isValidated) throw new Error("Please fix the Data error before Launching Server");
      if (this.isResourcesLoaded) return Promise.resolve(this.routesResults);
      console.log("\n" + chalk.gray("Loading Resources..."));
      this.commonMiddlewareExcludeRoutes = this.getMatchedRoutesList(this.valid_DB, this.valid_Config.middleware.excludeRoutes);
      this.commonDelayExcludeRoutes = this.getMatchedRoutesList(this.valid_DB, this.valid_Config.delay.excludeRoutes);
      const requests = this.valid_DB.map(
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
      if (this.shouldThrowError) throw new Error(err.message);
    }
  };

  private generateRoutes = async (db: Valid_Db, _s_index: number): Promise<RouteResult[]> => {
    const { routes = [], _d_index = _s_index } = db;
    try {
      if (routes.length === 0) throw new Error("routes not found. Please provide any route.");
      return routes.map((route, _r_index) => this.generateRoute(db, route, _r_index, _s_index));
    } catch (err) {
      const errMsgRed = `  http://localhost:${this.valid_Config.port} `;
      const errMsg = `- ${err.message} @index : ${_d_index}`;
      console.error(chalk.red(errMsgRed) + errMsg);
      return [{ routes, _d_index, _s_index, status: "failure", error: err.message }];
    }
  };

  private generateRoute = (db: Valid_Db, route: string, _r_index: number, _s_index: number): RouteResult => {
    const { data, dataType, middlewares, delays, statusCodes, _d_index = _s_index, env = {} } = db;
    try {
      const envData = env[this.valid_Config.env] || data;
      this.createRoute(envData, route, dataType, statusCodes[_r_index], delays[_r_index], middlewares[_r_index]);
      const status = <Status>"success";
      return { routes: route, _d_index, _s_index, _r_index, status };
    } catch (err) {
      const errMsgRed = `  http://localhost:${this.valid_Config.port}${route} `;
      const errMsg = `- ${err.message} @index : ${_d_index}:${_r_index}`;
      console.log(chalk.red(errMsgRed) + errMsg);
      const status = <Status>"failure";
      return { routes: route, _d_index, _s_index, _r_index, status, error: err.message };
    }
  };

  /**
   * This function helps to create a route explicitly
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse(db)
   * 
   *const newResponse = {
        value : "New response"
   }
   * fakeResponse.createRoute('/newRoute',newResponse);
   * @link https://github.com/R35007/Fake-Response#createroute - For further info pls visit this ReadMe
   */
  createRoute = (data: any, route: string, dataType: string = "default", statusCode?: number, delay?: number, middleware?: Middleware) => {
    try {
      if (!this.app) this.createExpressApp();
      checkRoute(dataType, route, delay, statusCode, this.availableRoutes); // throws Error if any of the data is invalid.
      this.fullDbData[route] = data;
      const delayTime = getDelayTime(route, delay, this.valid_Config.delay, this.commonDelayExcludeRoutes);
      const middlewareList = this.getMiddlewareList(
        data,
        dataType,
        middleware,
        this.valid_Config.middleware,
        delayTime,
        statusCode,
        this.valid_Globals
      );
      this.app.all(route, middlewareList);
      // console.log("  http://localhost:" + this.valid_Config.port + route);
    } catch (err) {
      const errMsgRed = err.message;
      const errMsg = "  http://localhost:" + this.valid_Config.port + route + " : ";
      console.error(errMsg + chalk.red(errMsgRed));
    }
  };

  private getMiddlewareList = (
    data: any,
    dataType: string,
    middleware: Middleware | undefined,
    configMiddleware: Valid_ConfigMiddleware,
    delayTime: number,
    statusCode: number | undefined,
    globals: object
  ) => {
    if (configMiddleware.override) {
      return [
        this.initialMiddlewareWrapper(data, dataType, middleware, configMiddleware, delayTime, statusCode),
        this.commonMiddlewareWrapper(this.commonMiddlewareExcludeRoutes, globals),
        this.specificMiddlewareWrapper(globals),
        this.defaultMiddleware,
      ];
    }

    return [
      this.initialMiddlewareWrapper(data, dataType, middleware, configMiddleware, delayTime, statusCode),
      this.specificMiddlewareWrapper(globals),
      this.commonMiddlewareWrapper(this.commonMiddlewareExcludeRoutes, globals),
      this.defaultMiddleware,
    ];
  };

  // #endregion Load Resources

  /**
   * This function helps to transform the harJSon to a simple route and response object
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse();
   * const callback = (entry, route, response) => ({[route] : response});
   * const db = fakeResponse.transformHar(harData, ["xhr","document"], callback);
   * @link https://github.com/R35007/Fake-Response#transformhar - For further info pls visit this ReadMe
   */
  transformHar = (
    harData: HAR = <HAR>{},
    resourceTypeFilters: string[] = [],
    callback?: (entry: object, route: string, response: any) => object
  ) => {
    try {
      const entries: HarEntry[] = _.get(harData, "log.entries", []);
      const resourceFilteredEntries = resourceTypeFilters.length
        ? entries.filter((e) => resourceTypeFilters.indexOf(e._resourceType) >= 0)
        : entries;
      const mimeTypeFilteredEntries = resourceFilteredEntries.filter(
        (e) => e?.response?.content?.mimeType === "application/json" || e?.response?.content?.mimeType === "text/plain"
      );
      const mock = mimeTypeFilteredEntries.reduce((result, entry) => {
        const route = url.parse(entry.request.url).pathname;
        const valid_Route = this.getValidRoute(route);
        const responseText = _.get(entry, "response.content.text", "");

        let response;
        try {
          response = JSON.parse(responseText);
        } catch {
          response = responseText;
        }

        let obj = { [valid_Route]: response };

        if (_.isFunction(callback)) {
          obj = callback(entry, valid_Route, response) || {};
        }

        return {
          ...result,
          ...obj,
        };
      }, {});

      const valid_Mock = Object.entries(mock).reduce((res, [key, val]) => ({ ...res, [this.getValidRoute(key)]: val }), {});

      return valid_Mock;
    } catch (err) {
      console.error(chalk.red(err.message));
      if (this.shouldThrowError) throw new Error(err.message);
    }
  };

  /**
   * This function helps to filter only those properties which are required using schema
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const data = {
   *  name : "foo",
   *  likes : ["xxx","yyy"],
   *  address:[{
   *    "city":"bar",
   *    "state":"TN",
   *    "country":"India"
   *  }]
   * };
   *
   * const schema ={
   *  name:true,
   *  address:{
   *    city:true
   *  }
   * }
   * const db = fakeResponse.filterBySchema(data, schema);
   * @link https://github.com/R35007/Fake-Response#filterbyschema - For further info pls visit this ReadMe
   */
  filterBySchema = (data: any = {}, schema: object = {}) => {
    try {
      if (_.isPlainObject(data)) {
        const filteredObj = Object.entries(data).reduce((result, [key, val]) => {
          const schemaKeys = Object.keys(schema);
          if (schemaKeys.indexOf(key) >= 0) {
            if (_.isPlainObject(schema[key])) {
              if (_.isPlainObject(val)) {
                return { ...result, [key]: this.filterBySchema(val, schema[key]) };
              } else if (_.isArray(val)) {
                return { ...result, [key]: this.filterBySchema(val, schema[key]) };
              } else {
                return result;
              }
            } else if (schema[key] === true) {
              return { ...result, [key]: val };
            }
            return result;
          }
          return result;
        }, {});

        return filteredObj;
      } else if (_.isArray(data)) {
        const filteredArray = data.map((j) => this.filterBySchema(j, schema)).filter((fa) => !_.isEmpty(fa));
        return filteredArray.length ? filteredArray : [];
      }
      return data;
    } catch (err) {
      console.error(chalk.red(err.message));
      if (this.shouldThrowError) throw new Error(err.message);
    }
  };

  /**
   * This function helps to create a default route explicitly.
   * This creates the following routes.
   * http://localhost:3000/
   * http://localhost:3000/db
   * http://localhost:3000/routesList
   *
   * Note : The port is assigned from the config
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse(db)
   * fakeResponse.createDefaultRoutes()
   * @link https://github.com/R35007/Fake-Response#createdefaultroutes - For further info pls visit this ReadMe
   **/
  createDefaultRoutes = () => {
    if (!this.app) this.createExpressApp();
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
    defaultRoutesLog(defaultRoutes, this.valid_Config.port);
    this.isDefaultsCreated = true;
  };
}

// #region Utils
const getDelayTime = (route, specificDelay, commonDelay, excludeRoutes) => {
  const commonDelayTime = excludeRoutes.indexOf(route) < 0 ? commonDelay.time : false;
  if (commonDelay.override) {
    return typeof commonDelayTime !== "undefined" && commonDelayTime >= 0 ? commonDelayTime : specificDelay;
  }
  return typeof specificDelay !== "undefined" && specificDelay >= 0 ? specificDelay : commonDelayTime || 0;
};

const checkRoute = (dataType, route, delay, statusCode, availableRoutes) => {
  if (["url", "file", "default"].indexOf(dataType) < 0) throw new Error("Please provide a valid dataType");
  if (!_.isString(route) || !route.startsWith("/") || isDuplicateRoute(route, availableRoutes))
    throw new Error("Please provide a valid route");
  if (typeof delay !== "undefined" && !_.isInteger(delay)) throw new Error("Please provide a valid delay");
  if (typeof statusCode !== "undefined" && !_.isInteger(statusCode) && !(statusCode >= 100 && statusCode < 600))
    throw new Error("Please provide a valid statusCode");
};

const isDuplicateRoute = (route, availableRoutes) => {
  if (availableRoutes.indexOf(route) < 0) {
    availableRoutes.push(route);
    return false;
  }
  throw new Error(route + " - Duplicate Route");
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
