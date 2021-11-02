enum CourseType {
    type1,
    type2,
    type3,
}

enum SubscriptionType {
    Platinum,
    Gold,
    Silver,
}

export class Course {
    title: string;
    description: string;
    hashtags: string[];
    type: CourseType;
    sub_type: SubscriptionType;

    constructor(title: string, description: string, hashtags: string[], type: CourseType, sub_type: SubscriptionType) {
        this.title = title;
        this.description = description;
        this.hashtags = hashtags;
        this.type = type;
        this.sub_type = sub_type;
        //TODO: Add location, exams and media
        this.check_course_types()
    }

    //To verify that the values received in the request are the correct type expected since ts does not enforce it
    check_course_types() {
        if (typeof this.title != "string") {
            throw Error("Title should be a string");
        }
        if (typeof this.description != "string") {
            throw Error("Description should be a string");
        }
        for (let h of this.hashtags) {
            if (typeof h != "string") {
                throw Error("hashtags should be strings");
            }
        }
        if (typeof this.type != "number") {
            throw Error("type should be a number");//TODO: See if i can verify if it is CourseType instead of just number
        }
        if (typeof this.sub_type != "number") {
            throw Error("sub type should be a number");//TODO: Idem above
        }
    }
} 





