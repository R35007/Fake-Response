#! /usr/bin/env node
import * as fake from "./index";

import { db } from "./db";

fake.getResponse(db, {
  port: 3000,
  middleware: () => console.log(new Date()),
  excludeRoutes: ["/hello"],
}); // generates with route.ts by default
