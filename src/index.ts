require('newrelic')
import express, { Application, Request, Response, NextFunction } from "express";
import { MongoAPIError } from "mongodb";
import createServer from "./server";
import * as mongo from "mongodb";


const startServer = (business_db: mongo.Db) => {
  const app = createServer(business_db);
  const port: number = parseInt(<string>process.env.PORT, 10) || 4000;
  return app.listen(port, () => {
    console.log(`server running on port ${port}`);
  });
};

const MONGOD_URL = "mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority";
const connectToDatabase = () => {
  const mongo_client = new mongo.MongoClient(MONGOD_URL);
  try {
    mongo_client.connect();
      console.log("Connected correctly to server");
  } catch (err) {
      console.log(err);
      return null;
  }
  return mongo_client
}

let mongo_client = connectToDatabase();

if (mongo_client) {
  let server = startServer(mongo_client.db(<string>"Business"));
  
  //This is to close everything correctly with ctrl + c
  process.on('SIGINT', () => {
    console.info('\nSIGINT signal received.');
    console.log('Closing mongodb connection.');
    if(mongo_client) mongo_client.close();//TODO: Lo chequeo devuelta xq sino ts se queja, ver como dejarlo mas prolijo
    console.log('Closing server.');
    server.close((err) => {
      console.log('server closed.');
      process.exit(err ? 1 : 0);
    });
  });
}