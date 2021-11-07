require('newrelic')
import { create_server, connect_to_database } from "./server";
import * as mongo from "mongodb";

//TODO: get url from process.env
//const MONGODB_URL = "mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority";

const start_server = (business_db: mongo.Db) => {
  const app = create_server(business_db);
  const port: number = parseInt(<string>process.env.PORT, 10) || 4000;
  return app.listen(port, () => {
    console.log(`server running on port ${port}`);
  });
};

// export function connect_to_database() {
//   const mongo_client = new mongo.MongoClient(MONGODB_URL);
//   try {
//     mongo_client.connect();
//     console.log("Connected correctly to server");
//   } catch (err) {
//     console.log(err);
//     process.exit(1);
//   }
//   return mongo_client
// }

let mongo_client = connect_to_database();

let server = start_server(mongo_client.db(<string>"Business"));

//This is to close everything correctly with ctrl + c
process.on('SIGINT', () => {
  console.info('\nSIGINT signal received.');
  console.log('Closing mongodb connection.');
  mongo_client.close();
  console.log('Closing server.');
  server.close((err) => {
    console.log('server closed.');
    process.exit(err ? 1 : 0);
  });
});
