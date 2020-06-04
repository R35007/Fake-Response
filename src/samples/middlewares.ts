import { Middleware } from "../model";

export const commonMiddleware = ({ next }) => {
  // do something here
  next(); // excutes the default middleaware by expressjs
};

export const globalDescription = ({ res, globals }) => {
  res.send(globals.description);
};

export const override: Middleware = ({ res }) => {
  res.send({
    id: 2,
    value: "This is a overridden response",
  });
};

export const responseSequence: Middleware = ({ res, data, globals }) => {
  const resp = [data, "init", "start", "hold", "stop"];
  const currentRespIndex = resp.indexOf(globals.value);
  globals.value = resp[currentRespIndex + 1] || resp[0]; // loop through responses for each request
  res.send(globals.value + "  -  Please click refresh to change the response");
};

export const setResponseToGlobal: Middleware = ({ res, req, globals }) => {
  if (Object.keys(req.query).length > 0) {
    globals.queryParams = req.query;
    res.send(`The query params are shared to /getResponse route. Plese go to /getResponse to view the results`);
  } else {
    res.send("Please set any query param to share to /getResponse route.");
  }
};

export const getSharedResponse: Middleware = ({ res, globals }) => {
  const queryParams = globals.queryParams || {};
  const resp =
    Object.keys(queryParams).length > 0
      ? queryParams
      : "change the query param of /shareResponse route to get a dynamic result here";
  res.send(resp);
};

export const getJsonData: Middleware = ({ next, data, locals }) => {
  console.log();
  console.log("This bellow data is fetched from file path or url : " + data); // data is the actula url which you provide
  console.log(locals.fileType.data); //parsedData holds the data that are fetched from json or txt file and also from url
  console.log();
  next(); // excutes the common middleware provided in the config
};
