import express, { Application, Request, Response } from "express";
import { Course } from "./models/course";
import * as body_parser from "body-parser";
import * as mongoDB from "mongodb";

const MONGODB_URL = "mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority";

export function connect_to_database() {
  const mongo_client = new mongoDB.MongoClient(MONGODB_URL);
  try {
    mongo_client.connect();
    console.log("Connected correctly to server");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
  return mongo_client
}

export function create_server(business_db: mongoDB.Db) {
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

  app.use(body_parser.json());

  app.post("/create_course", async (req: Request, res: Response) => {
    try {
      let course: Course = new Course(req.body.email, req.body.title, req.body.description, req.body.hashtags,
                                      req.body.location, req.body.type, req.body.subscription_type);
      console.log(course);//To debug
      await business_db.collection("Courses").insertOne(course);
      console.log("Course succesfully inserted");      
    } catch (e) {
      console.log("Error creating course: ", e);
      if (e instanceof mongoDB.MongoServerError) {
        res.status(202).json({'status': 'error', 'message': 'Could not insert course to db'});
        return;
      } else if (e instanceof Error){//If the course fails the checks in its constructor it throws Error. TODO: Change to a custom error
        res.status(201).json({'status': 'error', 'message': 'Missing or invalid fields'});
        return; 
      }
    }
    res.status(200).json({'status': 'ok', 'message':'course succesfully created'}) 
  })

  app.get("/course/", async (req: Request, res: Response) => {
    // try{
    //   const my_course = await business_db.collection("Courses").findOne({title: "epico"});
    //   console.log(my_course);
    //   res.status(200).end();
    // } catch (err) {
    //   console.log(err);
    //   res.status(406).end();
    // }
  });
  return app;
}