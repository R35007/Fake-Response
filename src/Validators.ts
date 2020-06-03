import chalk from "chalk";
import * as _ from "lodash";
import { default_config, default_db, default_globals } from "./defaults";
import { Config, DataType, Db, Globals, Injectors, UserDB } from "./model";
import * as u from "./utils";

const fs = require("fs");
const path = require("path");

export class Validators {
  constructor(protected db?: UserDB, protected config?: Config, public globals?: Globals) {
    this.config = config;
    this.globals = globals;
    this.db = db;
  }

  getValidData = (config: Config = this.config, globals = this.globals, db = this.db) => {
    return {
      valid_config: this.getValidConfig(config),
      valid_globals: this.getValidGlobals(globals),
      valid_db: this.getValidDb(db),
    };
  };

  parseUrl = (relativeUrl: string) => {
    const roothPath = _.get(this, "config.rootPath", default_config.rootPath);
    return decodeURIComponent(path.resolve(roothPath, _.toString(relativeUrl)));
  };

  isDirectoryExist = (value) =>
    _.isString(value) && fs.existsSync(this.parseUrl(value)) && fs.statSync(this.parseUrl(value)).isDirectory();

  getValidConfig = (config: Config = this.config) => {
    if (_.isEmpty(config) || !_.isPlainObject(config)) {
      console.log(chalk.yellow("  Oops, Config not found. Using default Config"));
      this.config = default_config;
      return default_config;
    }

    const { port, rootPath, middleware, delay } = default_config;
    const valid_Config = { ...config };

    valid_Config.port = !_.isObject(config.port) ? _.toInteger(config.port) : port;
    valid_Config.rootPath = this.isDirectoryExist(config.rootPath) ? config.rootPath : rootPath;
    valid_Config.middleware = u.getConfigMiddleware(config.middleware, middleware);
    valid_Config.delay = u.getConfigDelay(config.delay, delay);

    this.config = valid_Config;
    return valid_Config;
  };

  getValidGlobals = (globals: Globals = this.globals) => {
    if (!_.isPlainObject(globals)) {
      console.log(chalk.yellow("  Oops, Globals not found. Using default Globals"));
      this.globals = default_globals;
      return default_globals;
    }

    this.globals = globals;
    return globals;
  };

  getValidDb = (db: UserDB = this.db): Db[] => {
    if (_.isEmpty(db) || (!_.isString(db) && !_.isPlainObject(db) && !_.isArray(db))) {
      console.log(chalk.yellow("  Oops, Db not found. Using sample DB"));
      db = default_db;
    }

    if (_.isString(db) || _.isPlainObject(db)) {
      return this.transformJson(db);
    } else if (_.isArray(db)) {
      return this.getValidDbList(db);
    }
  };

  getValidDbList = (db: Db[] = <Db[]>this.db): Db[] => {
    if (!_.isArray(db)) throw TypeError("Invalid db type. db must be an array");
    const valid_Db = db.map((obj, i) => {
      if (!_.isPlainObject(obj)) throw new TypeError(`not an object type. @index : ${i}`);
      const valid_obj: Db = <Db>{};
      valid_obj._d_index = i;
      valid_obj.dataType = <DataType>u.getDataType(obj.dataType);
      valid_obj.data = obj.dataType === "file" ? this.parseUrl(<string>obj.data || "") : obj.data || "";
      valid_obj.routes = this.getValidRoutes(obj.routes);
      valid_obj.middlewares = u.getMiddlewares(obj.middlewares, valid_obj.routes.length);
      valid_obj.delays = u.getDelays(obj.delays, valid_obj.routes.length);
      return valid_obj;
    });

    const sorted_db = _.sortBy(valid_Db, ["dataType"]);
    this.db = sorted_db;
    return sorted_db;
  };

  getValidInjector = (injectors: Injectors[] = []): Injectors[] => {
    if (!_.isArray(injectors)) throw TypeError("Invalid injectors type. injectors must be an array");
    const valid_injectors = injectors.map((injector, i) => {
      if (!_.isPlainObject(injector)) throw new TypeError(`not an object type. @index : ${i}`);
      const valid_injector: Injectors = <Injectors>{};
      valid_injector.routes = this.getValidRoutes(injector.routes);
      valid_injector.middleware = u.getMiddlewares(injector.middleware, 1)[0];
      valid_injector.delay = u.getDelays(injector.delay, 1)[0];
      return valid_injector;
    });
    return valid_injectors;
  };

  transformJson = (data: object | string, injectors: Injectors[] = []): Db[] => {
    try {
      let valid_data = data;
      console.log(chalk.gray("  Transforming Json..."));

      const valid_injectors = this.getValidInjector(injectors);

      if (_.isString(data) && fs.existsSync(this.parseUrl(data)) && path.extname(this.parseUrl(data)) === ".json") {
        valid_data = JSON.parse(fs.readFileSync(this.parseUrl(data), "utf8"));
      }

      if (_.isPlainObject(valid_data)) {
        const transformed_db = Object.entries(valid_data).map(([key, data], i, arr) => {
          const routes = key.split(",").map(this.getValidRoute);
          const middlewares = routes.map((r) => u.getInjector(r, valid_injectors, "middleware"));
          const delays = routes.map((r) => u.getInjector(r, valid_injectors, "delay"));
          const dataType = "default";
          const db: Db = {
            _d_index: i,
            data,
            dataType,
            routes,
            middlewares: middlewares.filter(Boolean).length > 0 ? middlewares : [],
            delays: delays.filter(Boolean).length > 0 ? delays : [],
          };
          return db;
        });
        const sorted_db = _.sortBy(transformed_db, ["dataType"]);
        console.log(chalk.gray("  Done."));
        this.db = sorted_db;
        return sorted_db;
      }

      throw new Error("Invalid path or json. Please provide a valid path or json.");
    } catch (err) {
      throw new Error(err.message);
    }
  };

  isValidURL = (str: string) => {
    try {
      new URL(str);
    } catch (_) {
      return false;
    }
    return true;
  };

  getValidRoutes = (routes) => {
    if (!_.isEmpty(routes)) {
      if (_.isString(routes) || _.isInteger(routes)) {
        return [this.getValidRoute(routes)];
      } else if (_.isArray(routes)) {
        return routes.map(this.getValidRoute);
      }
      return [];
    }
    return [];
  };

  getValidRoute = (route) => {
    if (_.isObject(route)) return undefined;
    const validRoute = `${route}`.startsWith("/") ? `${route}` : "/" + route;
    return validRoute;
  };

  emptyMiddleware = ({ next }) => {
    next();
  };
}
