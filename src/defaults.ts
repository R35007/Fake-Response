import { Valid_Config, Valid_Db, Globals, Valid_Injectors, Valid_RoutesMatchList } from "./model";

export const default_Config: Valid_Config = {
  port: 3000,
  rootPath: "./",
  baseUrl: "",
  env: "",
  groupings: {},
  proxy: {
    patternMatch: {},
    exactMatch: {},
  },
  excludeRoutes: {
    patternMatch: [],
    exactMatch: [],
  },
  middleware: {
    func: ({ next }) => {
      next();
    },
    excludeRoutes: {
      patternMatch: [],
      exactMatch: [],
    },
    override: false,
  },
  delay: {
    time: 0,
    excludeRoutes: {
      patternMatch: [],
      exactMatch: [],
    },
    override: false,
  },
};

export const default_Db: Valid_Db[] = [
  {
    _d_index: 0,
    env: {},
    data: "Hello World",
    routes: ["hello"],
    dataType: "default",
    middlewares: [undefined],
    delays: [undefined],
    isGrouped: false,
  },
];

export const default_Globals: Globals = {};

export const default_Injectors: Valid_Injectors[] = [];

export const default_InjectorsRoute: Valid_RoutesMatchList = {
  exactMatch: [],
  patternMatch: [],
};
