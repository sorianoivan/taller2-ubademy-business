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
      res.send(config.get_status_message("profile_created"));
    } catch (e) {
      let error = <Error>e;
      console.log(error.name);
      if (error.name === "InvalidConstructionParameters") {
        res.send(config.get_status_message("invalid_body"));
      } else if (error.name === "MongoServerError") {
        let message = config.get_status_message("existent_user");
        res.status(message["code"]).send(message);
      } else {
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
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
        let message = config.get_status_message("non_existent_user");
        res.status(message["code"]).send(message);
      } else {
        res.send(config.get_status_message("user_updated"));
      }
    } catch (e) {
      let error = <Error>e;
      console.log(error.name);
      if (error.name === "InvalidConstructionParameters") {
        res.send(config.get_status_message("invalid_body"));
      } else {
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
      }
    }
  });

  app.get("/countries", (req: Request, res: Response, next: NextFunction) => {
    res.send({
      ...config.get_status_message("data_sent"), 
      "locations": config.get_available_countries()
    });
  });

  app.get("/course_genres", (req: Request, res: Response, next: NextFunction) => {
    res.send({
      ...config.get_status_message("data_sent"), 
      "course_genres": Array.from(config.get_available_genres())
    });
  });

  app.get("/subscription_types", (req: Request, res: Response, next: NextFunction) => {
    res.send({
      ...config.get_status_message("data_sent"), 
      "types": config.get_subscription_types()
    });
  });

  return app;
}
