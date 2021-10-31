import express, { Application, Request, Response, NextFunction } from "express";
import { Course } from "./models/course"
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
    let course: Course = req.body; //TODO: Find out how to do this correctly because its not failing if it receives an argument of the wrong type
    console.log(course);
    res.send({'create': 'okkk'}) //TODO: Return something else
  })

  return app;
}