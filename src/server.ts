import express, { Application, Request, Response, NextFunction } from "express";
import { Course } from "./models/course";
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
    try {
      let course: Course = new Course(req.body.title, req.body.description, req.body.hashtags,
                                      req.body.type, req.body.sub_type);
      //TODO: Add course to db
    } catch (e) {
      console.log("Error creating course: ", e);
      res.status(405).json({'status': 'error', 'message': 'Missing or invalid fields'});
    }
    res.status(200).json({'status': 'ok', 'message':'course succesfully created'}) //TODO: Should i return the course?
  })

  return app;
}