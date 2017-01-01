const mongoose = require('bluebird').promisifyAll(require('mongoose'));

// define the schema for our account data
const message_queueSchema = mongoose.Schema({
  name    : { type: String, required: true },
  userid    : { type: Number, required: true },
  message : {type: String, required: true},
  channel : {type: String, required: true}
},{timestamps : true});

// create the model and expose it to our app
module.exports = mongoose.model('MsgQueue', message_queueSchema);
