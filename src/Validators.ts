import chalk from "chalk";
import * as _ from "lodash";
import UrlPattern from "url-pattern";
import { Config, DataType, Db, Globals, Injectors, UserDB, Middleware, Valid_RoutesMatchList, FileDetails } from "./model";
import { Valid_Db, Valid_Config, Valid_Injectors } from "./model";
import { default_Db, default_Config, default_Injectors, default_Globals, default_InjectorsRoute } from "./defaults";
import { Utils } from "./utils";
import * as fs from "fs";

export class Validators extends Utils {
  constructor() {
    super();
  }

  /**
   * This function validates and returns the config object
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const config = fakeResponse.getValidConfig(config);
   * @link https://github.com/R35007/Fake-Response#getdata - For further info pls visit this ReadMe
   */
  getValidConfig = (config: Config | Valid_Config = this.valid_Config): Valid_Config => {
    if (_.isEmpty(config) || !_.isPlainObject(config)) {
      console.log(chalk.yellow("  Oops, Config not found. Using default Config"));
      return default_Config;
    }

    try {
      const { port, env, rootPath, groupings, proxy, excludeRoutes, baseUrl, middleware, delay } = default_Config;
      const valid_Config = <Valid_Config>{};

      const { exactMatch = {}, patternMatch = {}, ...others } = config.proxy || {};

      valid_Config.port = !_.isObject(config.port) ? _.toInteger(config.port || port) : port;
      valid_Config.rootPath = this.isDirectoryExist(config.rootPath) ? config.rootPath : rootPath;
      valid_Config.env = !_.isEmpty(config.env) && _.isString(config.env) ? this.getValidRoute(config.env) : env;
      valid_Config.groupings = _.isPlainObject(config.groupings) ? this.getValidRouteMatch(config.groupings) : groupings;
      valid_Config.proxy = {
        exactMatch: _.isPlainObject({ ...exactMatch, ...others })
          ? this.getValidRouteMatch({ ...exactMatch, ...others })
          : proxy.exactMatch,
        patternMatch: _.isPlainObject(patternMatch) ? this.getValidRouteMatch(patternMatch) : proxy.patternMatch,
      };
      valid_Config.excludeRoutes = this.getValidMatchedRoutesList(config.excludeRoutes, excludeRoutes);
      valid_Config.baseUrl = _.isString(config.baseUrl) ? this.getValidRoute(config.baseUrl) : baseUrl;
      valid_Config.middleware = this.getConfigMiddleware(config.middleware, middleware);
      valid_Config.delay = this.getConfigDelay(config.delay, delay);
      valid_Config.throwError = config.throwError == true;
      this.shouldThrowError = valid_Config.throwError;

      return valid_Config;
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
      if (this.shouldThrowError) throw new Error(err.message);
      return <Valid_Config>{};
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
  getValidGlobals = (globals: Globals = this.valid_Globals) => {
    if (_.isEmpty(globals) || !_.isPlainObject(globals)) {
      return default_Globals;
    }

    return { ...default_Globals, ...globals };
  };

  /**
   * This function validates and returns the injectors object
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const injectors = fakeResponse.getValidInjectors(injectors);
   * @link https://github.com/R35007/Fake-Response#getdata - For further info pls visit this ReadMe
   */
  getValidInjectors = (injectors: Injectors[] = []): Valid_Injectors[] => {
    if (_.isEmpty(injectors) || !_.isArray(injectors)) {
      return <[]>default_Injectors;
    }
    try {
      const valid_injectors = injectors.map((injector, i) => {
        if (!_.isPlainObject(injector)) throw new TypeError(`not an object type. @index : ${i}`);
        const valid_injector: Injectors = <Injectors>{};
        valid_injector.routes = this.getValidMatchedRoutesList(injector.routes, default_InjectorsRoute);
        valid_injector.middleware = this.getValidMiddlewares(injector.middleware, 1)[0];
        valid_injector.delay = this.getValidDelays(injector.delay, 1)[0];
        valid_injector.statusCode = this.getValidStatusCode(injector.statusCode, 1)[0];
        valid_injector.isGrouped = injector.isGrouped == true;
        return valid_injector;
      });
      return <Valid_Injectors[]>valid_injectors;
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
      if (this.shouldThrowError) throw new Error(err.message);
      return [];
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
  getValidDb = (db: UserDB | Valid_Db[] = this.valid_DB, injectors: Injectors[] | Valid_Injectors[] = this.valid_Injectors): Valid_Db[] => {
    if (_.isEmpty(db) || (!_.isString(db) && !_.isPlainObject(db) && !_.isArray(db))) {
      console.log(chalk.yellow("  Oops, Db not found. Using default DB"));
      db = default_Db;
    }

    if (_.isString(db) || _.isPlainObject(db)) {
      return this.transformJson(db, injectors);
    } else if (_.isArray(db)) {
      return this.getValidDbList(db, injectors);
    } else {
      return default_Db;
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
  getValidDbList = (
    db: Db[] | Valid_Db[] = <Db[]>this.valid_DB,
    injectors: Injectors[] | Valid_Injectors[] = this.valid_Injectors
  ): Valid_Db[] => {
    try {
      if (!_.isArray(db)) throw TypeError("Invalid db type. db must be an array");
      if (!_.isArray(injectors)) throw TypeError("Invalid injectors type. injectors must be an array");

      let userDb = db;
      const proxy = this.valid_Config.proxy;
      const excludeRoutes = this.valid_Config.excludeRoutes;
      const valid_injector = this.getValidInjectors(injectors);

      if (!_.isEmpty(this.valid_Config.groupings)) {
        userDb = [...userDb, ...this.getGroupedDbList(userDb, this.valid_Config.groupings)];
      }

      if (!_.isEmpty(proxy.patternMatch) || !_.isEmpty(proxy.exactMatch)) {
        userDb = this.getProxyedDb(userDb, proxy.patternMatch, proxy.exactMatch);
      }

      const excludeRoutesList = this.getMatchedRoutesList(userDb, excludeRoutes);

      let availableRoutes = [];

      const valid_db = <Valid_Db[]>userDb
        .reverse()
        .map((obj, i) => {
          if (!_.isPlainObject(obj)) throw new TypeError(`not an object type. @index : ${i}`);

          const valid_obj = <Valid_Db>{};
          const { data, dataType, routes, isGrouped, statusCodes: statusCode, middlewares, delays, env } = obj;

          valid_obj.routes = this.getValidRoutes(routes).filter((r) => excludeRoutesList.indexOf(r) < 0 && availableRoutes.indexOf(r) < 0);
          valid_obj.routes = [...new Set(valid_obj.routes)];

          if (valid_obj.routes && valid_obj.routes.length) {
            availableRoutes = [...availableRoutes, ...valid_obj.routes];

            valid_obj.dataType = <DataType>this.getValidDataType(dataType);
            valid_obj.data = obj.dataType === "file" ? this.parseUrl(<string>data || "") : data || "";
            valid_obj.env = !_.isEmpty(env) && _.isObject(env) ? env : {};
            valid_obj.isGrouped = isGrouped == true;

            const specific_statusCodes = this.getValidStatusCode(statusCode, valid_obj.routes.length);

            const injector_isGrouped = valid_obj.routes.map((r) => this.getInjector(r, valid_injector, "isGrouped"));
            valid_obj.isGrouped = valid_obj.isGrouped ? valid_obj.isGrouped : injector_isGrouped.filter(Boolean).length > 0;

            const specific_middlewares = this.getValidMiddlewares(middlewares, valid_obj.routes.length);
            const specific_delays = this.getValidDelays(delays, valid_obj.routes.length);

            const injector_Middlewares = <Middleware[]>valid_obj.routes.map((r) => this.getInjector(r, valid_injector, "middleware"));
            const injector_Delays = <number[]>valid_obj.routes.map((r) => this.getInjector(r, valid_injector, "delay"));
            const injector_statusCodes = <number[]>valid_obj.routes.map((r) => this.getInjector(r, valid_injector, "statusCode"));

            valid_obj.middlewares = specific_middlewares.map((m, i) => (_.isFunction(m) ? m : injector_Middlewares[i]));
            valid_obj.delays = specific_delays.map((d, i) => (!_.isInteger(d) ? injector_Delays[i] : d));
            valid_obj.statusCodes = specific_statusCodes.map((sc, i) => (!_.isInteger(sc) ? injector_statusCodes[i] : sc));

            if (valid_obj.isGrouped) {
              valid_obj.middlewares = valid_obj.middlewares.map((m) => (_.isFunction(m) ? m : this.groupMiddleware));
              valid_obj.data = Object.entries(valid_obj.data).reduce(
                (res, [key, val]: [string, string]) => ({ ...res, [this.getValidRoutes(key).join(",")]: val }),
                {}
              );
            }

            return valid_obj;
          } else {
            return false;
          }
        })
        .filter(Boolean)
        .reverse()
        .map((db, i) => ({ ...db, _d_index: i }));

      const sorted_db = _.sortBy(valid_db, ["dataType"]);
      return sorted_db;
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
      if (this.shouldThrowError) throw new Error(err.message);
      return [];
    }
  };

  /**
   * This function helps to transform the db url or object to an db List
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const db = fakeResponse.transformJson(db, injectors);
   * @link https://github.com/R35007/Fake-Response#transformjson - For further info pls visit this ReadMe
   */
  transformJson = (
    data: object | string = this.valid_DB,
    injectors: Injectors[] | Valid_Injectors[] = this.valid_Injectors
  ): Valid_Db[] => {
    try {
      let valid_data = data;
      console.log(chalk.gray("  Transforming Json..."));

      if (_.isString(data)) {
        valid_data = this.getMockFromPath(this.parseUrl(data));
      }

      if (_.isPlainObject(valid_data)) {
        valid_data = Object.entries(valid_data).reduce((res, [key, val]) => ({ ...res, [this.getValidRoutes(key).join(",")]: val }), {});

        const ENV = this.valid_Config.env;
        if (!_.isEmpty(ENV) && !_.isEmpty(valid_data[ENV])) {
          const valid_env_data = Object.entries(valid_data[ENV]).reduce(
            (res, [key, val]) => ({ ...res, [this.getValidRoutes(key).join(",")]: val }),
            {}
          );
          valid_data = { ...valid_data, ...valid_env_data };
          delete valid_data[ENV];
        }

        const transformed_db = <Db[]>this.convertJSONToDbList(<object>valid_data);

        const valid_Db = this.getValidDbList(transformed_db, injectors);
        console.log(chalk.gray("  Done."));

        return valid_Db;
      }

      throw new Error("Invalid json. Please provide a valid json.");
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
      if (this.shouldThrowError) throw new Error(err.message);
      return [];
    }
  };

  /**
   * This function returns all the matched routes list
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const db = fakeResponse.getMatchedRoutesList(db, routesMatchList);
   * @link https://github.com/R35007/Fake-Response#getmatchedrouteslist - For further info pls visit this ReadMe
   */
  getMatchedRoutesList = (db: Db[] | object, routesMatchList: string[] | Valid_RoutesMatchList): string[] => {
    try {
      let userDb = _.isPlainObject(db) ? this.convertJSONToDbList(db) : _.isArray(db) ? db : [];

      const routesList = _.flatten(userDb.map((db) => this.getValidRoutes(db.routes)));

      if (_.isArray(routesMatchList)) {
        return this.getValidRoutes(routesMatchList).every((r) => _.isString())
          ? routesList.filter((r) => routesMatchList.indexOf(r) >= 0)
          : [];
      } else if (_.isPlainObject(routesMatchList)) {
        let exactMatch = routesMatchList.exactMatch || [];
        let patternMatch = routesMatchList.patternMatch || [];

        exactMatch = exactMatch.every((r) => _.isString(r)) ? this.getValidRoutes(exactMatch) : [];
        patternMatch = patternMatch.every((r) => _.isString(r)) ? this.getValidRoutes(patternMatch) : [];

        const exactExcludeRoutes = routesList.filter((r) => exactMatch.indexOf(r) >= 0);
        const patternExcludeRoutes = routesList.filter((r) => patternMatch.some((pe) => !_.isEmpty(new UrlPattern(pe).match(r))));
        const excludeRoutesList = [...exactExcludeRoutes, ...patternExcludeRoutes];
        return excludeRoutesList;
      }

      return [];
    } catch (err) {
      console.error(chalk.red(err.message));
      if (this.shouldThrowError) throw new Error(err.message);
      return [];
    }
  };

  /**
   * This function returns all the json files data to a combined json from the given path
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const db = fakeResponse.getMockFromPath(folderOrFilePath, excludeFolders, true);
   * @link https://github.com/R35007/Fake-Response#getmockfrompath - For further info pls visit this ReadMe
   */
  getMockFromPath = (directoryPath: string = "./", excludeFolders: string[] = [], recursive: boolean = true): object => {
    try {
      const filesList = this.getFilesList(directoryPath, excludeFolders, recursive);
      const onlyJson = filesList.filter((f) => f.extension === ".json");

      const mockData = onlyJson.reduce((mock, file) => {
        const obj = JSON.parse(fs.readFileSync(file.filePath, "utf-8"));
        return { ...mock, ...obj };
      }, {});
      return mockData;
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
      if (this.shouldThrowError) throw new Error(err.message);
      return {};
    }
  };

  /**
   * This function returns all the json files list from the given path
   * @example
   * const {FakeResponse} = require("fake-response");
   * const fakeResponse = new FakeResponse()
   * const db = fakeResponse.getFilesList(folderOrFilePath, excludeFolders, true);
   * @link https://github.com/R35007/Fake-Response#getfileslist - For further info pls visit this ReadMe
   */
  getFilesList = (directoryPath: string = "./", excludeFolders: string[] = [], recursive: boolean = true): FileDetails[] => {
    try {
      const parsedUrl = this.parseUrl(directoryPath);
      const stats = fs.statSync(parsedUrl);
      if (stats.isFile()) {
        return this.getFileDetail(parsedUrl);
      } else if (stats.isDirectory() && excludeFolders.indexOf(parsedUrl) < 0) {
        const files = fs.readdirSync(parsedUrl);
        const filteredFiles = files.filter((file) => excludeFolders.indexOf(file) < 0);
        const filesList = filteredFiles.reduce((res: FileDetails[], file: string) => {
          if (recursive) {
            return res.concat(this.getFilesList(`${parsedUrl}/${file}`, excludeFolders, true));
          }
          return res.concat(this.getFileDetail(`${parsedUrl}/${file}`));
        }, []);

        return filesList;
      }
      return [];
    } catch (err) {
      this.isValidated = false;
      console.error(chalk.red(err.message));
      if (this.shouldThrowError) throw new Error(err.message);
      return [];
    }
  };
}
