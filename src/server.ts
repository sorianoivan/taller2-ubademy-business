import express, { Application, Request, Response, NextFunction } from "express";
import { UserProfile, profile_schema, new_profile_schema } from "./models/user_profile";
import { config } from "./configuration/config"
const body_parser = require('body-parser');

const mongo=require("mongodb")
const { MongoClient } = require("mongodb");
const url = process.env.MONGODB_URL;
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect().then;

const business_db = client.db(process.env.BUSINESS_DATABASE);
const profiles_table = business_db.collection(process.env.PROFILES_TABLE);


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

    //console.log(new_profile_schema(req.body))
    //console.log(config.get_available_countries());

    try {
      // const user_profile = new UserProfile(req.body.name, req.body.email, "", req.body.subscription_type, []);
      const user_profile = new UserProfile(req.body.name, req.body.email, "", "Free", ["buenas"]);
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
        // TODO: TIRAR CODIGO DE ERROR DE HTTP PORQUE ES UN ERROR INESPERADO
        res.send("Unexpected error");
      }
    }
  });

  app.use(body_parser.json());
  app.post("/update_profile", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user_profile = new UserProfile(req.body.name, req.body.email, req.body.country, req.body.subscription_type, req.body.interesting_genres);
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
        // TODO: TIRAR CODIGO DE ERROR DE HTTP PORQUE ES UN ERROR INESPERADO
        res.send("Unexpected error");
      }
    }
  });

  return app;
}