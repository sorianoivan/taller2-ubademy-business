const schema = require('js-schema');

export let grade_exam_schema = schema({
    course_id: String,
    corrections: Array.of(String),
    exam_name: String,
    student_email: String,
    professor_email: String,
    mark: Number.min(0).max(10)
});
