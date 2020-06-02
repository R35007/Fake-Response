#! /usr/bin/env node
import { FakeResponse } from "./index";
import chalk from "chalk";

var path = require("path");
const [dbPath] = process.argv.slice(2);

const parseUrl = (relativeUrl: string) => {
  return typeof relativeUrl === "string" ? decodeURIComponent(path.resolve(process.cwd(), relativeUrl)) : "./";
};

let db, config, globals;

try {
  if (dbPath && path.extname(parseUrl(dbPath)) && path.extname(parseUrl(dbPath)) === ".js") {
    let data = require(parseUrl(dbPath));
    db = data.db;
    config = data.config;
    globals = data.globals;
  } else if (dbPath && path.extname(parseUrl(dbPath)) && path.extname(parseUrl(dbPath)) === ".json") {
    db = parseUrl(dbPath);
  }
  new FakeResponse(db, config, globals).launchServer();
} catch (err) {
  console.log("\n" + chalk.red(err.message) + "\n");
}
