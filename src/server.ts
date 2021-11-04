import express, { Application, Request, Response, NextFunction } from "express";
import { Course } from "./models/course";
const bodyParser = require('body-parser');


export default function createServer() {
  const app: Application = express();

  app.get("/", (req: Request, res: Response) => {
    res.send("Hello world!");
  });

  app.get("/ping", (req: Request, res: Response) => {
    res.send("pong");
  });

  app.get("/status", (req: Request, res: Response) => {
    res.send("ok");
  });

  app.use(bodyParser.json());

  app.post("/create", (req: Request, res: Response) => {
    try {
      let course: Course = new Course(req.body.email, req.body.title, req.body.description, req.body.hashtags,
                                      req.body.location, req.body.type, req.body.sub_type);
      //TODO: Add course to db
      console.log(course)
    } catch (e) {
      console.log("Error creating course: ", e);
      res.status(405).json({'status': 'error', 'message': 'Missing or invalid fields'});
    }
    res.status(200).json({'status': 'ok', 'message':'course succesfully created'}) //TODO: Should i return the course?
  })

  /*  Curl command to test course creation. Change token once it timeouts
  curl --request POST \
  --url http://localhost:8516/courses/create \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1bl9tYWlsX3JhbmRvbUBnbWFpbC5jb20iLCJleHAiOjE2MzU5OTMyNjB9.Ri80aTDX9ZoCpBTW67z8sWTFZMbxvMlCnvXkTH0Dc-A' \
  --header 'Content-Type: application/json' \
  --data '{"title":"chau","description":"alto curso", "hashtags":["h1","h2"],"sub_type":"gratis","type":"programacion"}' 
  */

  return app;
}