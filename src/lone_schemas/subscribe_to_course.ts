const schema = require('js-schema');

export let subscribe_to_course_schema = schema({
    course_id: String,
    user_email: String,
});
