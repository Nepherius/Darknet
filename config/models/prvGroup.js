const mongoose = require('bluebird').promisifyAll(require('mongoose'));

// Private Channel Schema
const chatSchema = mongoose.Schema({
    _id: {
        type: Number,
        ref: 'Player',
        unique: true
    }
}, {
    timestamps: true
});


// Export
module.exports = mongoose.model('Chat', chatSchema);
