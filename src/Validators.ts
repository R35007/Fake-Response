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
  proxy: {
    patternMatch: {},
    exactMatch: {},
  },
  excludeRoutes: {
    patternMatch: [],
    exactMatch: [],
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

  /**
   * This function validates and sets the Data explicitly
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * fakeResponse.setData(db, config, globals, injectors);
   * @link https://github.com/R35007/Fake-Response#setdata - For further info pls visit this ReadMe
   */
  setData = (
    db: Db[] | object | string = this.db,
    config: Config = this.config,
    globals: Globals = this.globals,
    injectors: Injectors[] = this.injectors
  ) => {
    console.log("\n" + chalk.blue("/{^_^}/ Hi!"));
    console.log("\n" + chalk.gray("Loading Data..."));

    this.config = this.getValidConfig(config);
    this.globals = this.getValidGlobals(globals);
    this.injectors = this.getValidInjectors(injectors);
    this.db = this.getValidDb(db, this.injectors);

    console.log(chalk.gray("Done."));
  };

  /**
   * This function helps to get initialized data
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const {db, config, globals, injectors} = fakeResponse.getData();
   * @link https://github.com/R35007/Fake-Response#getdata - For further info pls visit this ReadMe
   */
  getData = () => {
    return {
      db: this.db,
      config: this.config,
      globals: this.globals,
      injectors: this.injectors,
    };
  };

  /**
   * This function validates and returns the config object
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const config = fakeResponse.getValidConfig(config);
   * @link https://github.com/R35007/Fake-Response#getdata - For further info pls visit this ReadMe
   */
  getValidConfig = (config: Config = this.config) => {
    if (_.isEmpty(config) || !_.isPlainObject(config)) {
      console.log(chalk.yellow("  Oops, Config not found. Using default Config"));
      return default_config;
    }

    try {
      const { port, rootPath, excludeRoutes, middleware, delay, proxy } = default_config;
      const valid_Config = { ...config };

      const erPatternMatch = _.get(config, "excludeRoutes.patternMatch", []);
      const erExactMatch = _.get(config, "excludeRoutes.exactMatch", []);

      const prPatternMatch = _.get(config, "proxy.patternMatch", {});
      const prExactMatch = _.get(config, "proxy.exactMatch", {});

      valid_Config.port = !_.isEmpty(config.port) && !_.isObject(config.port) ? _.toInteger(config.port) : port;
      valid_Config.rootPath = this.isDirectoryExist(config.rootPath) ? config.rootPath : rootPath;
      valid_Config.middleware = this.getConfigMiddleware(config.middleware, middleware);
      valid_Config.delay = this.getConfigDelay(config.delay, delay);
      valid_Config.excludeRoutes = {
        patternMatch: _.isArray(erPatternMatch) ? erPatternMatch.map(this.getValidRoute) : excludeRoutes.patternMatch,
        exactMatch: _.isArray(erExactMatch) ? erExactMatch.map(this.getValidRoute) : excludeRoutes.exactMatch,
      };
      valid_Config.proxy = {
        patternMatch: _.isPlainObject(prPatternMatch) ? this.getValidProxy(prPatternMatch) : proxy.patternMatch,
        exactMatch: _.isPlainObject(prExactMatch) ? this.getValidProxy(prExactMatch) : proxy.exactMatch,
      };

      return valid_Config;
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
    }
  };

  /**
   * This function validates and returns the globals object
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const globals = fakeResponse.getValidGlobals(globals);
   * @link https://github.com/R35007/Fake-Response#getdata - For further info pls visit this ReadMe
   */
  getValidGlobals = (globals: Globals = this.globals) => {
    if (_.isEmpty(globals) || !_.isPlainObject(globals)) {
      return default_globals;
    }

    return { ...default_globals, ...globals };
  };

  /**
   * This function validates and returns the injectors object
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const injectors = fakeResponse.getValidInjectors(injectors);
   * @link https://github.com/R35007/Fake-Response#getdata - For further info pls visit this ReadMe
   */
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

  /**
   * This function validates and returns the db List
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const db = fakeResponse.getValidDb(db,injectors);
   * @link https://github.com/R35007/Fake-Response#getdata - For further info pls visit this ReadMe
   */
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

  /**
   * This function validates and returns the db List
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const db = fakeResponse.getValidDbList(db);
   * @link https://github.com/R35007/Fake-Response#getdata - For further info pls visit this ReadMe
   */
  getValidDbList = (db: Db[] = <Db[]>this.db, injectors: Injectors[] = this.injectors): Db[] => {
    try {
      if (!_.isArray(db)) throw TypeError("Invalid db type. db must be an array");
      if (!_.isArray(injectors)) throw TypeError("Invalid injectors type. injectors must be an array");

      let valid_Db = <Db[]>db;
      const proxy = this.config.proxy;
      const excludeRoutes = this.config.excludeRoutes;
      const valid_injector = this.getValidInjectors(injectors);

      if (!_.isEmpty(proxy.patternMatch) || !_.isEmpty(proxy.exactMatch)) {
        valid_Db = this.getProxyedDb(valid_Db, proxy.patternMatch, proxy.exactMatch);
      }

      const routesList = _.flatten(valid_Db.map((db) => this.getValidRoutes(db.routes)));

      const exactExcludeRoutes = routesList.filter((r) => excludeRoutes.exactMatch.indexOf(r) >= 0);
      const patternExcludeRoutes = routesList.filter((r) => excludeRoutes.patternMatch.some((pe) => !_.isEmpty(new UrlPattern(pe).match(r))));

      const excludeRoutesList = [...exactExcludeRoutes, ...patternExcludeRoutes];

      let availableRoutes = [];

      valid_Db = <Db[]>valid_Db
        .reverse()
        .map((obj, i) => {
          if (!_.isPlainObject(obj)) throw new TypeError(`not an object type. @index : ${i}`);

          const valid_obj: Db = <Db>{};
          const { data, dataType, routes, middlewares, delays, env } = obj;

          const valid_routes = this.getValidRoutes(routes);
          valid_obj.routes = valid_routes.filter((r) => excludeRoutesList.indexOf(r) < 0 && availableRoutes.indexOf(r) < 0);

          if (valid_obj.routes && valid_obj.routes.length) {
            availableRoutes = [...availableRoutes, ...valid_obj.routes];
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
        .filter(Boolean)
        .reverse();

      const sorted_db = _.sortBy(valid_Db, ["dataType"]);
      return sorted_db;
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
    }
  };

  private getProxyedDb = (db: Db[], patternMatch, exactMatch) => {
    const proxyedDb = db
      .map((d) => {
        const routes = this.getProxyedRoutes(d.routes, patternMatch, exactMatch);
        return routes.length ? { ...d, routes } : false;
      })
      .filter(Boolean);
    return <Db[]>proxyedDb;
  };

  private getProxyedRoutes = (routes: string | string[], patternMatch, exactMatch) => {
    const valid_routes = this.getValidRoutes(routes);

    const patternMatchEntries = <[string, string][]>Object.entries(patternMatch);
    const exactMatchEntries = <[string, string][]>Object.entries(exactMatch);

    const patternMatchedRoutes = patternMatchEntries.length > 0 ? this.getPatternRoutes(valid_routes, patternMatchEntries) : [];
    const exactMatchedRoutes = exactMatchEntries.length > 0 ? this.getExactRoutes(valid_routes, exactMatchEntries) : [];

    const flattenRoutes = _.flatten([...patternMatchedRoutes, ...exactMatchedRoutes]);
    const uniqRoutes = _.uniq(flattenRoutes);
    const valid_uniq_routes = this.getValidRoutes(uniqRoutes);
    return valid_uniq_routes;
  };

  private getPatternRoutes = (routes: string[], patternMatchEntries: [string, string][]) => {
    const patternRoutes = routes.reduce((result: string[], r: string) => {
      const patternRoute = patternMatchEntries.reduce((pr, [key, val]) => [...pr, ...this.getPatternRoute(key, val, r)], []);
      return patternRoute.length ? [...result, ...patternRoute] : [...result, r];
    }, []);

    return patternRoutes;
  };

  private getPatternRoute = (key: string, val: string, route: string) => {
    try {
      const matchedResult = new UrlPattern(key).match(route);

      if (!_.isEmpty(matchedResult)) {
        const proxyValPattern = new UrlPattern(val);
        const proxyRouteWithParams = proxyValPattern.stringify(matchedResult);
        return [route, proxyRouteWithParams];
      }
      return [route];
    } catch {
      return [route, val];
    }
  };

  private getExactRoutes = (routes: string[], exactMatchEntries: [string, string][]) => {
    const exactMatchRoutes = routes.reduce((result: string[], r: string) => {
      const exactMatchRoute = exactMatchEntries.reduce((er, [key, val]) => (key === r ? [...er, r, val] : [...er, r]), []);
      return exactMatchRoute.length ? [...result, exactMatchRoute] : [...result, r];
    }, []);

    return exactMatchRoutes;
  };

  /**
   * This function helps to transform the db url or object to an db List
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const db = fakeResponse.transformJson(db, injectors);
   * @link https://github.com/R35007/Fake-Response#transformjson - For further info pls visit this ReadMe
   */
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
        if (!_.isEmpty(ENV) && !_.isEmpty(valid_data[ENV])) {
          valid_data = { ...valid_data, ...valid_data[ENV] };
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

  /**
   * This function helps to transform the harJSon to a simple route and response object
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const db = fakeResponse.transformHar(harData, ["xhr","document"]);
   * @link https://github.com/R35007/Fake-Response#transformhar - For further info pls visit this ReadMe
   */
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

  /**
   * This function helps to filter only those properties which are required using schema
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const data = {
   *  name : foo,
   *  likes : ["xxx","yyy"],
   *  address:[{
   *    "city":"bar",
   *    "state":"TN",
   *    "country":"India"
   *  }]
   * };
   *
   * const schema:{
   *  name:true,
   *  address:{
   *    city:true
   *  }
   * }
   * const db = fakeResponse.filterBySchema(data, schema);
   * @link https://github.com/R35007/Fake-Response#filterbyschema - For further info pls visit this ReadMe
   */
  filterBySchema = (data: any = {}, schema: object = {}) => {
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
