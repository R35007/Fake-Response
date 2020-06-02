import * as _ from "lodash";
import { DataType, Injectors } from "./model";

export const getInjector = (route: string, injectors: Injectors[], type: string) => {
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

export const getConfigMiddleware = (middleware, d_middleware) => {
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
      excludeRoutes: _.isArray(excludeRoutes) ? excludeRoutes.map(getValidRoute) : d_middleware.excludeRoutes,
    };
  }
  return d_middleware;
};

export const getConfigDelay = (delay, d_delay) => {
  if (_.isString(delay) || _.isInteger(delay)) {
    return {
      time: delay,
      excludeRoutes: d_delay.excludeRoutes,
    };
  } else if (_.isPlainObject(delay) && !_.isEmpty(delay)) {
    const time = delay.time;
    const excludeRoutes = delay.excludeRoutes;

    return {
      time: _.isString(time) || _.isInteger(time) ? _.toInteger(time) : d_delay.time,
      excludeRoutes: _.isArray(excludeRoutes) ? excludeRoutes.map(getValidRoute) : d_delay.excludeRoutes,
    };
  }
  return d_delay;
};

export const getDataType = (dataType: DataType) => {
  const default_dataTypes = ["default", "file", "url"];
  if (_.isString(dataType)) {
    const valid_dataType = dataType.trim().toLowerCase();
    return default_dataTypes.indexOf(valid_dataType) >= 0 ? valid_dataType : "default";
  }
  return "default";
};

export const getMiddlewares = (middlewares, len) => {
  if (_.isFunction(middlewares)) {
    return _.fill(Array(len), middlewares);
  } else if (_.isArray(middlewares)) {
    return Array.from(middlewares, (m) => (_.isFunction(m) ? m : emptyMiddleware));
  }
  return _.fill(Array(len), emptyMiddleware);
};

export const getDelays = (delays, len) => {
  if (_.isString(delays) || _.isInteger(delays)) {
    return _.fill(Array(len), _.toInteger(delays));
  } else if (_.isArray(delays)) {
    const dly = Array.from(delays, (d) => (_.isString(d) || _.isInteger(d) ? _.toInteger(d) : undefined));
    return dly.filter(Boolean).length > 0 ? dly : [];
  }
  return [];
};

const getValidRoute = (route) => {
  if (_.isObject(route)) return undefined;
  const validRoute = `${route}`.startsWith("/") ? `${route}` : "/" + route;
  return validRoute;
};

const emptyMiddleware = ({ next }) => {
  next();
};
