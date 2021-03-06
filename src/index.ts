require('newrelic')
import { create_server } from "./server";
import { business_db, mongo_client } from "./db/database";
import * as mongo from "mongodb";
import { logger } from "./utils/logger";

/* // FIREBASE STUFF NO LO BORRO POR LAS DUDAS

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { FirebaseStorage, getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmOgHRmuScCEPsf-RhX0wyITB059WndfE",
  authDomain: "ubademy-business.firebaseapp.com",
  projectId: "ubademy-business",
  storageBucket: "ubademy-business.appspot.com",
  messagingSenderId: "712055108616",
  appId: "1:712055108616:web:3a93622e2f7425d6d58dbd",
  measurementId: "G-RWS0CDPY2S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const storage = getStorage(app); */
/* ----------------------------------------------------------------------------------*/


const start_server = (business_db: mongo.Db) => {
  const app = create_server(business_db);
  const port: number = parseInt(<string>process.env.PORT, 10) || 4000;
  return app.listen(port, () => {
    logger.info(`server running on port ${port}`);
  });
};


let server = start_server(business_db);

//This is to close everything correctly with ctrl + c
process.on('SIGINT', () => {
  logger.info('\nSIGINT signal received.');
  logger.info('Closing mongodb connection.');
  mongo_client.close();
  logger.info('Closing server.');
  server.close((err) => {
    logger.info('server closed.');
    process.exit(err ? 1 : 0);
  });
});
