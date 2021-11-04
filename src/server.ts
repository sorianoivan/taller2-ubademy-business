import express, { Application, Request, Response, NextFunction } from "express";
const { MongoClient } = require('mongodb');



const uri = <string>process.env.MONGODB_URL;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  // perform actions on the collection object
  client.close();
});
const business_db = client.db(<string>process.env.BUSINESS_DATABASE);
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

  app.post("/create_profile", (req: Request, res: Response, next: NextFunction) => {
    //res.send("john");
    
  });

  return app;
}