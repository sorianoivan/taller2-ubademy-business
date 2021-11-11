const schema = require('js-schema');
import { InvalidConstructionParameters } from "./invalid_construction_parameters";
import { config } from "../configuration/config";

let course_schema = schema({
    email: String,
    title: String,
    description: String,
    country: config.get_available_countries(),
    course_type: String,
    subscription_type: config.get_subscription_names(),
    hashtags: Array.of(String),
    media: Array.of(String),
  })

export class Course {
    creator_email: string;
    title: string;
    description: string;
    hashtags: string[];
    media: string[]; //urls where the photo/video is stored on firebase storage
    country: string;
    course_type: string;
    subscription_type: string;


    constructor(course_data: any) {
        if (!this.validate_course_data(course_data)) {
            throw new InvalidConstructionParameters("Invalid create course body format");
        } 
        this.creator_email = course_data.email;
        this.title = course_data.title;
        this.description = course_data.description;
        this.hashtags = course_data.hashtags;
        this.media = course_data.media;
        this.country = course_data.country;
        this.course_type = course_data.course_type;
        this.subscription_type = course_data.subscription_type;
    }

    validate_course_data(course_data: any) {
        return (course_schema(course_data) && config.get_available_genres().has(course_data.course_type) && 
                course_data.country.length > 0);
    }
} 

