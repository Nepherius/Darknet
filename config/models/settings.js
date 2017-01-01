const mongoose = require('bluebird').promisifyAll(require('mongoose'));

// define the schema for our account data
const settingsSchema = mongoose.Schema({
    cmdPrefix: {
        type: String,
        default: '!'
    },
    // Private Message Chat Colors
    defaultPMColor: {
        type: String,
        default: '#89D2E8'
    },
    successPMColor: {
        type: String,
        default: '#00FF00'
    },
    warnPMColor: {
        type: String,
        default: '#FACC2E'
    },
    errPMColor: {
        type: String,
        default: '#FF0000'
    },

    // Group Message Chat Colors
    defaultChatColor: {
        type: String,
        default: '#89D2E8'
    },
    successChatColor: {
        type: String,
        default: '#00FF00'
    },
    warnChatColor: {
        type: String,
        default: '#FACC2E'
    },
    errChatColor: {
        type: String,
        default: '#FF0000'
    },
    loggedOn: {
        type: Date,
        default: Date.now
    },

    //MISC
    minLevel: {
        type: Number,
        default: 100
    },

    // Message Post Lock Durations
    generalLockDuration: {
        type: Number,
        default: 25
    },
    wtsLockDuration: {
        type: Number,
        default: 25
    },
    wtbLockDuration: {
        type: Number,
        default: 25
    },
    lrLockDuration: {
        type: Number,
        default: 25
    },
    pvmLockDuration: {
        type: Number,
        default: 25
    }
}, {
    timestamps: true
}, {
    strict: true
});

module.exports = mongoose.model('Settings', settingsSchema);
