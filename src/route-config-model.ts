import express from "express";

export interface RouteConfig {
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
