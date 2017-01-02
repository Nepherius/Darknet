const winston = require('winston');
const rfr = require('rfr');
const moment = require('moment');
const _ = require('lodash');
const Online = rfr('config/models/online.js');
const GlobalFn = rfr('system/globals.js');
const Player = rfr('config/models/player.js');
const MsgQueue = rfr('config/models/message_queue.js');


let validChannels = ['wtb', 'wts', 'lr', 'general'];

exports.status = status = function(userId) {
    Player.findOne({
        '_id': userId
    }, function(err, result) {
        if (err) {
            winston.error(err);
        } else if (result === null) {
            GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
        } else {
            let statusReply = '<center> <font color=#FFFF00> :::' + GlobalFn.botname + ' Channel Subscription Status::: </font> </center> \n\n';
            statusReply += '<font color=#00FFFF>General: </font>' + (result.generalChannel === false ? '<font color=#FF0000>No' : '<font color=#00FF00>Yes') + '</font> \n';
            statusReply += GlobalFn.PMBlob.apply(this, (result.generalChannel === false ? [GlobalFn.botname, 'subscribe gen', 'Subscribe'] : [GlobalFn.botname, 'unsubscribe gen', 'Unsubscribe'])) + '\n';
            statusReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
            statusReply += '<font color=#00FFFF>WTS: </font>' + (result.wtsChannel === false ? '<font color=#FF0000>No' : '<font color=#00FF00>Yes') + '</font> \n';
            statusReply += GlobalFn.PMBlob.apply(this, (result.wtsChannel === false ? [GlobalFn.botname, 'subscribe wts', 'Subscribe'] : [GlobalFn.botname, 'unsubscribe wts', 'Unsubscribe'])) + '\n';
            statusReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
            statusReply += '<font color=#00FFFF>WTB: </font>' + (result.wtbChannel === false ? '<font color=#FF0000>No' : '<font color=#00FF00>Yes') + '</font> \n';
            statusReply += GlobalFn.PMBlob.apply(this, (result.wtbChannel === false ? [GlobalFn.botname, 'subscribe wtb', 'Subscribe'] : [GlobalFn.botname, 'unsubscribe wtb', 'Unsubscribe'])) + '\n';
            statusReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
            statusReply += '<font color=#00FFFF>Lootrights: </font>' + (result.lrChannel === false ? '<font color=#FF0000>No' : '<font color=#00FF00>Yes') + '</font> \n';
            statusReply += GlobalFn.PMBlob.apply(this, (result.lrChannel === false ? [GlobalFn.botname, 'subscribe lootrights', 'Subscribe'] : [GlobalFn.botname, 'unsubscribe lr', 'Unsubscribe'])) + '\n';
            statusReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
            GlobalFn.PMUser(userId, GlobalFn.blob('Status', statusReply));
        }
    });
};
exports.ban = ban = function(userId, args) {
    if (args[0] === null) {
        GlobalFn.PMUser(userId, 'Ban whom ?', 'warning');
    } else {
        Player.findOneAndUpdate({
            'name': _.capitalize(args[0])
        }, {
            'banned': true
        }, function(err, result) {
            if (!result) {
                GlobalFn.PMUser(userId, 'Player is not a member!', 'warning');
            } else {
                GlobalFn.PMUser(userId, 'User banned!', 'success');
            }
        });
    }
};
exports.ban = ban = function(userId, args) {
    if (args[0] === null) {
        GlobalFn.PMUser(userId, 'Unban whom?', 'warning');
    } else {
        Player.findOneAndUpdate({
            'name': _.capitalize(args[0])
        }, {
            'banned': false
        }, function(err, result) {
            if (!result) {
                GlobalFn.PMUser(userId, 'Player is not a member!', 'warning');
            } else {
                GlobalFn.PMUser(userId, 'User unbanned!', 'success');
            }
        });
    }
};

exports.general = general = function(userId, args) {
    if (!args[0]) {
        GlobalFn.PMUser(userId, 'Invalid request, see help.');
    } else {
        checkLock(userId, 'generalLock').then(function(lock) {
            if (lock.status === 'open') {
                let addToQueue = new MsgQueue();
                addToQueue.name = lock.name;
                addToQueue.userid = userId;
                addToQueue.message = args.join(' ');
                addToQueue.channel = 'general';
                Promise.all([addToQueue.save(), Player.update({
                    '_id': userId
                }, {
                    'generalLock': moment().add(GlobalFn.generalLockDuration, 'minutes')
                })]).then(function() {
                    GlobalFn.PMUser(userId, 'Your message has been added to the queue.', 'success');
                }).catch(function(err) {
                    winston.error(err);
                });
            } else if (lock.status === 'locked') {
                GlobalFn.PMUser(userId, 'You can post a new message in ' + lock.until, 'warning');
            } else {
                GlobalFn.PMUser(userId, 'Unable to complete request, try again. ', 'error');
            }
        });
    }
};

exports.wts = wts = function(userId, args) {
    if (!args[0]) {
        GlobalFn.PMUser(userId, 'Invalid request, see help.');
    } else {
        checkLock(userId, 'wtsLock').then(function(lock) {
            if (lock.status === 'open') {
                let addToQueue = new MsgQueue();
                addToQueue.name = lock.name;
                addToQueue.userid = userId;
                addToQueue.message = args.join(' ');
                addToQueue.channel = 'wts';
                Promise.all([addToQueue.save(), Player.update({
                    '_id': userId
                }, {
                    'wtsLock': moment().add(GlobalFn.wtsLockDuration, 'minutes')
                })]).then(function() {
                    GlobalFn.PMUser(userId, 'Your message has been added to the queue.', 'success');
                }).catch(function(err) {
                    winston.error(err);
                });
            } else if (lock.status === 'locked') {
                GlobalFn.PMUser(userId, 'You can post a new message in ' + lock.until, 'warning');
            } else {
                GlobalFn.PMUser(userId, 'Unable to complete request, try again. ', 'error');
            }
        });
    }
};

exports.wtb = wtb = function(userId, args) {
    if (!args[0]) {
        GlobalFn.PMUser(userId, 'Invalid request, see help.');
    } else {
        checkLock(userId, 'wtbLock').then(function(lock) {
            if (lock.status === 'open') {
                let addToQueue = new MsgQueue();
                addToQueue.name = lock.name;
                addToQueue.userid = userId;
                addToQueue.message = args.join(' ');
                addToQueue.channel = 'wtb';
                Promise.all([addToQueue.save(), Player.update({
                    '_id': userId
                }, {
                    'wtbLock': moment().add(GlobalFn.wtbLockDuration, 'minutes')
                })]).then(function() {
                    GlobalFn.PMUser(userId, 'Your message has been added to the queue.', 'success');
                }).catch(function(err) {
                    winston.error(err);
                });
            } else if (lock.status === 'locked') {
                GlobalFn.PMUser(userId, 'You can post a new message in ' + lock.until, 'warning');
            } else {
                GlobalFn.PMUser(userId, 'Unable to complete request, try again. ', 'error');
            }
        });
    }
};

exports.lr = lr = function(userId, args) {
    if (!args[0]) {
        GlobalFn.PMUser(userId, 'Invalid request, see help.');
    } else {
        checkLock(userId, 'lrLock').then(function(lock) {
            if (lock.status === 'open') {
                let addToQueue = new MsgQueue();
                addToQueue.name = lock.name;
                addToQueue.userid = userId;
                addToQueue.message = args.join(' ');
                addToQueue.channel = 'lr';
                Promise.all([addToQueue.save(), Player.update({
                    '_id': userId
                }, {
                    'lrLock': moment().add(GlobalFn.lrLockDuration, 'minutes')
                })]).then(function() {
                    GlobalFn.PMUser(userId, 'Your message has been added to the queue.', 'success');
                }).catch(function(err) {
                    winston.error(err);
                });
            } else if (lock.status === 'locked') {
                GlobalFn.PMUser(userId, 'You can post a new message in ' + lock.until, 'warning');
            } else {
                GlobalFn.PMUser(userId, 'Unable to complete request, try again. ', 'error');
            }
        });
    }
};

exports.pvm = pvm = function(userId, args) {
    if (!args[0]) {
        GlobalFn.PMUser(userId, 'Invalid request, see help.');
    } else {
        checkLock(userId, 'pvmLock').then(function(lock) {
            if (lock.status === 'open') {
                let addToQueue = new MsgQueue();
                addToQueue.name = lock.name;
                addToQueue.userid = userId;
                addToQueue.message = args.join(' ');
                addToQueue.channel = 'pvm';
                Promise.all([addToQueue.save(), Player.update({
                    '_id': userId
                }, {
                    'pvmLock': moment().add(GlobalFn.pvmLockDuration, 'minutes')
                })]).then(function() {
                    GlobalFn.PMUser(userId, 'Your message has been added to the queue.', 'success');
                }).catch(function(err) {
                    winston.error(err);
                });
            } else if (lock.status === 'locked') {
                GlobalFn.PMUser(userId, 'You can post a new message in ' + lock.until, 'warning');
            } else {
                GlobalFn.PMUser(userId, 'Unable to complete request, try again. ', 'error');
            }
        });
    }
};

exports.lock = lock = function(userId, args) {
    if (args.length < 2 || isNaN(args[2])) {
        GlobalFn.PMUser(userId, 'Invalid request, check help.', 'warning');
    } else if (args[1].toLowerCase() === 'all') {
        Player.update({
            'name': _.capitalize(args[0])
        }, {
            'wtsLock': moment().add(args[2], 'minutes'),
            'wtbLock': moment().add(args[2], 'minutes'),
            'lrLock': moment().add(args[2], 'minutes'),
            'generalLock': moment().add(args[2], 'minutes'),
            'pvmLock': moment().add(args[2], 'minutes')
        }, function(err) {
            if (err) {
                winston.error(err);
                GlobalFn.PMUser(userId, 'Unable to complete request, try again. ', 'error');
            } else {
                GlobalFn.PMUser(userId, 'Player locked for ' + args[2] + ' minutes on all channels', 'success');
            }
        });
    } else if (validChannels.indexOf(args[1]) === -1) {
        GlobalFn.PMUser(userId, 'Invalid channel!', 'warning');
    } else {
        Player.update({
            'name': _.capitalize(args[0])
        }, {
            [args[1] + 'Lock']: moment().add(args[2], 'minutes')
        }, function(err) {
            if (err) {
                winston.error(err);
                GlobalFn.PMUser(userId, 'Unable to complete request, try again. ', 'error');
            } else {
                GlobalFn.PMUser(userId, 'Player locked for ' + args[2] + ' minutes on ' +
                    args[1].toLowerCase() + ' channel', 'success');
            }
        });
    }
};

exports.unlock = unlock = function(userId, args) {
    if (args.length < 1) {
        GlobalFn.PMUser(userId, 'Invalid request, check help.', 'warning');
    } else if (args[1] === 'all') {
        Player.update({
            'name': _.capitalize(args[0])
        }, {
            'wtsLock': moment().subtract(1, 'minutes'),
            'wtbLock': moment().subtract(1, 'minutes'),
            'lrLock': moment().subtract(1, 'minutes'),
            'generalLock': moment().subtract(1, 'minutes'),
            'pvmLock': moment().subtract(1, 'minutes')
        }, function(err) {
            if (err) {
                winston.error(err);
                GlobalFn.PMUser(userId, 'Unable to complete request, try again. ', 'error');
            } else {
                GlobalFn.PMUser(userId, 'Player is now unlocked on all channels', 'success');
            }
        });
    } else if (validChannels.indexOf(args[1]) === -1) {
        GlobalFn.PMUser(userId, 'Invalid channel!', 'warning');
    } else {
        Player.update({
            'name': _.capitalize(args[0])
        }, {
            [args[1] + 'Lock']: moment().subtract(1, 'minutes')
        }, function(err) {
            if (err) {
                winston.error(err);
                GlobalFn.PMUser(userId, 'Unable to complete request, try again. ', 'error');
            } else {
                GlobalFn.PMUser(userId, 'Player is now unlocked on ' + args[1] + ' channel', 'success');
            }
        });
    }
};

function checkLock(userId, channelLock) { // channel: lrLock, genLock...
    return new Promise(function(resolve, reject) {
        Player.findOne({
            '_id': userId
        }, function(err, result) {
            if (err) {
                winston.error(err);
                reject(err);
            } else {
                if (moment().isAfter(moment(result[channelLock]))) {
                    resolve({
                        status: 'open',
                        name: result.name
                    });
                } else {
                    let a = moment();
                    let b = moment(result[channelLock]);
                    let duration = moment.duration(b.diff(a)).humanize();
                    resolve({
                        name: result.name,
                        status: 'locked',
                        until: duration
                    });
                }
            }
        });
    });
}
