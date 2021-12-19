import { NewrelicLogger } from "./newrelic_logger"
const winston = require('winston');

const winstonLogger = winston.createLogger({
  defaultMeta: { service: 'user-service' },
  levels: winston.config.npm.levels,
  transports: [
    new (winston.transports.Console)({ level: 'debug' }),
    new (winston.transports.File)({ filename: 'logs.log', level: 'debug' })
  ],
});

export class Logger {

    logger: any;

    constructor(apiKey: any) {
        if (apiKey) {
            this.logger = new NewrelicLogger(apiKey);
        } else {
            this.logger = winstonLogger;
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
