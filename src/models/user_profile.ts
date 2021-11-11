import { InvalidConstructionParameters } from "./invalid_construction_parameters";
const schema = require('js-schema');
import { config } from "../configuration/config";

export let profile_schema = schema({
    name: String,
    email: String,

    //TODO: VER SI CONVIENE SACARLO DE ACA Y CHEQUEAR CON UN SET DESDE AFUERA, ASI SE ESTAN ITERANDO TODOS LOS PAISES, Y LA
    // BIBLIOTECA NO SE BANCA GUARDAR UN SET, TIRA SIEMPRE TRUE
    // country: [...config.get_available_countries(), ""],
    country: config.get_available_countries(),
    
    subscription_type: config.get_subscription_names(),
    // We should have a check for the genres array, but the module does not allow the correct kind of checking for that
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

        if ((!profile_schema(this)) || (!((this.interesting_genres != undefined) && (this._are_valid_genres()) || (this.country === "")))) {
            throw new InvalidConstructionParameters("Invalid create profile body format");
        }
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

