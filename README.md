# Fake Response[](#fake-response) [![](https://badge.fury.io/js/fake-response.svg)](http://badge.fury.io/js/fake-response)

Get a full fake REST API with **zero coding** in **less than 30 seconds** (seriously)

Created with <3 for front-end developers who need a quick back-end for prototyping and mocking.

## Table of contents

- [Getting started](#getting-started)
- [Advantages](#advantages)
- [How To Use](#how-to-use)
  - [Defaults](#defaults)
  - [Data Types](#data-types)
    - [Default Data](#default-data)
    - [File Data](#file-data)
    - [URL Data](#url-data)
  - [Specific Delay](#specific-delay)
  - [Specific Middleware](#specific-middleware)
  - [Specific StatusCode](#specific-statuscode)
  - [Injectors](#injectors)
  - [Globals](#globals)
    - [Share Data between Routes](#share-data-between-routes)
    - [Response Sequence](#response-sequence)
  - [Config](#config)
    - [Port](#port)
    - [Root Path](#root-path)
    - [Base Url](#base-url)
    - [Env](#env)
    - [Groupings](#groupings)
    - [Proxy](#proxy)
    - [Exclude Routes](#exclude-routes)
    - [Common Middleware](#common-middleware)
    - [Common delay](#common-delay)
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
  - [transformJson](#transformjson)
  - [transformHar](#transformhar)
  - [filterBySchema](#filterbyschema)
  - [getMockJSON](#getmockjson)
  - [getMatchedRoutesList](#getmatchedrouteslist)
  - [getMockFromPath](#getmockfrompath)
- [Author](#author)
- [License](#license)

## Getting started

Install Fake Response

```sh
npm install -g fake-response
```

install nodemon for watching changes

```sh
npm install -g nodemon
```

Create a `index.js` file

```js
const { FakeResponse } = require("fake-response");

let db;

db = "./index.json"; // provide the path of your mock json here

// or

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

new FakeResponse(db).launchServer();
```

Now to run the file go to terminal and type the following

```sh
nodemon index.js
```

The above command runs the file and starts the local server.

Now if you go to [http://localhost:3000/hello](http://localhost:3000/hello), you'll get

```text
Hello World
```

## Advantages

- A single response can be point to multiple route paths.
- Any file can be send as a response. (json, image, txt, etc..)
- Can set any value to globals and can be accessed at any point of time which also helps to share data between routes.
- The mock data can be maintained in different json files and urls which helps to organize your mock data
- The return response can be manipulated or overridden for a specific route by a middleware method.
- Switch between environmental data
- Similar pattern routes can to grouped to a single route
- proxy routes can be used

## How To Use

Based on the previous `index.js` file, here are all the kinds of data and config you can use. Lets start with defaults

### **Defaults**

You can view all default config, db, injectors, globals in the following link.
[https://github.com/R35007/Fake-Response/blob/master/src/defaults.ts](https://github.com/R35007/Fake-Response/blob/master/src/defaults.ts)

### **Data Types**

There are three data type that you can provide. `default`, `file`, `url`

#### **Default Data**

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

#### **File Data**

Mock DB provides you to access any file in the api.
All you have is to provide the `data` property with **absolute path** of the file and set `dataType` value to `file`.
Note: If you provide a relative path then that path will be relative to the config root path.
For Example:

```js
const path = require("path");

const db = [
  {
    data: "./users.json", // it picks from ../assets/users.json
    dataType: "file",
    routes: "/json",
  },
  {
    data: "./article.txt", // this path is relative to the config rootPath
    dataType: "file",
    routes: "/txt",
  },
];

const config = {
  // Please provide absolute path in rootPath
  rootPath: "../assets/", // ./ is the default rootPath
};
```

#### **URL Data**

The data can be fetched from the url you provide. The data endpoint can be defined in two ways.

- Directly give the url as a string in `data` property
- Or provide and object with url and config of the endpoint. In config you could provide your authentication headers
  Here are some examples for you.

```js
const db = [
  {
    data: "https://r35007.github.io/Siva_Profile/images/portfolio/Sunset_Birds.jpg",
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

### **Specific Delay**

You could also delay the response of your request.
For Example:

```js
const db = [
  {
    data: "Hello World",
    routes: "/hello",
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

new FakeResponse(db).launchServer();
```

Note : Always delay time must be given in `milliseconds`

### **Specific Middleware**

You could any method as a middleware to perform certain script actions before sending you the response.
This helps in may way that you could also override your response based on any conditions.
The methods are provided in `middlewares` property in an array the index of the method corresponds to the index of the routes.
For Example:

```js
const logTime = ({ next }) => {
  console.log(new Date());
  next(); // always call next if you are not sending response in this middleware
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

### **Specific StatusCode**

Helps to set a status code of the response

```js
const db = [
  {
    data: { id: 1, name: "foo" },
    routes: ["/users", "/data/:id", "/users/foo"],
    statusCodes: [, 500, 404],
  },
  {
    data: { id: 1, name: "foo" },
    routes: ["/parent", "/parent/:id", "/parent/child"],
    statusCodes: 200, // executes statusCodes for every route of this object
  },
];
```

### **Injectors**

Injectors helps to inject a specific middleware and delay for the existing routes. For Example :

```js
const { FakeResponse } = require("fake-response");

const db = {
  "route1":{
    data : "This response will be changed using the injected middleware"
  },
  "route2":{
    data : "This response will be changed using the injected middleware"
  }
}

const Injectors = [
  {
    middleware : ({res}) => res.send("This is an injected response")
    routes:["/route1"]
  },
  {
    delay: 300,
    isGrouped : false
    routes:["/route2"]
  },
  {
    statusCode: 300, // must be between 100 - 599
    routes:["/route2"]
  }
]

new FakeResponse(db, {} , Injectors).launchServer(); // uses the default config
```

from the above code `route1` has the middleware and `route2` has the delay

### **Globals**

Using **Globals** you could store any value in the `globals` object and can be shared across any routes.
This also helps to manipulate the response in many ways. Lets see a simple count Example :

```js
const { FakeResponse } = require("fake-response");

const db = {
  hello: "hello World",
};

const globals = {
  "/hello": {
    count: 0,
  },
};

const config = {
  middleware: ({ req, res, globals }) => {
    globals[req.path].count++;
    res.send(globals[req.path].count);
  },
};

new FakeResponse(db, config, [], globals).launchServer();
```

From the above the count increases on each hit of the endpoint.

#### **Share Data between Routes**

Lets see an another example. This below code helps to share data between routes.

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
  const resp = Object.keys(queryParams).length > 0 ? queryParams : "change the query param of /shareResponse route to get a dynamic result";
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

new FakeResponse(db, config, [], globals).launchServer();
```

#### **Response Sequence**

This below code helps to send a sequence of response

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

new FakeResponse(db, config, [], globals).launchServer(); // second param use the default configs
```

Now you get a different response for each request.

### **Config**

you can provide your own config by passing the config object in the `FakeResponse` constructor. For Example :

#### **Port**

```js
const { FakeResponse } = require("fake-response");

const db = {
  hello: "Hello World",
};

const config = {
  port: 4000, // 3000 is he default port
};

new FakeResponse(db, config).launchServer();
```

#### **Root Path**

Roth path helps to get the files that are relative to this path. For example please refer [File Data](#file-data)

#### **Base Url**

This url will be added to prefix to the every mock routes

```js
const { FakeResponse } = require("fake-response");

const db = {
  hello: "Hello World",
};

const config = {
  baseUrl: "/api",
};

new FakeResponse(db, config).launchServer();
```

Now if you go to [http://localhost:3000/api/hello](http://localhost:3000/api/hello), you'll get

```text
Hello World
```

#### **Env**

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
    },
    dev:{
      value : "bar"
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

#### **Groupings**

Helps to group all similar pattern routes into a single route. For example

```js
const { FakeResponse } = require("fake-response");

const db = {
  hello: "Hello World",
  "root/parent/foo/1": "foo 1",
  "root/parent/foo/2": "foo 2",
  "root/parent/foo,root/parent/foo/3": "foo 3",
};

const config = {
  groupings: {
    "root/parent/:child/:id": "myRoute/:child/:id",
  },
  excludeRoutes: {
    exactMatch: ["hello"], // removes route that exactly match this route
    patternMatch: ["root/parent/:child/:id"], // removes every routes that matched this pattern
  },
};

new FakeResponse(db, config).launchServer();
```

Now go to [http://localhost:3000/myRoute/foo/2](http://localhost:3000/myRoute/foo/2), you'll get

```text
foo 2
```

Now go to [http://localhost:3000/myRoute/foo/5](http://localhost:3000/myRoute/foo/5), you'll get

```text
foo 2
```

Since the `myRoute/foo/5` doesn't contain any data it return the first data of `myRoute/foo/5`

Note : Always remember to exclude the pattern routes which are given in groupings

#### **Proxy**

You can able to set the proxy inside the config object. For Example

```js
const { FakeResponse } = require("fake-response");

const db = {
  hello: "Hello World",
  "parent/foo/1": "foo 1",
  "parent/foo/2": "foo 2",
};

const config = {
  proxy: {
    exactMatch: {
      hello: "helloWorld",
    },
    patternMatch: {
      "parent/:child/:id": "myRoute/:child/:id", // generate route along with matched params
    },
  },
};

new FakeResponse(db, config).launchServer();
```

Now go to [http://localhost:3000/helloWorld](http://localhost:3000/helloWorld), you'll get

```text
Hello World
```

Now go to [http://localhost:3000/myRoute/foo/2](http://localhost:3000/myRoute/foo/2), you'll get

```text
foo 2
```

#### **Exclude Routes**

You can also exclude routes using config. For example:

```js
const { FakeResponse } = require("fake-response");

const db = {
  hello: "Hello World",
  "parent/foo/1": "foo 1",
  "parent/foo/2": "foo 2",
};

const config = {
  excludeRoutes: {
    exactMatch: ["hello"] // removes routes that exactly match this pattern
    patternMatch: ["parent/:child/:id"] // removes every routes that matched this pattern
  },
};

new FakeResponse(db, config).launchServer();
```

#### **Common Middleware**

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
    override: false, // set to true to run common middleware before specific middlewares
    excludeRoutes: {
      exactMatch: ["/excludedRoute"],
      patternMatch: ["parent/:child"],
    },
  },
};

new FakeResponse(db, config, [], globals).launchServer();
```

Here the `commonMiddleware` logs time for every route request except the `excludeRoutes`.

#### **Common Delay**

Common Delay helps to set delay for all the routes. you ca also exclude ad override some of the routes. For Example:

```js
const { FakeResponse } = require("fake-response");

const db = [
  {
    data: "Hello World",
    routes: "/hello",
    delay: 3000, // this specific delay will be overridden if override property is set to true inside the common delay in config
  },
];

const config: Config = {
  delay: {
    time: 4000,
    override: true,
    excludeRoutes: {
      exactMatch: ["/excludedRoute"],
      patternMatch: ["parent/:child"],
    },
  },
};

new FakeResponse(db, config, [], globals).launchServer();
```

Here the `/hello` has a delay of 4000mss

### **Sample**

Here is simple example for starter.
You could find the sample db [here](https://github.com/R35007/Fake-Response/blob/master/src/samples/index.ts)

```js
const { FakeResponse } = require("fake-response");

new FakeResponse().launchServer(); // runs the sample
```

Now go to terminal and give the following command

```sh
nodemon index.js
```

This above command rus as starts the server at port 3000 by default.
go to ["http://localhost:3000"]("http://localhost:3000")

### **CLI**

We can also run the Fake Server in CLI. Create a `index.json` file.

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
fake-response index.json
```

(or)

to run the samples

```sh
fake-response
```

## Default Routes

- `Home` - [http://localhost:3000](http://localhost:3000)
- `Db` - [http://localhost:3000/db](http://localhost:3000/db)
- `Routes List` - [http://localhost:3000/routesList](http://localhost:3000/routesList)

The routes and port can be overridden in the `index.js` configs

## API

### **FakeResponse**

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

const fakeResponse = new FakeResponse(db, config, injectors, globals);
```

**`Params`**

| Name      | Type   | Required | Default        | Description                                                            |
| --------- | ------ | -------- | -------------- | ---------------------------------------------------------------------- |
| db        | object | No       | default_db     | This object generates the local rest api.                              |
| config    | object | No       | default_config | This object sets the port, common middleware and delay                 |
| injectors | array  | No       | []             | Helps to inject a specific middleware or delay for the existing routes |
| globals   | object | No       | {}             | This object helps to store the global values                           |

### **launchServer**

It validates all the params in the FakeResponse, loads the resources and starts the server.

```js
fakeResponse.launchServer();
```

**`Returns a Promise of`**

| Name    | Type   | Description                                                                  |
| ------- | ------ | ---------------------------------------------------------------------------- |
| app     | object | express.Application - helps set any external routes or middlewares           |
| server  | object | Server- helps to start or stop the express server                            |
| results | object | RouteResult - returns the success and failure status of the generated routes |

### **createExpressApp**

Returns the instance of the express.Application - helps set any external routes or middleware.

```js
fakeResponse.createExpressApp();
```

### **startServer**

Returns a Promise of `Server`. - helps to start the app server externally

```js
fakeResponse.startServer();
```

### **stopServer**

Returns a Promise of Boolean. - helps to stop the app server externally

```js
fakeResponse.stopServer();
```

### **loadResources**

Returns a Promise of Routes results - the success and failure status of the generated routes

```js
fakeResponse.loadResources();
```

### **createRoute**

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

### **createDefaultRoutes**

Create a default home, db, routes list api

```js
fakeResponse.createDefaultRoutes();
```

### **setData**

set the db, config, injectors, globals.
returns: `getData` and `launchServer`

```js
fakeResponse.setData(db, config, injectors, globals);
```

**`Params`**

| Name      | Type   | Required | Default        | Description                                                            |
| --------- | ------ | -------- | -------------- | ---------------------------------------------------------------------- |
| db        | object | No       | sample_db      | This object generates the local rest api.                              |
| config    | object | No       | default_config | This object sets the port, common middleware and delay                 |
| injectors | array  | No       | []             | Helps to inject a specific middleware or delay for the existing routes |
| globals   | object | No       | {}             | This object helps to store the global values                           |

### **getData**

returns the valid DB, config, globals, injectors

```js
const { db, config, injectors, globals } = fakeResponse.getData();

// use the below api to get a specific valid data
const valid_config = fakeResponse.getValidConfig(config); // validates and return a valid config
const valid_injectors = fakeResponse.getValidInjectors(injectors); // validates and return a valid injector
const valid_globals = fakeResponse.getValidGlobals(globals); // validates and return a valid globals
const valid_db = fakeResponse.getValidDb(db, injectors); // validates and return a valid db
```

### **transformJson**

This helps to convert the JSON db to a structured DB to create a route

```js
const valid_db = fakeResponse.transformJson(db, injectors);
```

**`Params`**

| Name      | Type             | Required | Default | Description                                     |
| --------- | ---------------- | -------- | ------- | ----------------------------------------------- |
| db        | object or string | No       | {}      | This object generates the local rest api.       |
| injectors | array            | No       | []      | Helps to inject a props for the existing routes |

### **transformHar**

The HTTP Archive format, or HAR, is a JSON-formatted archive file format for logging of a web browser's interaction with a site. The common extension for these files is .har. [Wikipedia](<https://en.wikipedia.org/wiki/HAR_(file_format)>).

Using this now it is very much simpler to mock your prod data in ease. Follow the steps to mock your prod Data.

Step 1 : Open Chrome and developer tools
Step 2 : Start the network listening and run your app which you like to mock the data
Step 3 : click the export HAR download icon and save it as a `localhost.json`.
Step 4 : Now do the following code in index.js

```js
const { FakeResponse } = require("fake-response");
const localhostData = require("./localhost.json");

const fakeResponse = new FakeResponse();
const mock = fakeResponse.transformHar(localhostData, ["document", "xhr"], (entry, route, response) => {
  return { [route]: response };
});
fakeResponse.setData(mock);
fakeResponse.launchServer();
```

**`Params`**

| Name                | Type     | Required | Default   | Description                                         |
| ------------------- | -------- | -------- | --------- | --------------------------------------------------- |
| harData             | object   | No       | {}        | This object generates the local rest api.           |
| resourceTypeFilters | object   | No       | []        | Provide your response types to be filtered          |
| callback            | Function | No       | undefined | This method is called on each entry of the har data |

### **filterBySchema**

This method helps to filter properties only which are required using schema.

```js
const {FakeResponse} = require("fake-response");
const fakeResponse = new FakeResponse()
const data = {
 name : foo,
 likes : ["xxx","yyy"],
 address:[{
   "city":"bar",
   "state":"TN",
   "country":"India"
 }]
};

const schema:{
 name:true,
 address:{
   city:true
 }
}
const db = fakeResponse.filterBySchema(data, schema);
```

**`Params`**

| Name   | Type   | Required | Default | Description                     |
| ------ | ------ | -------- | ------- | ------------------------------- |
| data   | any    | No       | {}      | Object to filter props          |
| schema | object | No       | []      | Provide your schema to filtered |

### **getMockJSON**

return the current db in a json format

```js
const mock = fakeResponse.getMockJSON();
```

### **getMatchedRoutesList**

Helps to get list of all exact and pattern Matched routes

```js
const {FakeResponse} = require("fake-response");
const fakeResponse = new FakeResponse()
const data = {
  "parent/1":"data 1",
  "parent/2":"data 2",
  "parent/1/1":"data 1/1",
  "parent/3":"data 3",
  "parent/1/2":"data 1/2",
}

matchList = {
  exactMatch:["parent/1/1"]
  patternMatch:["parent/:child"]
}
const routes = fakeResponse.getMatchedRoutesList(data, matchList);
```

### **getMockFromPath**

return all the json files data to a combined json data from the given path

```js
const mock = fakeResponse.getMockFromPath(directoryPath, excludeFolders);
```

**`Params`**

| Name           | Type   | Required | Default | Description                                                   |
| -------------- | ------ | -------- | ------- | ------------------------------------------------------------- |
| directoryPath  | string | NO       | "./"    | Provide the filepath or the directory path                    |
| excludeFolders | object | No       | []      | list of path or filename to exclude from requiring json files |

## Author

**Sivaraman** - [sendmsg2siva.siva@gmail.com](sendmsg2siva.siva@gmail.com)

- _Website_ - [https://r35007.github.io/Siva_Profile/](https://r35007.github.io/Siva_Profile/)
- _Portfolio_ - [https://r35007.github.io/Siva_Profile/portfolio](https://r35007.github.io/Siva_Profile/portfolio)
- _GitHub_ - [https://github.com/R35007/Fake-Response](https://github.com/R35007/Fake-Response)

## License

MIT
