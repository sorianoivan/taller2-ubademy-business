export class Course {
    creator_email: string;
    title: string;
    description: string;
    hashtags: string[];
    location: string;
    type: string;
    subscription_type: string;

    constructor(email: string, title: string, description: string,
                 hashtags: string[], location: string, type: string, subscription_type: string) {
        this.creator_email = email;
        this.title = title;
        this.description = description;
        this.hashtags = hashtags;
        this.location = location;
        this.type = type;
        this.subscription_type = subscription_type;
        //TODO: Add exams and media
        this.check_course_types()
    }

    //To verify that the values received in the request are the correct type expected since ts does not enforce it
    check_course_types() {
        if (typeof this.creator_email != "string") {
            throw Error("Username should be a string");
        }
        if (typeof this.title != "string") {
            throw Error("Title should be a string");
        }
        if (typeof this.description != "string") {
            throw Error("Description should be a string");
        }
        if (typeof this.location != "string") {
            throw Error("Location should be a string");
        }
        for (let h of this.hashtags) {
            if (typeof h != "string") {
                throw Error("hashtags should be strings");
            }
        }
        if (typeof this.type != "string") {
            throw Error("type should be a string");
        }
        if (typeof this.subscription_type != "string") {
            throw Error("sub type should be a string");
        }
    }
} 





