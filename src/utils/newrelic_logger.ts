const axios = require("axios");

const API_URL = 'https://log-api.newrelic.com/log/v1'

export class NewrelicLogger {

    apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    public info(message: any) {
        let infoMessage = "[INFO]: " + message
        this.forwardMessage(infoMessage);
    }

    public debug(message: any) {
        let debugMessage = "[DEBUG]: " + message
        this.forwardMessage(debugMessage);
    }

    public warn(message: any) {
        let warnMessage = "[WARNING]: " + message
        this.forwardMessage(warnMessage);
    }

    public error(message: any) {
        let errorMessage = "[ERROR]: " + message
        this.forwardMessage(errorMessage);
    }

    private forwardMessage(message: any) {
        axios.post(
            API_URL,
            { message: message },
            {
                headers: {
                    common: {
                        'Api-Key': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            }
        )
    }
}
