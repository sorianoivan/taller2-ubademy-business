export class UserProfile {
    name: string;
    email: string;
    country: string;
    subscription_type: number;

    constructor(name: string, email: string, country: string, subscription_type: number) {
        this.name = name;
        this.email = email;
        this.country = country;
        this.subscription_type = subscription_type;
        this.check_profile_types()
    }

    //To verify that the values received in the request are the correct type expected since ts does not enforce it
    check_profile_types() {
        if (typeof this.name != "string") {
            throw Error("Name should be a string");
        }
        if (typeof this.email != "string") {
            throw Error("Email should be a string");
        }

        // TODO: AGREGAR CHEQUEO DE QUE EL PAIS RECIBIDO ES VALIDO
        if (typeof this.country != "string") {
            throw Error("hashtags should be strings");
        }
        if (typeof this.subscription_type != "number") {
            throw Error("sub type should be a number");//TODO: See if i can verify if it is CourseType instead of just number
        }
    }
} 

