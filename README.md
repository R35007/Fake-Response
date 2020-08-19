# Fake Response [![](https://badge.fury.io/js/fake-response.svg)](http://badge.fury.io/js/fake-response)

Get a full fake REST API with **zero coding** in **less than 30 seconds** (seriously)

Created with <3 for front-end developers who need a quick back-end for prototyping and mocking.

## Table of contents

- [Getting started](#getting-started)
- [Advantages](#advantages)
- [How To Use](#how-to-use)
  - [Default Config](#default-config)
  - [Proxy](#proxy)
  - [Globals](#globals)
  - [Injectors](#injectors)
  - [Sharing between Routes](#sharing-between-routes)
  - [Switch between env data](#switch-between-env-data)
  - [Default Data](#default-data)
  - [File Data](#file-data)
  - [URL Data](#url-data)
  - [Delay Time](#delay-time)
  - [Specific Middleware](#specific-middleware)
  - [Common Middleware](#common-middleware)
  - [Route types](#route-types)
  - [Sample](#sample)
  - [CLI](#cli)
- [Default Routes](#default-routes)
- [API](#api)
  - [FakeResponse](#fakeresponse)
  - [launchServer](#launchserver)
  - [createExpressApp](#createexpressapp)
  - [startServer](#startserver)
  - [stopServer](#stopserver)
  - [loadResources](#loadresources)
  - [createRoute](#createroute)
  - [createDefaultRoutes](#createdefaultroutes)
  - [setData](#setdata)
  - [getData](#getdata)
- [Author](#author)
- [License](#license)

## Getting started

Install Fake Response

```
npm install -g fake-response
```

Create a `db.js` file

```js
const { FakeResponse } = require("fake-response");

let db;

db = [
  {
    data: "hello World",
    routes: "hello",
    middleware: () => console.log("Hi !."),
  },
];

// or

db = {
  hello: "hello World",
};

// or

db = "./db.json";

const fakeServer = new FakeResponse(db);
fakeServer.launchServer();
```

Now if you go to [http://localhost:3000/hello](http://localhost:3000/hello), you'll get

```text
Hello World
```

## Advantages

- Get a full fake REST API in ease
- A single response can be point to multiple route paths.
- Any file can be send as a response. (json, image, txt, etc..)
- Share data between routes.
- Can set any value to globals and can be accessed at any point of time.
- The mock data can be maintained in different json files and urls which helps to organize your mock data
- The return response can be manipulated or overridden for a specific route by a middleware method.
- Switch between environmental data

## How To Use

Based on the previous `db.js` file, here are all the kinds of data and config you can use. Lets start with default config

### Default Config

You can provide your port, common middleware in the config object, if not the script run by the default config given below.

```js
const config: Config = {
  port: 3000,
  rootPath : "./" // root path of the db to get the absolute path of the relative assets
  middleware: {
    func: ({next}) => {next()},
    excludeRoutes: [],
    override : false // if true common middleware runs first before the specific middleware
  },
  delay: {
    time: 0, // must give in milliseconds
    excludeRoutes: [],
    override : false // if true overrides the specific delay with the common delay
  },
  env : "",
  proxy : {}
  excludeRoutes : []
};
```

you can provide your own config by passing the config object in the `FakeResponse` constructor. For Example :

```js
const { FakeResponse } = require("fake-response");

const db = {
  "hello":"Hello World"
};

const config = {
  port: 4000,
  middleware: {
    func: ({next}) => {
      console.log("Do Something here");
      next(); // if you don't send any response here, always call `next` method to get the response.
    },
    excludeRoutes: ["/excludedRoute"],
  },
  delay: {
    time: 2000, // must give in milliseconds
    excludeRoutes: ["/excludedRoute"]],
  },
  env:"prod",
  excludeRoutes:["prod"]
};

new FakeResponse(db,config).launchServer();
```

### Proxy

You can able to sset the proxy inside the config object. For Example

```js
const { FakeResponse } = require("fake-response");

const db = {
  "hello":"Hello World"
};

const config = {
  proxy: {
    "hello":"helloWorld"
  }
};

new FakeResponse(db,config).launchServer();
```

Now if you go to [http://localhost:3000/helloWorld](http://localhost:3000/helloWorld), you'll get

```text
Hello World
```

### Globals

Using **Globals** you could store any value in the `globals` object and can be shared across any routes.
This also helps to manipulate the response in many ways. For Example :

```js
const { FakeResponse } = require("fake-response");

const responseSequence = ({ res, data, globals }) => {
  const resp = [data, "init", "start", "hold", "stop"];
  const currentRespIndex = resp.indexOf(globals.value);
  globals.value = resp[currentRespIndex + 1] || resp[0]; // loop through responses for each request
  res.send(globals.value);
};
const db = [
  {
    data: "Response changes for each request",
    routes: "/sequence",
    middlewares: responseSequence,
  },
];
const globals = {
  value: false, // store the default value here
};

new FakeResponse(db, config, globals).launchServer(); // second param use the default configs
```

Now you get a different response for each request.

### Injectors

Injectors helps to inject a specific middleware and delay for the existing routes. For Example :

```js
const { FakeResponse } = require("fake-response");

const db = {
  "injector":{
    data : "This response will be changed using the injected middleware"
  }
}

const Injectors = [
  {
    middleware : ({res}) => res.send("This is an injected response  with 300ms delay")
    delay: 300,
    routes:["/injector"]
  }
]

new FakeResponse(db, {} , {}, Injectors).launchServer();
```

### Sharing between Routes

Lets see a simple example of sharing responses between Routes.

```js
const { FakeResponse } = require("fake-response");

const setResponseToGlobal: Middleware = ({ res, req, globals }) => {
  if (Object.keys(req.query).length > 0) {
    globals.queryParams = req.query;
    res.send(`The query params are shared to /getResponse route.`);
  } else {
    res.send("Please set any query param to share to /getResponse route.");
  }
};

const getSharedResponse: Middleware = ({ res, globals }) => {
  const queryParams = globals.queryParams || {};
  const resp =
    Object.keys(queryParams).length > 0
      ? queryParams
      : "change the query param of /shareResponse route to get a dynamic result";
  res.send(resp);
};

const db = [
  {
    data: "This a shared response",
    routes: "/shareResponse",
    middlewares: setResponseToGlobal,
  },
  {
    routes: "getResponse",
    middlewares: getSharedResponse, // returns the query params from `/shareResponse` route
  },
];
const globals = {
  queryParams: false,
};

new FakeResponse(db, config, globals).launchServer();
```

### Switch between env data

For testing purpose we may want to switch data between env. This can done using the env property in the config.
For example :

```js

const db =[{
  routes:"user",
  data : {
    name : "foo"
  },
  env:{
    prod:{
      name : "bar"
    }
  },
},{
  routes:"other",
  data : {
    value : "foo"
  },
  env:{
    dev:{
      value : "bar"
    }
  },
}]

// or

const db = {
  user : {
    name : "foo"
  },
  other : {
    value : "foo"
  },
  // This contains the data from the prod
  prod :{
    user : {
      name : "bar"
    }
  },
  dev :{
    other : {
      value : "bar"
    }
  }
}

const config = {
  env : "prod"
  excludeRoutes : ["prod"]
}

new FakeResponse(db, config).launchServer();
```

Now if you go to [http://localhost:3000/user](http://localhost:3000/user), you'll get

```text
{
  name : "bar"
}
```

### Default Data

By default the data can be in form of JSON, text, number. The following example are the default data types.
Here the property `dataType` is optional. By default the property `dataType` value is `default`

```js
const db = [
  {
    data: "Hello World",
    routes: "/text",
  },
  {
    data: 1234,
    routes: "/number",
    dataType: "default", // optional for default data
  },
  {
    data: ["s", "m", "i", "l", "e"],
    routes: "/array",
    dataType: "default", // optional for default data
  },
  {
    data: {
      id: 1,
      value: "Lorem ipsum dolor sit, amet consectetur adipisicing elit.",
    },
    routes: ["/json"],
  },
];
```

### File Data

Mock DB provides you to access any file in the api.
All you have is to provide the `data` property with **absolute path** of the file and set `dataType` value to `file`.
Note: If you provide a relative path then that path will be relative to the config root path.
For Example:

```js
const path = require("path");

const db = [
  {
    data: path.resolve(__dirname, "../assets/users.json"), // path.resolve helps to provide you the absolute path of the file.
    dataType: "file",
    routes: "/json",
  },
  {
    data: "../assets/article.txt", // this path is relative to the config rootPath
    dataType: "file",
    routes: "/txt",
  },
];

const config = {
  rootPath: __dirname,
};
```

### URL Data

The data can be fetched from the url you provide. The data endpoint can be defined in two ways.

- Directly give the url as a string in `data` property
- Or provide and object with url and config of the endpoint. In config you could provide your authentication headers
  Here are some examples for you.

```js
const db = [
  {
    data:
      "https://r35007.github.io/Siva_Profile/images/portfolio/Sunset_Birds.jpg",
    dataType: "url",
    routes: ["/imageUrl"],
  },
  {
    data: "https://jsonplaceholder.typicode.com/posts/:id/comments",
    dataType: "url",
    routes: ["/posts/:id/comments"],
  },
  {
    data: {
      url: "https://jsonplaceholder.typicode.com/comments/:id",
      config: {}, // can pass any authorization or other option. Please verify Axios
    },
    dataType: "url",
    routes: ["/comments/:id"],
  },
  ,
];
```

### Delay Time

You could also delay the response of your request. It can be done in both the specific and common way.
Here are some example for both specify and common delays.

```js
const db = [
  {
    data: "Hello World",
    routes: "/hello", //delays 500 milliseconds by common config delay
  },
  {
    data: "This response is delayed for 6000 milliseconds",
    routes: "/delayEx0",
    delays: 6000, // delays by 6s (6000 milliseconds)
  },
  {
    data: "This response is delayed for 6000 milliseconds",
    routes: ["/delayEx1", "/delayEx2"],
    delays: [, 6000], // delays 6s only for the second route
  },
  {
    data: "This response is delayed for 6000 milliseconds",
    routes: ["/delayEx3", "/delayEx4"],
    delays: 6000, // delays 6s for every routes of this object
  },
];

const config = {
  port: 3000,
  delay: 500,
};

new FakeResponse(db, config, globals).launchServer();
```

Note : Always delay time must be given in `milliseconds`

### Specific Middleware

You could any method as a middleware to perform certain script actions before sending you the response.
This helps in may way that you could also override your response based on any conditions.
The methods are provided in `middlewares` property in an array the index of the method corresponds to the index of the routes.
For Example:

```js
const logTime = ({ next }) => {
  console.log(new Date());
  next();
};

const override = ({ res }) => {
  res.send({ ...data, name: "bar" });
};

const db = [
  {
    data: { id: 1, name: "foo" },
    routes: ["/users", "/data/:id", "/users/foo"],
    middlewares: [, override, logTime],
  },
  {
    data: { id: 1, name: "foo" },
    routes: ["/parent", "/parent/:id", "/parent/child"],
    middlewares: override, // executes override for every route of this object
  },
];
```

From the above script the first route `/users` don't execute any method.
The second route `/data/:id` execute the `override` method which overrides the response as `{id:1,name:"bar"}`.
The third route `/users/foo` execute the `logTime` method which doesn't override any response but simply logs the time.

### Common Middleware

You could also provide a common middleware which runs for every routes.
The common middleware method is provided inside the `config` object. Some routes can also be excluded from common middleware being executed using the `excludedRoutes`. For Example:

```js
const { FakeResponse } = require("fake-response");

const commonMiddleware = ({ next }) => {
  console.log(new Date());
  next();
};

const db = [
  {
    data: "Hello World",
    routes: "/hello",
  },
];

const config: Config = {
  middleware: {
    func: commonMiddleware,
    excludeRoutes: ["/excludedRoute"],
  },
};

new FakeResponse(db, config, globals).launchServer();
```

Here the `commonMiddleware` logs time for every route request except the `excludeRoutes`.

### Route types

This package is built upon express jS. Please visit [expressJs](https://expressjs.com/en/guide/routing.html) for configuring different route paths.

### Sample

Here is simple example for starter. Runs at ["http://localhost:3000"]("http://localhost:3000")
You could find the sample db [here](https://github.com/R35007/Fake-Response/blob/master/src/samples/index.ts)

```js
const { FakeResponse } = require("fake-response");

new FakeResponse().launchServer(); // runs by default sample db and config
```

### CLI

We can also run the Fake Server in CLI. Create a `db.json` file.

```json
{
  "hello": "Hello World",
  "route1,route2": {
    "description": "This data shares a multiple routes."
  }
}
```

Start Fake Response Server

```sh
fake-response db.json
```

(or)

Create a `db.js` file.

```js
const db = [
  {
    data: "Hello World",
    routes: "/hello",
  },
];

const config = {
  port: 4000,
};

const globals = {};

module.exports = { db, config, globals };
```

Start Fake Response Server

```sh
fake-response db.js
```

## Default Routes

- `Home` - [http://localhost:3000](http://localhost:3000)
- `Db` - [http://localhost:3000/db](http://localhost:3000/db)
- `Routes List` - [http://localhost:3000/routesList](http://localhost:3000/routesList)

The routes and port can be overridden in the `db.js` configs

## API

### FakeResponse

This is a constructor to initialize the db, config, globals, Injectors

```js
const { FakeResponse } = require("fake-response");

const db = {
  hello: {
    value: "Hello World",
  },
};

const config = {
  port: 4000,
};

const globals = {
  description: "This is a predefined value",
};

const Injectors = [
  {
    middleware: ({ next, globals }) => {
      console.log(globals.description);
      next();
    },
    delay: 2000,
    routes: ["hello"],
  },
];

const fakeResponse = new FakeResponse(db, config, globals, injectors);
```

**`Params`**

| Name      | Type   | Required | Default        | Description                                                            |
| --------- | ------ | -------- | -------------- | ---------------------------------------------------------------------- |
| db        | object | No       | default_db      | This object generates the local rest api.                              |
| config    | object | No       | default_config | This object sets the port, common middleware and delay                 |
| globals   | object | No       | {}             | This object helps to store the global values                           |
| injectors | array  | No       | []             | Helps to inject a specific middleware or delay for the existing routes |

### launchServer

It validates all the params in the FakeResponse, loads the resources and starts the server.

```js
fakeResponse.launchServer();
```

**`Returns a Promise of`**

| Name       | Type   | Description                                                                  |
| ---------- | ------ | ---------------------------------------------------------------------------- |
| app        | object | express.Application - helps set any external routes or middlewares           |
| server     | object | Server- helps to start or stop the express server                            |
| results    | object | RouteResult - returns the success and failure status of the generated routes |
| db         | array  | Db[] - returns the success and failure status of the generated routes        |
| config     | object | Config - returns the currently using config object                           |
| globals    | object | Globals - returns the currently using globals object                         |
| fullDbData | object | returns the full set of Database                                             |

### createExpressApp

Returns the instance of the express.Application - helps set any external routes or middleware.

```js
fakeResponse.createExpressApp();
```

### startServer

Returns a Promise of `Server`. - helps to start the app server externally

```js
fakeResponse.startServer();
```

### stopServer

Returns a Promise of Boolean. - helps to stop the app server externally

```js
fakeResponse.stopServer();
```

### loadResources

Returns a Promise of Routes results - the success and failure status of the generated routes

```js
fakeResponse.loadResources();
```

### createRoute

Create a new route with specific middleware or delay

```js
const data = {
  value: "This is  anew Data",
};

const newMiddleware = ({ next }) => {
  console.log("This middleware run specifically for the /newRoute");
  next();
};

fakeResponse.createRoute(data, "default", "/newRoute", newMiddleware, 100);
```

**`Params`**

| Name       | Type     | Required | Default        | Description                                    |
| ---------- | -------- | -------- | -------------- | ---------------------------------------------- |
| data       | any      | Yes      | undefined      | This is the response data                      |
| dataType   | string   | Yes      | undefined      | this defined what type of response is gonna be |
| route      | string   | Yes      | undefined      | The new route that you wanna creates           |
| middleware | function | No       | empty function | Middleware to manipulate response              |
| delay      | number   | No       | undefined      | Sets the delay of the response                 |

### createDefaultRoutes

Create a default home, db, routes list api

```js
fakeResponse.createDefaultRoutes();
```

### setData

set the db, config, globals, injectors

```js
fakeResponse.setData(db, config, globals, injectors)
```

### getData

returns the valid  DB, config, globals, injectors

```js
const{db, config, globals, injectors} = fakeResponse.getData();

// use the below api to get a specific valid data
const valid_config = fakeResponse.getValidConfig(config); // validates and return a valid config
const valid_injectors = fakeResponse.getValidInjectors(injectors); // validates and return a valid injector
const valid_globals = fakeResponse.getValidGlobals(globals); // validates and return a valid globals
const valid_db = fakeResponse.getValidDb(db, injectors); // validates and return a valid db
const valid_db = fakeResponse.transformJson(db, injectors); // helps to convert the JSON db to a structured DB to create a route
```

**`Params`**

| Name      | Type   | Required | Default        | Description                                                            |
| --------- | ------ | -------- | -------------- | ---------------------------------------------------------------------- |
| db        | object | No       | sample_db      | This object generates the local rest api.                              |
| config    | object | No       | default_config | This object sets the port, common middleware and delay                 |
| globals   | object | No       | {}             | This object helps to store the global values                           |
| injectors | array  | No       | []             | Helps to inject a specific middleware or delay for the existing routes |

## Author

**Sivaraman** - [sendmsg2siva.siva@gmail.com](sendmsg2siva.siva@gmail.com)

- _Website_ - [https://r35007.github.io/Siva_Profile/](https://r35007.github.io/Siva_Profile/)
- _Portfolio_ - [https://r35007.github.io/Siva_Profile/portfolio](https://r35007.github.io/Siva_Profile/portfolio)
- _GitHub_ - [https://github.com/R35007/Fake-Response](https://github.com/R35007/Fake-Response)

## License

MIT
