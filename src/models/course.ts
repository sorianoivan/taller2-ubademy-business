const schema = require('js-schema');


export class Course {
    creator_email: string;
    title: string;
    description: string;
    hashtags: string[];
    media: string[]; //urls where the photo/video is stored on firebase storage
    location: string;
    type: string;
    subscription_type: string;


    constructor(course_data: any) {
        if (!this.validate_data(course_data)) {
            throw Error("Invalid fields");
        } 
        this.creator_email = course_data.email;
        this.title = course_data.title;
        this.description = course_data.description;
        this.hashtags = course_data.hashtags;
        this.media = course_data.media;
        this.location = course_data.location;
        this.type = course_data.type;
        this.subscription_type = course_data.subscription_type;
    }

    validate_data(course_data: any) {
        const Course = schema({
            email: String,
            title: String,
            description: String,
            location: String,
            type: String,
            subscription_type: String,
            hashtags: Array.of(String),
            media: Array.of(String),
          })
      
          return Course(course_data);
    }
} 

