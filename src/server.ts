import express, { Application, Request, Response, NextFunction } from "express";
const bodyParser = require('body-parser');


export default function createServer() {
  const app: Application = express();

  app.get("/", (req: Request, res: Response, next: NextFunction) => {
    res.send("Hello world!");
  });

  app.get("/ping", (req: Request, res: Response, next: NextFunction) => {
    res.send("pong");
  });

  app.get("/status", (req: Request, res: Response, next: NextFunction) => {
    res.send("ok");
  });

  app.get("/user", (req: Request, res: Response, next: NextFunction) => {
    res.send("john");
  });

  app.use(bodyParser.json());

  app.post("/create", (req: Request, res: Response) => {
    console.log(req.body)
    res.send({'create': 'ok'}) //TODO: Return something else
  })

  return app;
}