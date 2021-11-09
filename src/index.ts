require('newrelic')
import { create_server, connect_to_database } from "./server";
import * as mongo from "mongodb";


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
    console.log(`server running on port ${port}`);
  });
};

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
