import * as _ from "lodash";
import {
  DataType,
  Middleware,
  Db,
  Valid_ConfigMiddleware,
  Valid_ConfigDelay,
  Valid_RoutesMatchList,
  Valid_Injectors,
  Valid_Db,
  Valid_Config,
  Globals,
} from "./model";
import UrlPattern from "url-pattern";
import { default_Config } from "./defaults";
import * as fs from "fs";
import * as path from "path";

export class Utils {
  isValidated = true;

  valid_DB: Valid_Db[];
  valid_Config: Valid_Config;
  valid_Globals: Globals;
  valid_Injectors: Valid_Injectors[];
  constructor() {}
  protected getInjector = (route: string, injectors: Valid_Injectors[], type: string): Middleware | number | undefined => {
    const relatedInjector = injectors.find((inject) => {
      const exactMatch = inject.routes.exactMatch;
      const PatternMatch = inject.routes.patternMatch;
      const isMatched =
        typeof inject[type] !== "undefined" &&
        (exactMatch.indexOf(route) >= 0 || PatternMatch.some((pr) => new UrlPattern(pr).match(route)));
      return isMatched;
    });
    return relatedInjector ? relatedInjector[type] : undefined;
  };

  protected getConfigMiddleware = (middleware, d_middleware): Valid_ConfigMiddleware => {
    if (_.isFunction(middleware)) {
      return {
        func: middleware,
        excludeRoutes: d_middleware.excludeRoutes,
        override: false,
      };
    } else if (_.isPlainObject(middleware) && !_.isEmpty(middleware)) {
      const func = middleware.func;
      const excludeRoutes = middleware.excludeRoutes;
      const override = middleware.override;

      return {
        func: _.isFunction(func) ? func : d_middleware.middleware,
        excludeRoutes: this.getValidMatchedRoutesList(excludeRoutes, d_middleware.excludeRoutes),
        override: override == true,
      };
    }
    return d_middleware;
  };

  protected getConfigDelay = (delay, d_delay): Valid_ConfigDelay => {
    if (_.isString(delay) || _.isInteger(delay)) {
      return {
        time: delay,
        excludeRoutes: d_delay.excludeRoutes,
        override: false,
      };
    } else if (_.isPlainObject(delay) && !_.isEmpty(delay)) {
      const time = delay.time;
      const excludeRoutes = delay.excludeRoutes;
      const override = delay.override;

      return {
        time: _.isString(time) || _.isInteger(time) ? time : d_delay.time,
        excludeRoutes: this.getValidMatchedRoutesList(excludeRoutes, d_delay.excludeRoutes),
        override: override == true,
      };
    }
    return d_delay;
  };

  protected getValidRouteMatch = (obj) => {
    if (!Object.entries(obj).every(([_key, val]) => _.isString(val))) throw new Error("Please Provide a Valid Proxy");
    const valid_Proxy = Object.entries(obj).reduce((res, [key, data]) => {
      return {
        ...res,
        [this.getValidRoute(key)]: this.getValidRoute(data),
      };
    }, {});

    return valid_Proxy;
  };

  protected getValidDataType = (dataType: DataType) => {
    const default_dataTypes = ["default", "file", "url"];
    if (_.isString(dataType)) {
      const valid_dataType = dataType.trim().toLowerCase();
      return default_dataTypes.indexOf(valid_dataType) >= 0 ? valid_dataType : "default";
    }
    return "default";
  };

  protected getValidStatusCode = (statusCode, len): Array<number | undefined> => {
    if (_.isNumber(statusCode) && statusCode >= 100 && statusCode < 600) {
      return _.fill(Array(len), _.toInteger(statusCode));
    } else if (_.isArray(statusCode)) {
      return Array.from(statusCode, (sc) => (_.isInteger(sc) && sc >= 100 && sc < 600 ? sc : undefined));
    }
    return _.fill(Array(len), undefined);
  };

  protected getValidMiddlewares = (middlewares, len): Array<Middleware | undefined> => {
    if (_.isFunction(middlewares)) {
      return _.fill(Array(len), middlewares);
    } else if (_.isArray(middlewares)) {
      return Array.from(middlewares, (m) => (_.isFunction(m) ? m : undefined));
    }
    return _.fill(Array(len), undefined);
  };

  protected getValidDelays = (delays, len): Array<number | undefined> => {
    if (_.isString(delays) || _.isInteger(delays)) {
      return _.fill(Array(len), _.toInteger(delays));
    } else if (_.isArray(delays)) {
      return Array.from(delays, (d) => (_.isString(d) || _.isInteger(d) ? _.toInteger(d) : undefined));
    }
    return _.fill(Array(len), undefined);
  };

  protected getGroupedDbList = (db: Db[], groupings) => {
    const patternMatchEntries = Object.entries(groupings);
    const groupedDbList = patternMatchEntries.reduce((result, [key, val]: [string, string]) => {
      const groupedDb = this.getGroupedDb(db, key, val);
      if (!_.isEmpty(groupedDb)) {
        const obj = {
          data: groupedDb,
          routes: [val],
          isGrouped: true,
        };
        return [...result, obj];
      }

      return result;
    }, []);
    return groupedDbList;
  };

  private getGroupedDb = (db: Db[], key: string, val: string) => {
    const groupedDb = db.reduce((groupedRoutes, d) => {
      const matchedRoutes = this.getValidRoutes(d.routes)
        .map((r) => this.getPatternRouteStringify(key, val, r))
        .filter(Boolean);

      if (matchedRoutes.length) {
        const data = matchedRoutes.reduce((res, r: string) => {
          return { ...res, [r]: d.data };
        }, {});
        return { ...groupedRoutes, ...data };
      }
      return groupedRoutes;
    }, {});

    return groupedDb;
  };

  protected getProxyedDb = (db: Db[], patternMatch, exactMatch) => {
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
    const patternRoute = this.getPatternRouteStringify(key, val, route);
    if (!_.isEmpty(patternRoute)) {
      return [route, patternRoute];
    }
    return [route];
  };

  private getExactRoutes = (routes: string[], exactMatchEntries: [string, string][]) => {
    const exactMatchRoutes = routes.reduce((result: string[], r: string) => {
      const exactMatchRoute = exactMatchEntries.reduce((er, [key, val]) => (key === r ? [...er, r, val] : [...er, r]), []);
      return exactMatchRoute.length ? [...result, exactMatchRoute] : [...result, r];
    }, []);

    return exactMatchRoutes;
  };

  private getPatternRouteStringify = (key: string, val: string, route: string) => {
    try {
      const matchedResult = new UrlPattern(key).match(route);

      if (!_.isEmpty(matchedResult)) {
        const proxyValPattern = new UrlPattern(val);
        try {
          const proxyRouteWithParams = proxyValPattern.stringify(matchedResult);
          return this.getValidRoute(proxyRouteWithParams);
        } catch {
          return this.getValidRoute(val);
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  protected groupMiddleware = ({ res, req, data }) => {
    const path = req.path;
    const response = data[path] || data[Object.keys(data)[0]];
    res.send(response);
  };

  protected convertJSONToDbList = (obj: object) => {
    const dbList = <Db[]>Object.entries(obj).map(([key, data]) => {
      const routes = this.getValidRoutes(key.split(","));
      const valid_db: Db = {
        data,
        routes,
      };
      return valid_db;
    });

    return dbList;
  };

  protected getValidMatchedRoutesList = (routesList, defaults: Valid_RoutesMatchList) => {
    let erPatternMatch, erExactMatch;

    if (!_.isEmpty(routesList) && _.isString(routesList)) {
      erExactMatch = [routesList] || defaults.exactMatch;
      erPatternMatch = defaults.patternMatch;
    } else if (!_.isEmpty(routesList) && _.isArray(routesList)) {
      erExactMatch = routesList || defaults.exactMatch;
      erPatternMatch = defaults.patternMatch;
    } else if (!_.isEmpty(routesList) && _.isPlainObject(routesList)) {
      const exactMatch = !_.isEmpty(routesList.exactMatch) ? routesList.exactMatch : [];
      const patternMatch = !_.isEmpty(routesList.patternMatch) ? routesList.patternMatch : [];

      erExactMatch = _.isString(exactMatch) ? [exactMatch] : _.isArray(exactMatch) ? exactMatch : defaults.exactMatch;
      erPatternMatch = _.isString(patternMatch) ? [patternMatch] : _.isArray(patternMatch) ? patternMatch : defaults.patternMatch;
    } else {
      erExactMatch = defaults.exactMatch;
      erPatternMatch = defaults.patternMatch;
    }

    return {
      exactMatch: _.isArray(erExactMatch) ? erExactMatch.map(this.getValidRoute) : defaults.exactMatch,
      patternMatch: _.isArray(erPatternMatch) ? erPatternMatch.map(this.getValidRoute) : defaults.patternMatch,
    };
  };

  protected getValidRoutes = (routes) => {
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

  protected getValidRoute = (route) => {
    const baseUrl = _.get(this, "valid_Config.baseUrl", "");
    if (_.isEmpty(route) || _.isObject(route)) return undefined;
    const routeStr = `${route}`.trim();
    const addedSlashAtFirst = routeStr.startsWith("/") ? routeStr : "/" + routeStr;
    const removedSlashAtLast = addedSlashAtFirst.endsWith("/") ? addedSlashAtFirst.slice(0, -1) : addedSlashAtFirst;
    const withBaseUrl = !_.isEmpty(baseUrl) && !removedSlashAtLast.startsWith(baseUrl) ? baseUrl + removedSlashAtLast : removedSlashAtLast;
    const validRoute = withBaseUrl.replace("//", "/");
    return validRoute;
  };

  protected isValidURL = (str: string) => {
    try {
      new URL(str);
    } catch (_) {
      return false;
    }
    return true;
  };

  protected emptyMiddleware = ({ next }) => {
    next();
  };

  protected parseUrl = (relativeUrl: string) => {
    const rootPath = _.get(this, "valid_Config.rootPath", default_Config.rootPath);
    const parsedUrl = decodeURIComponent(path.resolve(rootPath, _.toString(relativeUrl)));
    return parsedUrl;
  };

  protected isDirectoryExist = (value) => {
    return _.isString(value) && fs.existsSync(this.parseUrl(value)) && fs.statSync(this.parseUrl(value)).isDirectory();
  };
}
