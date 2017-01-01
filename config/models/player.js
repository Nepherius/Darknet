const mongoose = require('bluebird').promisifyAll(require('mongoose'));

// define the schema for player data
const playerSchema = mongoose.Schema({

    /******** Character Info ********/
    _id: { // User ID
        type: Number,
        required: true,
        unique: true,
        default: 0
    },
    firstname: {
        type: String
    },
    name: {
        type: String,
        required: true
    },
    lastname: {
        type: String
    },
    level: {
        type: Number,
        min: [1, 'Invalid Level'],
        default: '1'
    },
    breed: {
        type: String,
        default: 'Atrox'
    },
    gender: {
        type: String,
        default: 'Male'

    },
    faction: {
        type: String,
        default: 'Neutral'
    },
    profession: {
        type: String,
        default: 'Agent'
    },
    profession_title: {
        type: String,
    },
    ai_rank: {
        type: String,
    },
    ai_level: {
        type: Number,
        default: 0
    },
    org: {
        type: String,
        default: 'No organization'
    },
    org_rank: {
        type: String,
        default: 'None'
    },
    source: {
        type: String
    },
    lastseen: {
        type: Date,
        default: '1988-03-30'
    },
    lastupdate: {
        type: Date,
        default: Date.now
    },
    /******* Bot Specific Info *******/
    buddyList: {
      type: String,
      default: 'main'
    },
    banned: {
        type: Boolean,
        default: false
    },
    accessLevel: {
        type: Number,
        default: 0
    },
    generalChannel: {
        type: Boolean,
        default: false
    },
    generalLock: {
        type: Date,
        default: '1988-03-30'
    },
    lrChannel: {
        type: Boolean,
        default: false
    },
    lrLock: {
        type: Date,
        default: '1988-03-30'
    },
    wtsChannel: {
        type: Boolean,
        default: false
    },
    wtsLock: {
        type: Date,
        default: '1988-03-30'
    },
    wtbChannel: {
        type: Boolean,
        default: false
    },
    wtbLock: {
        type: Date,
        default: '1988-03-30'
    },
    pvmChannel: {
        type: Boolean,
        default: false
    },
    pvmLock: {
        type: Date,
        default: '1988-03-30'
    }
}, {
    timestamps: true
});

// create the model and expose it to our app
module.exports = mongoose.model('Player', playerSchema);
