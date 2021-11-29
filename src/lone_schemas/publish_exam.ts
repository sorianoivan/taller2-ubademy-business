const schema = require('js-schema');

export let publish_exam_schema = schema({
    course_id: String,
    exam_name: String,
    exam_creator_email: String 
});
