const mongoose = require('bluebird').promisifyAll(require('mongoose'));

// define the schema for our account data
const commandsSchema = mongoose.Schema({
  cmdName : { type: String, required: true, unique: true},
  description: {type: String},
  help: {type: String},
  accessRequired: {type: Number,default: 0},
  enabled: {type: Boolean, default: true }
},{timestamps : true});

// create the model and expose it to our app
module.exports = mongoose.model('Commands', commandsSchema);
