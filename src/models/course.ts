const schema = require('js-schema');
import { InvalidConstructionParameters } from "./invalid_construction_parameters";
import { config } from "../configuration/config";

interface Video {
    name: string;
    url: string;
}

let video_schema = schema({
    name: String,
    url: String,
})

let course_schema = schema({
    email: String,
    title: String,
    description: String,
    total_exams: Number.min(1).max(10),
    country: config.get_available_countries(),
    course_type: String,
    subscription_type: config.get_subscription_names(),
    hashtags: Array.of(String),
    images: Array.of(String),
    videos: Array //There is no way with js-schema to ask for a field to be an array of Videos
})


export class Course {
    creator_email: string;
    title: string;
    description: string;
    total_exams: Number;
    hashtags: string[];
    images: string[];
    videos: Array<Video>;
    country: string;
    course_type: string;
    subscription_type: string;
    collaborators: string[];
    students: string[];


    constructor(course_data: any) {
        if (!this.validate_course_data(course_data)) {
            throw new InvalidConstructionParameters("Invalid create course body format");
        } 
        this.creator_email = course_data.email;
        this.title = course_data.title;
        this.description = course_data.description;
        this.total_exams = course_data.total_exams;
        this.hashtags = course_data.hashtags;
        this.images = course_data.images;
        this.videos = course_data.videos;
        this.country = course_data.country;
        this.course_type = course_data.course_type;
        this.subscription_type = course_data.subscription_type;
        this.collaborators = course_data.collaborators;
        this.students = course_data.students;
    }

    validate_course_data(course_data: any) {
        for (let video of course_data.videos) {
            if (!video_schema(video)) {
                return false;
            }
        }
        return (course_schema(course_data) && config.get_available_genres().has(course_data.course_type) && 
                course_data.country.length > 0);
    }
} 

