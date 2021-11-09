const fs = require("fs");
const path = require("path");

class Config {
    available_countries: Set<String>;
    
    constructor() {
        //this.available_countries = [];
        this.available_countries = new Set();
        var text = fs.readFileSync(path.join(__dirname, "../config_files/countries.txt"), "utf-8");
        var countries = text.split("\n");
        countries.forEach((country: string) => {
            this.available_countries.add(country);
        });
    }

    get_available_countries(): Set<String> {
        return this.available_countries;
    }
}


export const config = new Config();