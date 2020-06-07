import chalk from "chalk";
import * as _ from "lodash";
import { sample_db } from "./samples";
import { Config, DataType, Db, Globals, Injectors, UserDB, Middleware } from "./model";
import { Utils } from "./utils";

const fs = require("fs");
const path = require("path");

const default_config: Config = {
  port: 3000,
  rootPath: "./",
  middleware: {
    func: ({ next }) => {
      next();
    },
    excludeRoutes: [],
  },
  delay: {
    time: 0,
    excludeRoutes: [],
  },
};

const default_globals: Globals = {};

const default_Injectors: Injectors[] = [];

export class Validators extends Utils {
  isValidated = true;

  constructor(
    protected db?: UserDB,
    protected config?: Config,
    protected globals?: Globals,
    protected injectors?: Injectors[]
  ) {
    super();
    this.loadData(db, config, globals, injectors);
  }

  loadData = (
    userDb: Db[] | object | string = this.db,
    userConfig: Config = this.config,
    userGlobals: Globals = this.globals,
    userInjectors: Injectors[] = this.injectors
  ) => {
    console.log("\n" + chalk.blue("/{^_^}/ Hi!"));
    console.log("\n" + chalk.gray("Loading Data..."));

    this.config = this.getValidConfig(userConfig);
    this.globals = this.getValidGlobals(userGlobals);
    this.injectors = this.getValidInjectors(userInjectors);
    this.db = this.getValidDb(userDb);

    console.log(chalk.gray("Done."));
  };

  getValidData = (db = this.db, config: Config = this.config, globals = this.globals, injectors = this.injectors) => {
    const valid_config = this.getValidConfig(config);
    const valid_globals = this.getValidGlobals(globals);
    const valid_injectors = this.getValidInjectors(injectors);
    const valid_db = this.getValidDb(db, injectors);

    return {
      valid_db,
      valid_config,
      valid_globals,
      valid_injectors,
    };
  };

  getValidConfig = (config: Config = this.config) => {
    if (_.isEmpty(config) || !_.isPlainObject(config)) {
      console.log(chalk.yellow("  Oops, Config not found. Using default Config"));
      return default_config;
    }

    try {
      const { port, rootPath, middleware, delay } = default_config;
      const valid_Config = { ...config };

      valid_Config.port = !_.isObject(config.port) ? _.toInteger(config.port) : port;
      valid_Config.rootPath = this.isDirectoryExist(config.rootPath) ? config.rootPath : rootPath;
      valid_Config.middleware = this.getConfigMiddleware(config.middleware, middleware);
      valid_Config.delay = this.getConfigDelay(config.delay, delay);

      return valid_Config;
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
    }
  };

  getValidGlobals = (globals: Globals = this.globals) => {
    if (_.isEmpty(globals) || !_.isPlainObject(globals)) {
      return default_globals;
    }

    return { ...default_globals, ...globals };
  };

  getValidInjectors = (injectors: Injectors[]): Injectors[] => {
    if (_.isEmpty(injectors) || !_.isArray(injectors)) {
      return default_Injectors;
    }
    try {
      const valid_injectors = injectors.map((injector, i) => {
        if (!_.isPlainObject(injector)) throw new TypeError(`not an object type. @index : ${i}`);
        const valid_injector: Injectors = <Injectors>{};
        valid_injector.routes = this.getValidRoutes(injector.routes);
        valid_injector.middleware = this.getValidMiddlewares(injector.middleware, 1)[0];
        valid_injector.delay = this.getValidDelays(injector.delay, 1)[0];
        return valid_injector;
      });
      return valid_injectors;
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
    }
  };

  getValidDb = (db: UserDB = this.db, injectors: Injectors[] = this.injectors): Db[] => {
    if (_.isEmpty(db) || (!_.isString(db) && !_.isPlainObject(db) && !_.isArray(db))) {
      console.log(chalk.yellow("  Oops, Db not found. Using sample DB"));
      db = sample_db;
    }

    if (_.isString(db) || _.isPlainObject(db)) {
      return this.transformJson(db, injectors);
    } else if (_.isArray(db)) {
      return this.getValidDbList(db, injectors);
    } else {
      return sample_db;
    }
  };

  getValidDbList = (db: Db[] = <Db[]>this.db, injectors: Injectors[] = this.injectors): Db[] => {
    try {
      if (!_.isArray(db)) throw TypeError("Invalid db type. db must be an array");
      if (!_.isArray(injectors)) throw TypeError("Invalid injectors type. injectors must be an array");
      const valid_Db = db.map((obj, i) => {
        if (!_.isPlainObject(obj)) throw new TypeError(`not an object type. @index : ${i}`);

        const valid_obj: Db = <Db>{};
        valid_obj._d_index = i;
        valid_obj.dataType = <DataType>this.getValidDataType(obj.dataType);
        valid_obj.data = obj.dataType === "file" ? this.parseUrl(<string>obj.data || "") : obj.data || "";
        valid_obj.routes = this.getValidRoutes(obj.routes);

        const specific_middlewares = this.getValidMiddlewares(obj.middlewares, valid_obj.routes.length);
        const specific_delays = this.getValidDelays(obj.delays, valid_obj.routes.length);

        const injector_Middlewares: Middleware[] = <Middleware[]>(
          valid_obj.routes.map((r) => this.getInjector(r, injectors, "middleware"))
        );
        const injector_Delays: number[] = <number[]>(
          valid_obj.routes.map((d) => this.getInjector(d, injectors, "delay"))
        );

        valid_obj.middlewares = specific_middlewares.map((m, i) => (!_.isFunction(m) ? injector_Middlewares[i] : m));
        valid_obj.delays = specific_delays.map((d, i) => (!_.isInteger(d) ? injector_Delays[i] : d));

        return valid_obj;
      });

      const sorted_db = _.sortBy(valid_Db, ["dataType"]);
      return sorted_db;
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
    }
  };

  transformJson = (data: object | string = this.db, injectors: Injectors[] = this.injectors): Db[] => {
    try {
      if (!_.isArray(injectors)) throw TypeError("Invalid injectors type. injectors must be an array");
      let valid_data = data;
      console.log(chalk.gray("  Transforming Json..."));

      if (_.isString(data)) {
        if (fs.existsSync(this.parseUrl(data)) && path.extname(this.parseUrl(data)) === ".json") {
          valid_data = JSON.parse(fs.readFileSync(this.parseUrl(data), "utf8"));
        } else {
          throw new Error(this.parseUrl(data) + " - Invalid path or json. Please provide a valid path or json.");
        }
      }

      if (_.isPlainObject(valid_data)) {
        const transformed_db = Object.entries(valid_data).map(([key, data], i) => {
          const routes = key.split(",").map(this.getValidRoute);
          const middlewares = routes.map((r) => this.getInjector(r, injectors, "middleware"));
          const delays = routes.map((r) => this.getInjector(r, injectors, "delay"));
          const dataType = "default";
          const valid_db: Db = {
            _d_index: i,
            data,
            dataType,
            routes,
            middlewares: middlewares.filter(Boolean).length > 0 ? <Middleware[]>middlewares : [],
            delays: delays.filter(Boolean).length > 0 ? <number[]>delays : [],
          };
          return valid_db;
        });
        const sorted_db = _.sortBy(transformed_db, ["dataType"]);
        console.log(chalk.gray("  Done."));
        return sorted_db;
      }

      throw new Error("Invalid json. Please provide a valid json.");
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
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

  emptyMiddleware = ({ next }) => {
    next();
  };

  parseUrl = (relativeUrl: string) => {
    const rootPath = _.get(this, "config.rootPath", default_config.rootPath);
    const parsedUrl = decodeURIComponent(path.resolve(rootPath, _.toString(relativeUrl)));
    return parsedUrl;
  };

  isDirectoryExist = (value) => {
    return _.isString(value) && fs.existsSync(this.parseUrl(value)) && fs.statSync(this.parseUrl(value)).isDirectory();
  };
}
