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
