const mongo = require("mongodb")

export function connect_to_database(mongoUrl: string) {
  console.log(mongoUrl);
  try {
    const mongo_client = new mongo.MongoClient(mongoUrl);
    mongo_client.connect().then({});
    console.log("Connected correctly to the MongoDB client");
    return mongo_client
  } catch (err) {
    console.log("error conectando a MONGO");
    let errorMessage: string = "Error connecting to the MongoDB client.";
    if (err instanceof Error) {
        errorMessage += " " + err.name + ": " + err.message;
    }
    console.error(errorMessage)
    process.exit(1);
  }
}

let url = process.env.MONGODB_URL || "mongodb://mongodb_business:27017";
if (process.env.ENV === 'test') {
    url = process.env.MONGODB_TEST_URL || "mongodb+srv://ubademy:business@cluster0.w31lx.mongodb.net/Business?retryWrites=true&w=majority";
}
//const url = "mongodb+srv://ubademy:business@cluster0.w31lx.mongodb.net/Business?retryWrites=true&w=majority";
export const mongo_client = connect_to_database(url);

export const business_db = mongo_client.db(<string>"Business");
export const profiles_table = business_db.collection(process.env.PROFILES_TABLE || "Profiles");
export const courses_table = business_db.collection(process.env.COURSES_TABLE || "Courses");
export const exams_table = business_db.collection(process.env.EXAMS_TABLE || "Exams");

