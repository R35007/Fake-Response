import * as _ from "lodash";
import { DataType, Injectors, UserDB, Config, Globals, Middleware, ConfigDelay, ConfigMiddleware } from "./model";
import { Middlewares } from "./middlewares";

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
      return {
        func: _.isFunction(func) ? func : d_middleware.middleware,
        excludeRoutes: _.isArray(excludeRoutes) ? excludeRoutes.map(this.getValidRoute) : d_middleware.excludeRoutes,
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

      return {
        time: _.isString(time) || _.isInteger(time) ? time : d_delay.time,
        excludeRoutes: _.isArray(excludeRoutes) ? excludeRoutes.map(this.getValidRoute) : d_delay.excludeRoutes,
      };
    }
    return d_delay;
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
}
