import { NewrelicLogger } from "./newrelic_logger"

export class Logger {

    logger: any;

    constructor(apiKey: any) {
        if (apiKey) {
            this.logger = new NewrelicLogger(apiKey);
        } else {
            this.logger = console;
        }
    }

    public info(message: string) {
        this.logger.info(message);
    }

    public debug(message: string) {
        this.logger.debug(message);
    }

    public warn(message: string) {
        this.logger.warn(message);
    }

    public error(message: string) {
        this.logger.error(message);
    }
}
