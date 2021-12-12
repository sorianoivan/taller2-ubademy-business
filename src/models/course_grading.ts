// import { InvalidConstructionParameters } from "./invalid_construction_parameters";
// const schema = require('js-schema');
// import { config } from "../configuration/config";

export class CourseGrading {
    student_email: string;
    comment: string;
    grade: Number;

    constructor(student_email: string, comment: string, grade: Number) {
        this.student_email = student_email;
        this.comment = comment;
        this.grade  = grade;
    }
} 
