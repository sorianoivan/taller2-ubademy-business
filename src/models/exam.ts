// import { InvalidConstructionParameters } from "./invalid_construction_parameters";
// const schema = require('js-schema');
// import { config } from "../configuration/config";

export class Exam {
    exam_name: string;
    profile_picture_link: string;
    email: string;
    country: string;
    subscription_type: string;
    interesting_genres: string[];

    constructor(args: any) {
        this.exam_name = args.name;
        this.email = email;
        this.profile_picture_link = profile_picture;
        this.country = country;
        this.subscription_type = subscription_type;
        this.interesting_genres = interesting_genres;
    }

    _are_valid_genres(): Boolean {
        const genres_set = config.get_available_genres();

        // Checks if there are duplicated strings
        if ((new Set(this.interesting_genres)).size !== this.interesting_genres.length) {
            return false;
        }
        for (let i = 0; i < this.interesting_genres.length; i++) {
            if (!genres_set.has(this.interesting_genres[i])) {
                return false;
            }
        }
        return true;
    }
} 

