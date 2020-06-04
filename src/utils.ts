import * as _ from "lodash";
import { DataType, Injectors, UserDB, Config, Globals } from "./model";

export class Utils {
  constructor(protected db?: UserDB, protected config?: Config, public globals?: Globals) {
    this.config = config;
    this.globals = globals;
    this.db = db;
  }
  protected getInjector = (route: string, injectors: Injectors[], type: string) => {
    const relatedInjector = injectors.find((injct) => {
      if (_.isArray(injct.routes)) {
        return injct.routes.indexOf(route) >= 0;
      } else if (!_.isString(injct.routes)) {
        return injct.routes === route;
      } else {
        throw new Error("Invalid route type. Route must be string or string[]");
      }
    });
    return relatedInjector ? relatedInjector[type] : undefined;
  };

  protected getConfigMiddleware = (middleware, d_middleware) => {
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

  protected getConfigDelay = (delay, d_delay) => {
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

  protected getDataType = (dataType: DataType) => {
    const default_dataTypes = ["default", "file", "url"];
    if (_.isString(dataType)) {
      const valid_dataType = dataType.trim().toLowerCase();
      return default_dataTypes.indexOf(valid_dataType) >= 0 ? valid_dataType : "default";
    }
    return "default";
  };

  protected getMiddlewares = (middlewares, len) => {
    if (_.isFunction(middlewares)) {
      return _.fill(Array(len), middlewares);
    } else if (_.isArray(middlewares)) {
      return Array.from(middlewares, (m) => (_.isFunction(m) ? m : undefined));
    }
    return _.fill(Array(len), undefined);
  };

  protected getDelays = (delays, len) => {
    if (_.isString(delays) || _.isInteger(delays)) {
      return _.fill(Array(len), _.toInteger(delays));
    } else if (_.isArray(delays)) {
      const dly = Array.from(delays, (d) => (_.isString(d) || _.isInteger(d) ? _.toInteger(d) : undefined));
      return dly.filter(Boolean).length > 0 ? dly : [];
    }
    return [];
  };

  protected getValidRoute = (route) => {
    if (_.isObject(route)) return undefined;
    const validRoute = `${route}`.startsWith("/") ? `${route}` : "/" + route;
    return validRoute;
  };
}
