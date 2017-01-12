const mongoose = require('bluebird').promisifyAll(require('mongoose'));

// Broadcast History
const historySchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    channel: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Export
module.exports = mongoose.model('History', historySchema);
