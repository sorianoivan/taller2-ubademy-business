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
let courses = require("./endpoints/courses");
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

  app.use("/courses", courses);

  // PROFILES //

  const profiles_table = business_db.collection(process.env.PROFILES_TABLE || "Profiles");

  app.use(body_parser.json());
  app.post("/create_profile", async (req: Request, res: Response) => {
    try {
      const user_profile = new UserProfile(req.body.name, "", req.body.email, "", "Free", []);
      await profiles_table.insertOne(user_profile);
      res.send(config.get_status_message("profile_created"));
    } catch (e) {
      let error = <Error>e;
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
  app.post("/update_profile", async (req: Request, res: Response) => {
    try {
      const user_profile = new UserProfile(req.body.name, req.body.profile_picture, req.body.email, 
                                           req.body.country, req.body.subscription_type, req.body.interesting_genres);
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

  app.get("/countries", (req: Request, res: Response) => {
    res.send({
      ...config.get_status_message("data_sent"), 
      "locations": config.get_available_countries()
    });
  });

  app.get("/course_genres", (req: Request, res: Response) => {
    res.send({
      ...config.get_status_message("data_sent"), 
      "course_genres": Array.from(config.get_available_genres())
    });
  });

  app.get("/subscription_types", (req: Request, res: Response) => {
    res.send({
      ...config.get_status_message("data_sent"), 
      "types": config.get_subscription_types()
    });
  });

  app.get("/profile/:user_email/:account_type/:profile_email", (req: Request, res: Response) => {
    if (!get_profile_schema(req.params)) {
      res.send(config.get_status_message("invalid_args"));
    } else {
      let has_private_access = false;
      if ((req.params.user_email === req.params.profile_email) || (req.params.account_type === "admin")) {
        has_private_access = true;
      }
      profiles_table.find({"email": req.params.profile_email}).toArray(function(err, result) {
        if (err) {
          let message = config.get_status_message("unexpected_error");
          res.status(message["code"]).send(message);
        } else if (result === undefined) {
          let message = config.get_status_message("non_existent_user");
          res.status(message["code"]).send(message);
        } else if (result.length !== 1) {
          let message = config.get_status_message("duplicated_profile");
          res.status(message["code"]).send(message);
        } else {
          let document: any = (<Array<Document>>result)[0];
          let document_to_send: any = {};
          if (!has_private_access) {
            config.get_public_profile_data().forEach((profile_field: string) => {
              document_to_send[profile_field] = document[profile_field];
            });
          } else {
            document_to_send = document;
          }
          res.send({
            ...config.get_status_message("data_sent"),
            "profile": document_to_send
          });
        }
      });
    }
  });

  return app;
}
