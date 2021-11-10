const fs = require("fs");
const path = require("path");

class Config {
    available_genres: Set<String>;
    available_countries: string[];
    general_data: any;
    
    constructor() {
        var countries_text = fs.readFileSync(path.join(__dirname, "../config_files/countries.txt"), "utf-8");
        this.available_countries = countries_text.split("\n");
        
        
        this.available_genres = new Set();
        var genres_text = fs.readFileSync(path.join(__dirname, "../config_files/genres.txt"), "utf-8");
        var genres = genres_text.split("\n");
        genres.forEach((genre: string) => {
            this.available_genres.add(genre);
        });
        
        let json_text = fs.readFileSync(path.join(__dirname, "../config_files/general_data.json"), "utf-8");
        this.general_data = JSON.parse(json_text);
    }

    get_available_countries(): string[] {
        return this.available_countries;
    }

    get_available_genres(): Set<String> {
        return this.available_genres;
    }

    get_subscription_names(): string[] {
        return Object.keys(this.general_data["subscriptions"]);
    }

    get_subscription_types(): any {
        return this.general_data["subscriptions"];
    }
}


export const config = new Config();