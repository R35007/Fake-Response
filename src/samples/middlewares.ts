import { Middleware } from "../model";

export const commonMiddleware = ({ next }) => {
  // do something here
  next(); // executes the default Middleware by express js
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

export const responseSequence: Middleware = ({ req, res, data, globals }) => {
  const resp = [data, "init", "start", "hold", "stop"];
  const currentRespIndex = resp.indexOf(globals.value);
  globals.value = resp[currentRespIndex + 1] || resp[0]; // loop through responses for each request
  res.send(
    globals.value +
      `  -  Please click <a href="${req.path}" target="_blank">${req.path}</a> or refresh to change the response`
  );
};

export const setResponseToGlobal: Middleware = ({ res, req, globals }) => {
  if (Object.keys(req.query).length > 0) {
    globals.queryParams = req.query;
    res.send(
      `The query params are shared to /getResponse route. Please go to <a href="/getResponse" target="_blank">/getResponse</a> to view the results`
    );
  } else {
    res.send(`Please set any query param to share to <a href="/getResponse" target="_blank">/getResponse</a> route.`);
  }
};

export const getSharedResponse: Middleware = ({ res, globals }) => {
  const queryParams = globals.queryParams || {};
  const resp =
    Object.keys(queryParams).length > 0
      ? queryParams
      : `change the query param of <a href="/shareResponse" target="_blank">/shareResponse</a> route to get a dynamic result here`;
  res.send(resp);
};

export const getJsonData: Middleware = ({ next, data, locals }) => {
  console.log();
  console.log("This bellow data is fetched from file path or url : " + data); // data is the actual url which you provide
  console.log(locals.fileType.data); //locals holds the data that are fetched from json or txt file.
  console.log();
  next(); // executes the common middleware provided in the config
};

export const getInjectedData: Middleware = ({ res }) => {
  res.send("This is an injected Response and is delayed for 300 milliseconds");
};

export const queryUser: Middleware = ({ req, res, data, locals }) => {
  const filteredData = locals.fileType.data.find((d) => d.id == req.params.id);
  res.send(filteredData);
};
