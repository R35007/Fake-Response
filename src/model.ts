import express from "express";

export interface Db {
  data: string | DataUrl | Object;
  dataType?: DataType;
  routes: string[];
  middlewares?: Array<Middleware>;
}

export interface DataUrl {
  url: string;
  config?: object;
}

type DataType = "default" | "file" | "url";

export type Middleware = (
  req: express.Request,
  res: express.Response,
  data: any
) => any;

export interface Config {
  port?: number;
  excludeRoutes?: string[];
  middleware?: Middleware;
}
