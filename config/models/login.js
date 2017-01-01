const mongoose = require('bluebird').promisifyAll(require('mongoose'));

// define the schema for our account data
const loginSchema = mongoose.Schema({
  username    : { type: String, required: true },
  password    : { type: String, required: true },
  dimension : {type: Number, required: true, default : 1},
  botname :  {type: String, required: true},
  owner : { type: String, required: true }

},{timestamps : true});

// create the model and expose it to our app
module.exports = mongoose.model('Login', loginSchema);
