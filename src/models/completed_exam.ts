export class CompletedExam {
    student_email: string;
    answers: string[];
    professors_notes: string[];
    mark: Number;

    constructor(student_email: string, answers: string[], professors_notes: string[], mark: Number) {
        this.student_email = student_email;
        this.answers = answers;
        this.professors_notes  = professors_notes;
        this.mark = mark;
    }
} 
