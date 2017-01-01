const mongoose = require('bluebird').promisifyAll(require('mongoose'));

// Online Friends
const onlineSchema = mongoose.Schema({
    _id: {
        type: Number,
        ref: 'Player',
        unique: true
    }
}, {
    timestamps: true
});

// Export
module.exports = mongoose.model('Online', onlineSchema);
