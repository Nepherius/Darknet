const mongoose = require('bluebird').promisifyAll(require('mongoose'));

// organization Ban List
const orgBanListSchema = mongoose.Schema({
    org_name: {
        type: String,
        required: true
    },
    by: {
      type: String,
      required: true
    }
}, {
    timestamps: true
});

// Export
module.exports = mongoose.model('Orgbanlist', orgBanListSchema);
