import { InvalidConstructionParameters } from "./invalid_construction_parameters";
// import { Schema } from "js-schema";
const schema = require('js-schema');
import { config } from "../configuration/config"

export let profile_schema = schema({
    name: String,
    email: String,
    country: String,
    subscription_type: String,
    // interesting_genres: Array(String),
    // interesting_genres: [Array.of(String)],
    // interesting_genres: (<any[]>[...config.get_available_countries()]).push(Array.like([])),
    interesting_genres: [...config.get_available_countries(), Array.like([])],
    // interesting_genres: [Array.like([])],
});

export let new_profile_schema = schema({
    name: String,
    email: String,
    //subscription_type: String,
  });


export class UserProfile {
    name: string;
    email: string;
    country: string;
    subscription_type: string;
    interesting_genres: string[];

    constructor(name: string, email: string, country: string, subscription_type: string, interesting_genres: string[]) {
        this.name = name;
        this.email = email;
        this.country = country;
        this.subscription_type = subscription_type;
        this.interesting_genres = interesting_genres;
        console.log(profile_schema(this));
        this.check_profile_types();
    }

    //To verify that the values received in the request are the correct type expected since ts does not enforce it
    check_profile_types() {
        if (typeof this.name != "string") {
            throw new InvalidConstructionParameters("Name should be a string");
        }
        if (typeof this.email != "string") {
            throw new InvalidConstructionParameters("Email should be a string");
        }

        // TODO: AGREGAR CHEQUEO DE QUE EL PAIS RECIBIDO ES VALIDO
        if (typeof this.country != "string") {
            throw new InvalidConstructionParameters("hashtags should be strings");
        }
        if (typeof this.subscription_type != "string") {
            throw new InvalidConstructionParameters("sub type should be a number");//TODO: See if i can verify if it is CourseType instead of just number
        }
        /*
        if (Array.isArray(this.interesting_genres)) {
            for
            throw new InvalidConstructionParameters("sub type should be a number");//TODO: See if i can verify if it is CourseType instead of just number
        }
        */
    }
} 

