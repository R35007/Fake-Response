import express from "express";

export interface Db {
  data?: string | DataUrl | Object;
  dataType?: DataType;
  routes: string[];
  middlewares?: Middleware | Array<Middleware>;
  delays?: number | number[];
}

export interface DataUrl {
  url: string;
  config?: object;
}

type DataType = "default" | "file" | "url";

export type Middleware = (param: MiddlewareParams) => any;

export interface Config {
  port?: number;
  middleware?: {
    func: Middleware;
    excludeRoutes?: string[];
  };
  delay?: {
    time: number;
    excludeRoutes?: string[];
  };
}

export interface Globals {
  [key: string]: any;
}

export interface MiddlewareParams {
  req: express.Request;
  res: express.Response;
  data: any;
  globals: Globals;
}
