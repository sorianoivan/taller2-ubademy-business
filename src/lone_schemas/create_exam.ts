const schema = require('js-schema');

export let create_exam_schema = schema({
    course_id: String,
    questions: Array.of(String),
    exam_name: String,
    exam_creator_email: String 
});
