import express, { Application, Request, Response, NextFunction } from "express";
import { Course } from "./models/course";
const body_parser = require('body-parser');
import * as mongoDB from "mongodb";

// const url = "mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority";
// const client = new mongo.MongoClient(url);
// async function run() {
//     try {
//         await client.connect();
//         console.log("Connected correctly to server");
//     } catch (err) {
//         console.log(err);
//     }
//     finally {
//         //await client.close();
//     }
// }
// run().catch(console.dir);

// const business_db = client.db(<string>"Business");
// //const profiles_table = business_db.collection(<string>process.env.PROFILES_TABLE);
// const courses_table = business_db.collection(<string>"Courses");


export default function createServer(business_db: mongoDB.Db) {
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

  app.post("/create", async (req: Request, res: Response) => {
    try {
      let course: Course = new Course(req.body.email, req.body.title, req.body.description, req.body.hashtags,
                                      req.body.location, req.body.type, req.body.subscription_type);
      console.log(course)
      business_db.collection("Courses").insertOne(course)
      .then((result: { insertedId: any; }) => console.log(`Successfully inserted item with _id: ${result.insertedId}`))
      .catch((err: any) => console.error(`Failed to insert item: ${err}`))
      //await client.close();
      console.log("chau")
      //const p = await courses_table.insertOne(course);
      //console.log(p)
    } catch (e) {
      console.log("Error creating course: ", e);
      res.status(405).json({'status': 'error', 'message': 'Missing or invalid fields'});
      return;
    }
    res.status(200).json({'status': 'ok', 'message':'course succesfully created'}) //TODO: Should i return the course?
  })

  app.get("/course", async (_req: Request, res: Response) => {
    try{
      const my_course = await business_db.collection("Courses").findOne({title: "epico"});
      // Print to the console
      console.log(my_course);
      res.status(200).end();
    } catch (err) {
      console.log(err);
      res.status(406).end();
    }
  });
  return app;
}