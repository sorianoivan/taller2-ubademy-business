import express, { Application, Request, Response } from "express";
import schema from "js-schema";
import { Db, MongoAPIError, ObjectId } from "mongodb";
import { Course } from "./models/course";
//import * as mongoDB from "mongodb";
import { UserProfile } from "./models/user_profile";
import { config } from "./configuration/config"
import { InvalidConstructionParameters } from "./models/invalid_construction_parameters";
import e from "express";
const body_parser = require('body-parser');
const mongo = require("mongodb")
import { get_profile_schema } from "./lone_schemas/get_profile"
import request from "supertest";
let courses = require("./endpoints/courses");
let profiles = require("./endpoints/profiles");


//TODO: The link is here because when the tests are run there is no env to take MONGODB_URL from.
// The string is from the test db
const url = process.env.MONGODB_URL || "mongodb+srv://ubademy:business@cluster0.w31lx.mongodb.net/Business?retryWrites=true&w=majority";

const MONGO_SHORT_ID_LEN = 12
const MONGO_LONG_ID_LEN = 24
//const profiles_table = business_db.collection(process.env.PROFILES_TABLE || "Profiles");

export function connect_to_database() {
  const mongo_client = new mongo.MongoClient(url)//.then();
  try {
    mongo_client.connect().then({});//Agrego .then()?
    console.log("Connected correctly to server");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
  return mongo_client
}

export function create_server(business_db: Db) {//Db is the type for a mongo database
  const app: Application = express();

  const profiles_table = business_db.collection(process.env.PROFILES_TABLE || "Profiles");
  const courses_table = business_db.collection("Courses");

  // if (url.includes("cluster0")) {
  //   profiles_table.deleteMany({});
  //   courses_table.deleteMany({});
  // }

  app.get("/drop_db", (req: Request, res: Response) => {
    // If the link is form the test db
    if (url.includes("cluster0")) {
      profiles_table.deleteMany({});
      courses_table.deleteMany({});
    }
    res.send("Ok");
  });

  app.get("/", (req: Request, res: Response) => {
    res.send("Hello world!");
  });

  app.get("/ping", (req: Request, res: Response) => {
    res.send("pong");
  });

  app.get("/status", (req: Request, res: Response) => {
    res.send("ok");
  });

  app.use("/courses", courses);

  app.use("/profiles", profiles);

  return app;
}
