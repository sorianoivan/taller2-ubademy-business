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
import { logger } from "./utils/logger";

//TODO: The link is here because when the tests are run there is no env to take MONGODB_URL from.
// The string is from the test db
const url = process.env.MONGODB_URL;

const MONGO_SHORT_ID_LEN = 12
const MONGO_LONG_ID_LEN = 24
//const profiles_table = business_db.collection(process.env.PROFILES_TABLE || "Profiles");

export function connect_to_database() {
  const mongo_client = new mongo.MongoClient(url);
  try {
    mongo_client.connect().then({});
    logger.info("Connected correctly to the MongoDB client");
  } catch (err) {
    let errorMessage: string = "Error connecting to the MongoDB client.";
    if (err instanceof Error) {
        errorMessage += " " + err.name + ": " + err.message;
    }
    logger.error(errorMessage);
    process.exit(1);
  }
  return mongo_client
}

export function create_server(business_db: Db) {//Db is the type for a mongo database
  const app: Application = express();

  app.get("/", (req: Request, res: Response) => {
    logger.info("Received GET request at /");
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
