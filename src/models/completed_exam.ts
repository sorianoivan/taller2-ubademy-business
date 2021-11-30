// import { InvalidConstructionParameters } from "./invalid_construction_parameters";
// const schema = require('js-schema');
// import { config } from "../configuration/config";

export class CompletedExam {
    student_email: string;
    answers: string[];
    professors_notes: string[];
    //status: string; // Passed, Failed, Not corrected
    mark: Number; // Passed, Failed, Not corrected

    //constructor(student_email: string, answers: string[], professors_notes: string[], status: string) {
    constructor(student_email: string, answers: string[], professors_notes: string[], mark: Number) {
        this.student_email = student_email;
        this.answers = answers;
        this.professors_notes  = professors_notes;
        //this.status = status;
        this.mark = mark;
    }
} 
