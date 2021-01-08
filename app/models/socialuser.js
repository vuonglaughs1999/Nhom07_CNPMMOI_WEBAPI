var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var SocialUserSchema = new Schema({
    name: String,
    email: {type: String, required: true, index: {unique: true}},
    accountId: String
});

module.exports = mongoose.model('SocialUser', SocialUserSchema);