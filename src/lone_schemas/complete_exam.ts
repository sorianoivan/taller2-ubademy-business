const schema = require('js-schema');

export let complete_exam_schema = schema({
    course_id: String,
    answers: Array.of(String),
    exam_name: String,
    student_email: String 
});
