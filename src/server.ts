import express, { Application, Request, Response } from "express";
import schema from "js-schema";
import { Db } from "mongodb";
import { Course } from "./models/course";
//import * as mongoDB from "mongodb";
import { UserProfile } from "./models/user_profile";
import { config } from "./configuration/config"
import { InvalidConstructionParameters } from "./models/invalid_construction_parameters";
import e from "express";
const body_parser = require('body-parser');
import { get_profile_schema } from "./lone_schemas/get_profile"
import request from "supertest";
let courses = require("./endpoints/courses");
let profiles = require("./endpoints/profiles");
import { logger } from "./utils/logger";


const API_KEY = process.env.API_KEY || "faf5b8b0651b9baf0919f77f5b50f9b872b3521f922c14c0ad12f696b50c1b73"

export function create_server(business_db: Db) {//Db is the type for a mongo database
  const app: Application = express();

  app.use((req: Request, res: Response, next) => {
    let auth_key = req.get('Authorization');
    if(!auth_key || auth_key !== API_KEY) {
        res.send(config.get_status_message("unauthorized_api_key"));
        return;
    }
    next();
  });

  app.get("/", (req: Request, res: Response) => {
    res.send({"status": "ok", "message": "Hello world!"});
    logger.info("Received GET request at /");
    res.send({"status": "ok", "message": "Hello world!"});
  });

  app.get("/ping", (req: Request, res: Response) => {
    res.send({"status": "ok", "message": "pong"});
  });

  app.get("/status", (req: Request, res: Response) => {
    res.send({"status": "ok"});
  });

  app.use("/courses", courses);

  app.use("/profiles", profiles);

  return app;
}
