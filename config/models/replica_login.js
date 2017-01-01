const mongoose = require('bluebird').promisifyAll(require('mongoose'));

// define the schema for our account data
const replicaSchema =  mongoose.Schema({
  username    : { type: String, required: true },
  password    : { type: String, required: true },
  dimension : {type: Number, required: true, default : 1},
  replicaname :  {type: String, required: true},
  ready: {type: Boolean, default:true}
},{timestamps : true});

// create the model and expose it to our app
module.exports = mongoose.model('Replica', replicaSchema);
