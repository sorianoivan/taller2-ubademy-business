const schema = require('js-schema');

export let grade_course_schema = schema({
    course_id: String,
    user_email: String,
    comment: String,
    grade: Number.min(0).max(5)
});
