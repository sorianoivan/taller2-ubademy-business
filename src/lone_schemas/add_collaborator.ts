const schema = require('js-schema');

export let add_collaborator_schema = schema({
    course_id: String,
    user_email: String,
    collaborator_email: String,
});
