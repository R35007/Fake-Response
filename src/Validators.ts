import chalk from "chalk";
import * as _ from "lodash";
import UrlPattern from "url-pattern";
import { sample_db, sample_config, sample_globals, sample_injectors } from "./samples";
import { Config, DataType, Db, Globals, Injectors, UserDB, Middleware, HarEntry, HAR } from "./model";
import { Utils } from "./utils";

const fs = require("fs");
const path = require("path");
const url = require("url");

const default_config: Config = {
  port: 3000,
  rootPath: "./",
  env: "",
  excludeRoutes: [],
  proxy: {},
  middleware: {
    func: ({ next }) => {
      next();
    },
    excludeRoutes: [],
    override: false,
  },
  delay: {
    time: 0,
    excludeRoutes: [],
    override: false,
  },
};

const default_db: UserDB = {
  helloWorld: "hello World",
};

const default_globals: Globals = {};

const default_Injectors: Injectors[] = [];

export class Validators extends Utils {
  isValidated = true;

  constructor(protected db?: UserDB, protected config?: Config, protected globals?: Globals, protected injectors?: Injectors[]) {
    super();
    if (!db && !config && !globals && !injectors) {
      db = sample_db;
      config = sample_config;
      globals = sample_globals;
      injectors = sample_injectors;
    }
    this.setData(db, config, globals, injectors);
  }

  setData = (
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
    this.db = this.getValidDb(userDb, this.injectors);

    console.log(chalk.gray("Done."));
  };

  getData = () => {
    return {
      db: this.db,
      config: this.config,
      globals: this.globals,
      injectors: this.injectors,
    };
  };

  getValidConfig = (config: Config = this.config) => {
    if (_.isEmpty(config) || !_.isPlainObject(config)) {
      console.log(chalk.yellow("  Oops, Config not found. Using default Config"));
      return default_config;
    }

    try {
      const { port, rootPath, excludeRoutes, middleware, delay, proxy } = default_config;
      const valid_Config = { ...config };

      valid_Config.port = !_.isEmpty(config.port) && !_.isObject(config.port) ? _.toInteger(config.port) : port;
      valid_Config.rootPath = this.isDirectoryExist(config.rootPath) ? config.rootPath : rootPath;
      valid_Config.excludeRoutes = _.isArray(config.excludeRoutes) ? config.excludeRoutes.map(this.getValidRoute) : excludeRoutes;
      valid_Config.middleware = this.getConfigMiddleware(config.middleware, middleware);
      valid_Config.delay = this.getConfigDelay(config.delay, delay);
      valid_Config.proxy = _.isPlainObject(config.proxy) ? this.getValidProxy(config.proxy) : proxy;

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
      console.log(chalk.yellow("  Oops, Db not found. Using default DB"));
      db = default_db;
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

      let valid_Db = <Db[]>db;
      const proxy = this.config.proxy;
      const valid_injector = this.getValidInjectors(injectors);

      if (!_.isEmpty(proxy) && _.isPlainObject(proxy)) {
        valid_Db = this.getProxyedDb(valid_Db, proxy);
      }

      valid_Db = <Db[]>valid_Db
        .map((obj, i) => {
          if (!_.isPlainObject(obj)) throw new TypeError(`not an object type. @index : ${i}`);

          const valid_obj: Db = <Db>{};
          const { data, dataType, routes, middlewares, delays, env } = obj;

          const valid_routes = this.getValidRoutes(routes);
          valid_obj.routes = valid_routes.filter((r) => this.config.excludeRoutes.indexOf(r) < 0);

          if (valid_obj.routes && valid_obj.routes.length > 0) {
            valid_obj._d_index = i;
            valid_obj.dataType = <DataType>this.getValidDataType(dataType);
            valid_obj.data = obj.dataType === "file" ? this.parseUrl(<string>data || "") : data || "";
            valid_obj.env = !_.isEmpty(env) && _.isObject(env) ? env : {};

            const specific_middlewares = this.getValidMiddlewares(middlewares, valid_obj.routes.length);
            const specific_delays = this.getValidDelays(delays, valid_obj.routes.length);

            const injector_Middlewares: Middleware[] = <Middleware[]>valid_obj.routes.map((r) => this.getInjector(r, valid_injector, "middleware"));
            const injector_Delays: number[] = <number[]>valid_obj.routes.map((r) => this.getInjector(r, valid_injector, "delay"));

            valid_obj.middlewares = specific_middlewares.map((m, i) => (!_.isFunction(m) ? injector_Middlewares[i] : m));
            valid_obj.delays = specific_delays.map((d, i) => (!_.isInteger(d) ? injector_Delays[i] : d));

            return valid_obj;
          } else {
            return false;
          }
        })
        .filter(Boolean);

      const sorted_db = _.sortBy(valid_Db, ["dataType"]);
      return sorted_db;
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
    }
  };

  private getProxyedDb = (db: Db[], proxy) => {
    const proxyeRouteVals = Object.entries(proxy).map(([_key, val]) => val);
    const proxyedDb = db
      .map((d) => {
        const nonProxyRoutes = this.getValidRoutes(d.routes).filter((r) => proxyeRouteVals.indexOf(r) < 0);
        if (nonProxyRoutes.length) {
          const routes = this.getProxedRoutes(nonProxyRoutes, proxy);
          return { ...d, routes };
        }
        return false;
      })
      .filter(Boolean);
    return <Db[]>proxyedDb;
  };

  private getProxedRoutes = (routes: string[], proxy: Config["proxy"]) => {
    const proxedRoutes = routes.reduce((result: string[], r: string) => {
      const proxeRouteEntries = Object.entries(proxy);
      const patternMatchRoute = proxeRouteEntries.find(([key, val]) => new UrlPattern(key).match(r));
      const exactMatchRoute = proxeRouteEntries.find(([key, val]) => key === r);

      if (!_.isEmpty(patternMatchRoute)) {
        try {
          const proxyKeyPattern = new UrlPattern(patternMatchRoute[0]);
          const proxyValPattern = new UrlPattern(patternMatchRoute[1]);

          const keyMatchedParams = proxyKeyPattern.match(r);
          if (!_.isEmpty(keyMatchedParams)) {
            const proxyRouteWithParams = proxyValPattern.stringify(keyMatchedParams);
            return [...result, r, proxyRouteWithParams];
          } else {
            return [...result, r, patternMatchRoute[1]];
          }
        } catch {
          return [...result, r, patternMatchRoute[1]];
        }
      } else if (exactMatchRoute) {
        return [...result, r, exactMatchRoute[1]];
      }

      return result;
    }, []);

    return proxedRoutes;
  };

  transformJson = (data: object | string = this.db, injectors: Injectors[] = this.injectors): Db[] => {
    try {
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
        valid_data = <Object>valid_data;
        const ENV = this.config.env;
        //removes all dev routes and contains only env routes;
        if (!_.isEmpty(ENV) && !_.isEmpty(valid_data[ENV])) {
          valid_data = this.getOnlyEnvData(valid_data, valid_data[ENV]);
          delete valid_data[ENV];
        }

        const transformed_db = <Db[]>Object.entries(valid_data).map(([key, data]) => {
          const routes = key.split(",");
          const valid_db: Db = {
            data,
            routes,
          };
          return valid_db;
        });

        const valid_Db = this.getValidDbList(transformed_db, injectors);
        console.log(chalk.gray("  Done."));

        return valid_Db;
      }

      throw new Error("Invalid json. Please provide a valid json.");
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
    }
  };

  transformHar = (harData: HAR = <HAR>{}, filters: string[] = []) => {
    try {
      const entries: HarEntry[] = _.get(harData, "log.entries", []);
      const xhrFiltered = entries.filter((e) => filters.indexOf(e._resourceType) >= 0);
      const statusFiltered = xhrFiltered.filter((x) => x.response.status >= 200 && x.response.status < 400);

      const mock = statusFiltered.reduce((result, data) => {
        const route = url.parse(data.request.url).pathname;
        const valid_Route = this.getValidRoute(route);
        const responseText = _.get(data, "response.content.text", "");

        let response;
        try {
          response = JSON.parse(responseText);
        } catch {
          response = responseText;
        }

        return {
          ...result,
          [valid_Route]: response,
        };
      }, {});

      return mock;
    } catch (err) {
      console.error(chalk.red(err.message));
    }
  };

  private getOnlyEnvData = (devData, envData) => {
    const envDataRoutes = Object.keys(envData).reduce((res, key) => [...res, ...key.split(",")], []);
    const validEnvRoutes = this.getValidRoutes(_.flatten(envDataRoutes));

    const nonDevData = Object.entries(devData).reduce((res, [key, val]) => {
      const routes = this.getValidRoutes(key.split(","));
      const nonEnvRoutes = routes.filter((r) => validEnvRoutes.indexOf(r) < 0);
      return nonEnvRoutes.length ? { ...res, [nonEnvRoutes.join(",")]: val } : res;
    }, {});

    return { ...nonDevData, ...envData };
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
