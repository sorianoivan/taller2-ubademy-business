import express, { Application, Request, Response } from "express";
import schema from "js-schema";
import { Db, MongoAPIError, ObjectId } from "mongodb";
import { Course } from "./models/course";
//import * as mongoDB from "mongodb";
import { UserProfile } from "./models/user_profile";
const body_parser = require('body-parser');
const mongo = require("mongodb")
//const { MongoClient } = require("mongodb");


//TODO: The link is here because when the tests are run there is no env to take MONGODB_URL from.
const url = process.env.MONGODB_URL || "mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority";

export function connect_to_database() {
  const mongo_client = new mongo.MongoClient(url);
  try {
    mongo_client.connect();
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
        res.status(200).json({'status':'error','message':'id should be a string'});
        return;
      }
      const my_course = await business_db.collection("Courses").findOne({_id: new ObjectId(req.body.id)});
      console.log(my_course);//To debug
      res.status(200).json(my_course) 
    } catch (err) {
      console.log(err);
      res.status(200).json({'status': 'error', 'message': 'Course not found'});
    }
  });

  app.use(body_parser.json());
  app.post("/create_profile", async (req: Request, res: Response) => {

    // We might have to use this if we decide to tell the difference between a repeated key and other type of error

    // try {
    //   const user_profile = new UserProfile(req.body.name, req.body.email, "", req.body.subscription_type);
    //   const p = profiles_table.insertOne(user_profile).then;
    //   res.send("Profile created successfully");
    // } catch (e) {
    //   if (e instanceof mongo.MongoServerError) {
    //     res.send("User profile already exists");
    //   } else {
    //     res.send("Unknown error");
    //   }
    // }

    const profiles_table = business_db.collection(<string>process.env.PROFILES_TABLE);

    try {
      const user_profile = new UserProfile(req.body.name, req.body.email, "", req.body.subscription_type);
      await profiles_table.insertOne(user_profile);
      res.send("Profile created successfully");
    } catch (e) {
      //TODO: DIFERENCIAR EL ERROR DE UNIQUE DE MONGODB DE OTRO INESPERADO
      res.send("User profile already exists");
    }

  });

  return app;
}