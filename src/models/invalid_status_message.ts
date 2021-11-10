export class InvalidStatusMessage extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, InvalidStatusMessage);
    }
}


