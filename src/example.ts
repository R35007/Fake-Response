#! /usr/bin/env node
import * as fakeResponse from "./index";

import { db } from "./db";

fakeResponse
  .getResponse(db, {
    port: 3000,
    middleware: () => console.log(new Date()),
    excludeRoutes: ["/hello"],
  })
  .then(({ db, config, fullDbData }) => {
    console.log({ db, config, fullDbData });
  });
