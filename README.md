# Fake Response [![](https://travis-ci.org/typicode/json-server.svg?branch=master)](https://travis-ci.org/typicode/json-server) [![](https://badge.fury.io/js/json-server.svg)](http://badge.fury.io/js/json-server)

Get a full fake REST API with **zero coding** in **less than 30 seconds** (seriously)

Created with <3 for front-end developers who need a quick back-end for prototyping and mocking.

## Table of contents

- [Getting started](#getting-started)
- [Advantages](#advantages)
- [Data Types](#data-types)
  - [Default Data](#default-data)
  - [File Data](#file-data)
  - [URL Data](#url-data)
  - [Middleware](#middleware)
  - [Route types](#route-types)
  - [Simple example](#simple-example)
- [Default Routes](#default-routes)
- [Author](#author)
- [License](#license)

## Getting started

Install Fake Response

```
npm install  fake-response
```

Create a `route.js` file

```js
import * as fake from "fake-response";

const routeConfigs = [
  {
    data: "Hello World",
    routes: ["/hello"],
  },
];

fake.getResponse(routeConfigs, 3000);
```

Run the command `node route.js` on the node command line

Now if you go to [http://localhost:3000/hello](http://localhost:3000/hello), you'll get

```text
Hello World
```

To watch the server for every changes you can use `nodemon`.

```
  npm i nodemon
```

Once node mode in installed you can run the following command to watch the server for changes.

```
nodemon route.js
```

Also when doing requests, it's good to know that:

- Always start a routes with a prefix `/`. example : `/data`, `/user` etc..
- You could point multiple routes for a single data. example :

```js
const routeConfigs = [
  {
    data: "Hello World",
    routes: ["/hello", "/helloWorld", "/hello/:id"],
  },
];
```

- You could also override the response. For example :

```js
const middleware = (req, res, data) => {
  return { ...data, id: 1 }; // you could return any response you wish
};
const routeConfigs = [
  {
    data: "Hello World",
    routes: ["/hello", "/helloWorld"],
    middlewares: [middleware],
  },
];
```

- Here the function at first index points to the first routes index and will not execute for the second routes
- If the function you provide doesn't return anything then you will receive the default data which u have provided
- It has three different data Types.

  - `default` - The data can be in form of string | number | json
  - `file` - To send any file. Note : you must provide a absolute path of the file in the `data` property
  - `url` - fetch data from any url

### Advantages

- Get a full fake REST API in ease
- A single response can be point to multiple route paths.
- Any file can be send as a response. (json, image, txt, etc..)
- The mock data can be maintained in different json files and urls which helps to organize your mock data
- The return response can be manipulated and override by a middleware method. This helps to return a response depending on the post data or request params.

## Data Types

Based on the previous `route.js` file, here are all the kinds of config you can use. The `daaType` defines what type of data you want to fetch. It has three different data types.

- default
- file
- url

### Default Data

By default the data can be in form of JSON | text | number. The following example are the default data types.
Here the property `dataType` is optional. By default the property `dataType` value is `default`

```js
const routeConfigs = [
  {
    data: "Hello World",
    routes: ["/text"],
  },
  {
    data: 1234,
    routes: ["/number"],
    dataType: "default", // optional for default data
  },
  {
    data: {
      id: 1,
      author: "Siva",
    },
    routes: ["/json"],
  },
];
```

### File Data

Mock DB provides you to access any file in the api.
All you is to provide the `data` property with **absolute path** of the file and set `dataType` value to `file`.
For Example:

```js
const path = require("path");

const routeConfigs = [
  {
    data: path.resolve(__dirname, "../assets/users.json"), // path.resolve helps to provide you the absolute path of the file.
    dataType: "file",
    routes: ["/json"],
  },
  {
    data: path.resolve(__dirname, "../assets/Sunset_Birds.jpg"),
    dataType: "file",
    routes: ["/image"],
  },
  {
    data: path.resolve(__dirname, "../assets/article.txt"),
    dataType: "file",
    routes: ["/txt"],
  },
];
```

### URL Data

The data can be fetched from the url you provide. The data endpoint can be defined in two ways.

- Directly give the url as a string in `data` property
- Or provide and object with url and config of the endpoint. In config you could provide your authentication headers
  Here are some examples for you.

```js
const routeConfigs = [
  {
    data: "https://jsonplaceholder.typicode.com/todos/1",
    dataType: "url",
    routes: ["/todos/:id"],
  },
  {
    data: {
      url: "https://jsonplaceholder.typicode.com/todos",
      config: {}, // can pass any authorization or other option. Please verify Axios
    },
    dataType: "url",
    routes: ["/todos"],
  },
];
```

### Middleware

You could any method as a middleware to perform certain script actions before sending you the response.
This helps in may way that you could also override your response based on any conditions.
The methods are provided in `middlewares` property in an array the index of the method corresponds to the index of the routes.
For Example:

```js
const logTime = (req, res, data) => {
  console.log(new Date());
};

const override = () => ({ ...data, name: "ram" });

const routeConfigs = [
  {
    data: { id: 1, name: "Siva" },
    routes: ["/users", "/data/:id", "/users/siva"],
    middlewares: [, override, logTime],
  },
];
```

From the above script the first route `/users` don't execute any method.
The second route `/data/:id` execute the `override` method which overrides the response as `{id:1,name:"ram"}`.
The third route `/users/siva` execute the `logTime` method which doesn't override any response but simply logs the time.

### Route types

This package is built upon express jS. Please visit [expressJs](https://expressjs.com/en/guide/routing.html) for configuring different route paths.

### Simple example

Here is sample configs that you can provide

```js
import * as fake from "fake-response";

import express from "express";
import { RouteConfig } from "./route-config-model";

const fs = require("fs"),
  path = require("path");

const logTime = (req: express.Request, res: express.Response, data: any) => {
  console.log(new Date());
};

const override = (req: express.Request) => ({ id: 2, ...req.body });

const getData = () => ({ id: 1, name: "Siva" });

const routeConfigs: RouteConfig[] = [
  {
    data: { id: 1, name: "Siva" },
    routes: ["/users/:id"],
  },
  {
    data: "Hello World",
    routes: ["/hello"],
  },
  {
    data: getData(),
    routes: ["/func"],
  },
  {
    data: require("../assets/users.json"),
    routes: ["/users", "/data/:id", "/users/siva"],
    middlewares: [, override, logTime],
  },
  {
    data: path.resolve(__dirname, "../assets/users.json"),
    dataType: "file",
    routes: ["/json"],
  },
  {
    data: path.resolve(__dirname, "../assets/Sunset_Birds.jpg"),
    dataType: "file",
    routes: ["/image"],
  },
  {
    data: path.resolve(__dirname, "../assets/article.txt"),
    dataType: "file",
    routes: ["/txt"],
  },
  {
    data: "https://jsonplaceholder.typicode.com/todos/1",
    dataType: "url",
    routes: ["/todos/:id"],
  },
  {
    data: {
      url: "https://jsonplaceholder.typicode.com/todos",
      config: {}, // can pass any authorization or other option. Please verify Axios
    },
    dataType: "url",
    routes: ["/todos"],
  },
];

fake.getResponse(routeConfigs, 3000);
```

## Default Routes

- `Home` - [http://localhost:3000](http://localhost:3000)
- `Db` - [http://localhost:3000/db](http://localhost:3000/db)
- `Routes List` - [http://localhost:3000/routesList](http://localhost:3000/routesList)

These can be overridden in the `route.js` configs

## Author

**Sivaraman** - sendmsg2siva.siva@gmail.com

- _Website_ - https://r35007.github.io/Siva_Profile/
- _Portfolio_ - https://r35007.github.io/Siva_Profile/portfolio
- _GitHub_ - https://github.com/R35007

## License

MIT
