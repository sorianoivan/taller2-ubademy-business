export class InvalidConstructionParameters extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, InvalidConstructionParameters);
    }
}


