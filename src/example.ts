#! /usr/bin/env node
import * as fakeResponse from "./index";

import { db, config, globals } from "./samples";

fakeResponse.getResponse();

// fakeResponse
//   .getResponse(db, config, globals)
//   .then(({ db, config, fullDbData, globals }) => {
//     // console.log({ db, config, fullDbData, globals });
//   });

// const config = fakeResponse.getConfig(); // returns the default config
// const sampleDb = fakeResponse.getSampleDb(); // returns the sample Db
// const getGlobals = fakeResponse.getGlobals(); // returns the Global values
// const isGlobalsCleared = fakeResponse.clearGlobals(); // returns true and clears the Global values
