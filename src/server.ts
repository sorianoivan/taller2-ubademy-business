import express, { Application, Request, Response } from "express";
import schema from "js-schema";
import { Db, MongoAPIError, ObjectId } from "mongodb";
import { Course } from "./models/course";
//import * as mongoDB from "mongodb";
import { UserProfile } from "./models/user_profile";
import { config } from "./configuration/config"
const body_parser = require('body-parser');
const mongo = require("mongodb")

//TODO: The link is here because when the tests are run there is no env to take MONGODB_URL from.
const url = process.env.MONGODB_URL || "mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority";

//const profiles_table = business_db.collection(process.env.PROFILES_TABLE || "Profiles");

export function connect_to_database() {
  const mongo_client = new mongo.MongoClient(url);
  try {
    mongo_client.connect();//Agrego .then()?
    console.log("Connected correctly to server");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
  return mongo_client
}

export function create_server(business_db: Db) {//Db is the type for a mongo database
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
      let course: Course = new Course(req.body);
      console.log(course);//To debug
      await business_db.collection("Courses").insertOne(course);
      console.log("Course succesfully inserted");
    } catch (e) {
      console.log("Error creating course: ", e);
      if (e instanceof mongo.MongoServerError) {
        res.status(200).json({'status': 'error', 'message': 'failed_insert_course'});
        return;
      } else if (e instanceof Error){//If the course fails the checks in its constructor it throws Error. TODO: Change to a custom error
        res.status(200).json({'status': 'error', 'message': 'failed_create_course'});
        return; 
      } else {
        res.status(400).json({'status':'error', 'message':'unexpected error'});
      }
    }
    res.status(200).json({'status': 'ok', 'message':'course succesfully created'}) 
  })

  app.get("/course", async (req: Request, res: Response) => {
    try{
      const Id = schema(String)
      if (!Id(req.body.id)) {
        res.status(200).json({'status':'error','message':'invalid_course_id'});
        return;
      }
      const my_course = await business_db.collection("Courses").findOne({_id: new ObjectId(req.body.id)});
      console.log(my_course);//To debug
      let response = Object.assign({}, {'status': 'ok', 'message':'Course found'}, my_course);
      res.status(200).json(response);
    } catch (err) {
      console.log(err);
      res.status(200).json({'status': 'error', 'message': 'course_not_found'});
    }
  });

  const profiles_table = business_db.collection(process.env.PROFILES_TABLE || "Profiles");

  app.use(body_parser.json());
  app.post("/create_profile", async (req: Request, res: Response) => {
    try {
      const user_profile = new UserProfile(req.body.name, req.body.email, "", "Free", []);
      await profiles_table.insertOne(user_profile);
      res.send("Profile created successfully");
    } catch (e) {
      let error = <Error>e;
      console.log(error.name);
      if (error.name === "InvalidConstructionParameters") {
        res.send("Received invalid parameters in request body");
      } else if (error.name === "MongoServerError") {
        res.send("User profile already exists");
      } else {
        res.status(400).send("Unexpected error");
      }
    }
  });

  app.use(body_parser.json());
  app.post("/update_profile", async (req: Request, res: Response) => {
    try {
      const user_profile = new UserProfile(req.body.name, req.body.email, req.body.country, req.body.subscription_type, req.body.interesting_genres);
      const query = { "email": req.body.email };
      const update = { "$set": user_profile };
      const options = { "upsert": false };

      let { matchedCount, modifiedCount } = await profiles_table.updateOne(query, update, options);
      if (matchedCount === 0) {
        res.send("Unknown user");  
      } else {
        res.send("Updated sucessfully");
      }
    } catch (e) {
      let error = <Error>e;
      console.log(error.name);
      if (error.name === "InvalidConstructionParameters") {
        res.send("Received invalid parameters in request body");
      } else {
        res.status(400).send("Unexpected error");
      }
    }
  });

  app.get("/countries", (req: Request, res: Response) => {
    res.send({"locations": config.get_available_countries()});
  });

  app.get("/course_genres", (req: Request, res: Response) => {
    res.send({"courses": config.get_available_genres()});
  });

  app.get("/subscription_types", (req: Request, res: Response) => {
    res.send({"types": config.get_subscription_types()});
  });

  return app;
}
