const mongoose = require('bluebird').promisifyAll(require('mongoose'));

// define the schema for our account data
const ReportsSchema = mongoose.Schema({
    sentBy: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    }
}, {timestamps: true});

// create the model and expose it to our app
module.exports = mongoose.model('Reports', ReportsSchema);
