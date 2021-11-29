// import { InvalidConstructionParameters } from "./invalid_construction_parameters";
// const schema = require('js-schema');
// import { config } from "../configuration/config";
import { CompletedExam } from "./completed_exam";

export class Exam {
    exam_name: string;
    questions: string[];
    students_exams: CompletedExam[];
    is_published: boolean;

    constructor(exam_name: string, questions: string[], students_exams: CompletedExam[]) {
        this.exam_name = exam_name;
        this.questions = questions;
        this.students_exams = students_exams;
        this.is_published = false;
    }
} 

