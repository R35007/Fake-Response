import * as _ from "lodash";
import { DataType, Injectors, Middleware, ConfigDelay, ConfigMiddleware, Db } from "./model";
import UrlPattern from "url-pattern";

export class Utils {
  protected getInjector = (route: string, injectors: Injectors[], type: string): Middleware | number | undefined => {
    const relatedInjector = injectors.find((injct) => {
      if (_.isArray(injct.routes)) {
        return injct.routes.indexOf(route) >= 0 && typeof injct[type] !== "undefined";
      } else if (!_.isString(injct.routes)) {
        return injct.routes === route && typeof injct[type] !== "undefined";
      } else {
        throw new Error("Invalid route type. Route must be string or string[]");
      }
    });
    return relatedInjector ? relatedInjector[type] : undefined;
  };

  protected getConfigMiddleware = (middleware, d_middleware): ConfigMiddleware => {
    if (_.isFunction(middleware)) {
      return {
        func: middleware,
        excludeRoutes: d_middleware.excludeRoutes,
      };
    } else if (_.isPlainObject(middleware) && !_.isEmpty(middleware)) {
      const func = middleware.func;
      const excludeRoutes = middleware.excludeRoutes;
      const override = middleware.override;
      return {
        func: _.isFunction(func) ? func : d_middleware.middleware,
        excludeRoutes: _.isArray(excludeRoutes) ? excludeRoutes.map(this.getValidRoute) : d_middleware.excludeRoutes,
        override: override == true,
      };
    }
    return d_middleware;
  };

  protected getConfigDelay = (delay, d_delay): ConfigDelay => {
    if (_.isString(delay) || _.isInteger(delay)) {
      return {
        time: delay,
        excludeRoutes: d_delay.excludeRoutes,
      };
    } else if (_.isPlainObject(delay) && !_.isEmpty(delay)) {
      const time = delay.time;
      const excludeRoutes = delay.excludeRoutes;
      const override = delay.override;
      return {
        time: _.isString(time) || _.isInteger(time) ? time : d_delay.time,
        excludeRoutes: _.isArray(excludeRoutes) ? excludeRoutes.map(this.getValidRoute) : d_delay.excludeRoutes,
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
          middlewares: [this.groupMiddleware],
        };
        return [...result, obj];
      }

      return result;
    }, []);
    return groupedDbList;
  };

  protected getGroupedDb = (db: Db[], key: string, val: string) => {
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

  protected getProxyedRoutes = (routes: string | string[], patternMatch, exactMatch) => {
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

  protected getPatternRoutes = (routes: string[], patternMatchEntries: [string, string][]) => {
    const patternRoutes = routes.reduce((result: string[], r: string) => {
      const patternRoute = patternMatchEntries.reduce((pr, [key, val]) => [...pr, ...this.getPatternRoute(key, val, r)], []);
      return patternRoute.length ? [...result, ...patternRoute] : [...result, r];
    }, []);

    return patternRoutes;
  };

  protected getPatternRoute = (key: string, val: string, route: string) => {
    const patternRoute = this.getPatternRouteStringify(key, val, route);
    if (patternRoute) {
      return [route, patternRoute];
    }
    return [route, val];
  };

  protected getExactRoutes = (routes: string[], exactMatchEntries: [string, string][]) => {
    const exactMatchRoutes = routes.reduce((result: string[], r: string) => {
      const exactMatchRoute = exactMatchEntries.reduce((er, [key, val]) => (key === r ? [...er, r, val] : [...er, r]), []);
      return exactMatchRoute.length ? [...result, exactMatchRoute] : [...result, r];
    }, []);

    return exactMatchRoutes;
  };

  protected getPatternRouteStringify = (key: string, val: string, route: string) => {
    try {
      const matchedResult = new UrlPattern(key).match(route);

      if (!_.isEmpty(matchedResult)) {
        const proxyValPattern = new UrlPattern(val);
        const proxyRouteWithParams = proxyValPattern.stringify(matchedResult);
        return proxyRouteWithParams;
      }
      return false;
    } catch {
      return false;
    }
  };

  protected groupMiddleware = ({ res, req, data }) => {
    const path = req.path;
    const response = data[path] || data.default || data[Object.keys(data)[0]];
    res.send(response);
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
    if (_.isEmpty(route) || _.isObject(route)) return undefined;
    const routeStr = `${route}`.trim();
    const validRoute = routeStr.startsWith("/") ? routeStr : "/" + routeStr;
    return validRoute;
  };
}
