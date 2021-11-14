const schema = require('js-schema');

export let get_profile_schema = schema({
    user_email: String,
    profile_email: String,
    account_type: ["user", "admin"],
});
