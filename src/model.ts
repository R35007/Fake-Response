import express from "express";

export interface Db {
  data?: string | DataUrl | Object;
  dataType?: DataType;
  routes: string[];
  middlewares?: Array<Middleware>;
  delays?: number[];
}

export interface DataUrl {
  url: string;
  config?: object;
}

type DataType = "default" | "file" | "url";

export type Middleware = (...MiddlewareParams) => any;

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

export type MiddlewareParams = [
  express.Request,
  express.Response,
  any,
  Globals
];
