import express, { Application, Request, Response, NextFunction } from "express";
import { UserProfile } from "./models/user_profile";
import { config } from "./configuration/config"
const body_parser = require('body-parser');

const mongo=require("mongodb")
const { MongoClient } = require("mongodb");
const url = process.env.MONGODB_URL || "mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority";
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect().then;

const business_db = client.db(process.env.BUSINESS_DATABASE || "Busines");
const profiles_table = business_db.collection(process.env.PROFILES_TABLE || "Profiles");


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
  app.post("/update_profile", async (req: Request, res: Response, next: NextFunction) => {
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

  app.get("/countries", (req: Request, res: Response, next: NextFunction) => {
    res.send({"locations": config.get_available_countries()});
  });

  app.get("/course_genres", (req: Request, res: Response, next: NextFunction) => {
    res.send({"courses": config.get_available_genres()});
  });

  app.get("/subscription_types", (req: Request, res: Response, next: NextFunction) => {
    res.send({"types": config.get_subscription_types()});
  });

  return app;
}
