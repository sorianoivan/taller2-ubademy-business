import express, { Application, Request, Response, NextFunction } from "express";
import { UserProfile } from "./models/user_profile";
const body_parser = require('body-parser');

const mongo=require("mongodb")
const { MongoClient } = require("mongodb");
const url = <string>process.env.MONGODB_URL;
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect().then;

const business_db = client.db(process.env.BUSINESS_DATABASE);
const profiles_table = business_db.collection(<string>process.env.PROFILES_TABLE);


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

  app.use(body_parser.json());
  app.post("/create_profile", async (req: Request, res: Response, next: NextFunction) => {

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