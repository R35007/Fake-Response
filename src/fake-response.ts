#! /usr/bin/env node
import { FakeResponse } from "./";
import chalk from "chalk";

var path = require("path");
const [dbPath] = process.argv.slice(2);

const parseUrl = (relativeUrl: string) => {
  return typeof relativeUrl === "string" ? decodeURIComponent(path.resolve(process.cwd(), relativeUrl)) : "./";
};

let db, config, globals, injectors;

try {
  if (dbPath && path.extname(parseUrl(dbPath)) && path.extname(parseUrl(dbPath)) === ".json") {
    db = parseUrl(dbPath);
  }
  const fakeResponse = new FakeResponse(db, config, globals, injectors);
  fakeResponse.launchServer();
} catch (err) {
  console.log("\n" + chalk.red(err.message) + "\n");
}
