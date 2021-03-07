import chalk from "chalk";
import express from "express";
import { Validators } from "./Validators";
import axios, { AxiosRequestConfig } from "axios";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";

import { Config, Globals, Middleware, MiddlewareParams, FileType, URLType, Locals } from "./model";

class DefaultMiddlewares extends Validators {
  constructor() {
    super();
  }
  protected logResponseTime = (req, res, next) => {
    const startHrTime = process.hrtime();

    res.on("finish", () => {
      const elapsedHrTime = process.hrtime(startHrTime);
      const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
      if (["/style.css", "/script.js", "/favicon.ico"].indexOf(req.path) < 0)
        console.log(`${req.method} ${req.path} ` + this.getStatusCodeColor(res.statusCode) + ` ${elapsedTimeInMs} ms`);
    });

    next();
  };

  protected getStatusCodeColor = (statusCode: number) => {
    if (statusCode === 200) {
      return chalk.green(statusCode);
    } else if (statusCode >= 300 && statusCode < 400) {
      return chalk.blue(statusCode);
    } else if (statusCode >= 400 && statusCode < 500) {
      return chalk.red(statusCode);
    } else {
      return chalk.yellow(statusCode);
    }
  };

  protected errorHandler = (err, req, res, next) => {
    if (!err) return next();
    console.log(chalk.red("! Error.Something went wrong"));
    if (this.shouldThrowError) throw new Error(err.message);
  };
}

export class Middlewares extends DefaultMiddlewares {
  constructor() {
    super();
  }
  protected initialMiddlewareWrapper = (
    data: any,
    dataType: string,
    specificMiddleware: Middleware,
    commonMiddleware: Config["middleware"],
    delay: number,
    statusCode: number | undefined
  ) => {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        res.locals = { data, dataType, specificMiddleware, commonMiddleware, delay, statusCode };
        const canProceed = this.redirectIfMissingParams(req, res);
        if (canProceed) {
          if (dataType == "file") {
            res.locals.fileType = this.getResponseFromFile(data);
          } else if (dataType === "url") {
            res.locals.urlType = await this.getParsedDynamicUrl(data, req);
          }
          setTimeout(() => {
            next();
          }, data._delay || delay);
        }
      } catch (err) {
        console.error("\n" + chalk.red(err.message));
        res.send(err);
      }
    };
  };

  protected specificMiddlewareWrapper = (globals: Globals) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const { data, specificMiddleware } = res.locals;
        const params: MiddlewareParams = { req, res, next, data, globals, locals: <Locals>res.locals };
        _.isFunction(specificMiddleware) ? specificMiddleware(params) : next();
      } catch (err) {
        console.error("\n" + chalk.red(err.message));
        res.send(err);
      }
    };
  };

  protected commonMiddlewareWrapper = (excludeRoutes: string[], globals: Globals) => {
    return (req, res, next) => {
      try {
        const { data, commonMiddleware } = res.locals;
        if (excludeRoutes.indexOf(req.path) < 0) {
          const params: MiddlewareParams = { req, res, next, data, globals, locals: res.locals };
          _.isFunction(commonMiddleware.func) ? commonMiddleware.func(params) : next();
        } else {
          next();
        }
      } catch (err) {
        console.error("\n" + chalk.red(err.message));
        res.send(err);
      }
    };
  };

  protected defaultMiddleware = (req: express.Request, res: express.Response, next) => {
    try {
      const { data, dataType, fileType, urlType, statusCode } = <Locals>res.locals;
      if (!res.headersSent) {
        if (statusCode && statusCode >= 100 && statusCode < 600) res.statusCode = statusCode;
        if (data._statusCode && data._statusCode >= 100 && data._statusCode < 600) res.statusCode = data._statusCode;

        if (dataType === "file") {
          res.sendFile(this.parseUrl(fileType.url));
        } else if (dataType === "url") {
          axios({
            method: <AxiosRequestConfig["method"]>req.method,
            url: urlType.url,
            responseType: "stream",
            params: { ...urlType.params },
            data: { ...urlType.data },
            headers: { ...urlType.headers },
          })
            .then(function (response) {
              response.data.pipe(res);
            })
            .catch((err) => res.send(err));
        } else {
          typeof data === "object" ? res.jsonp(data) : res.send(data);
        }
      }
    } catch (err) {
      console.error("\n" + chalk.red(err.message));
      res.send(err);
    }
  };

  // #region Utils
  private getParsedDynamicUrl = async (data, req) => {
    if (_.isString(data) && this.isValidURL(data)) {
      const obj = this.getDynamicUrlObj(data, req);
      return obj;
    } else if (_.isPlainObject(data) && _.isString(data.url) && this.isValidURL(data.url)) {
      const { url, config = {} } = data;
      const obj: any = this.getDynamicUrlObj(url, req);
      obj.headers = config;
      return obj;
    } else {
      throw new Error("Invalid URL. Please provide a valid URL");
    }
  };

  private getResponseFromFile = (data): FileType => {
    const parsedUrl = this.parseUrl(data);
    if (!_.isObject(data) && _.isString(data) && fs.existsSync(parsedUrl)) {
      const fileExtension = path.extname(parsedUrl);
      const locals = {
        url: parsedUrl,
        extension: fileExtension,
        data: "",
      };
      if (fileExtension === ".json") {
        locals.data = JSON.parse(fs.readFileSync(parsedUrl, "utf8"));
        return locals;
      } else if (fileExtension === ".txt") {
        locals.data = fs.readFileSync(parsedUrl, "utf8");
        return locals;
      } else {
        return locals;
      }
    }

    throw new Error(parsedUrl + " - Invalid Path. Please provide a valid path.");
  };

  private getDynamicUrlObj = (url, req): URLType => {
    const params = req.params;
    const dynamicUrl = Object.keys(params).reduce((res, key) => {
      return url.replace(`/:${key}`, `/${params[key]}`);
    }, url);
    const locals = {
      url: dynamicUrl,
      params: req.query,
      data: req.body,
    };
    return locals;
  };

  private redirectIfMissingParams = (req, res) => {
    const params: object = req.params;
    const windowUrl = req.path;
    const hasParams = Object.keys(params).filter((k) => params[k] !== `:${k}`);
    if (Object.keys(params).length > 0 && hasParams.length === 0) {
      const dummyUrl = Object.keys(params).reduce((res, key) => {
        return res.replace(`/:${key}`, "/1");
      }, windowUrl);
      console.log(`Redirecting from ${req.path} to ${dummyUrl}`);
      res.redirect(307, dummyUrl);
      return false;
    }
    return true;
  };
  // #endregion
}
