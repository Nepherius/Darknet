const fork = require('child_process').fork;
const util = require('util');
const winston = require('winston');
const rfr = require('rfr');
const _ = require('lodash');
const Promise = require('bluebird');

const GlobalFn = require('../globals');
const MsgQueue = rfr('config/models/message_queue');
const History = rfr('config/models/history');
const Replica = rfr('config/models/replica_login');
const Player = rfr('config/models/player');
const Online = rfr('config/models/online');
const Chat = rfr('config/models/prvGroup');


const Obj = {};


GlobalFn.isReplicaConnected = function() {
    Replica.find({}, function(err, result) {
        if (err) {
            winston.error(err);
        } else if (result !== null) {
            for (let i = 0, len = result.length; i < len; i++) {
                setTimeout(function() {
                    if (Obj[result[i].replicaname] === undefined ||
                        !Obj[result[i].replicaname].connected) {
                        try {
                            Obj[result[i].replicaname] = fork('system/replica/replica_main.js', [result[i].replicaname]);
                        } catch (err) {
                            winston.error(err);
                        }
                    }
                }, i * 5000);
            }
        }
    });
};

GlobalFn.replicaBuddyList = function(buddyObj) {
    if (buddyObj.buddyAction === 'add') {
        let replicaname; // TODO fix me, thi is a temporary crude operation
        if (buddyObj.count <= 1980) {
            replicaname = 'Darknet1';
        } else if (buddyObj.count <= 2970) {
            replicaname = 'Darknet2';
        } else if (buddyObj.count <= 3960) {
            replicaname = 'Darknet3';
        } else if (buddyObj.count <= 4950) {
            replicaname = 'darknet4';
        } else if (buddyObj.count <= 5940) {
            replicaname = 'darknet5';
        }
        Player.update({
            '_id': buddyObj.buddyId
        }, {
            'buddyList': replicaname
        }, function(err) {
            if (err) {
                winston.error(err);
            } else {
                Obj[replicaname].send(buddyObj);
            }
        });

    } else if (buddyObj.buddyAction === 'rem') {
        Player.update({
            '_id': buddyObj.buddyId
        }, {
            'buddyList': 'main'
        }, function(err) {
            if (err) {
                winston.error(err);
            } else {
                Obj[buddyObj.replica].send(buddyObj);
            }
        });

    }
};


const Prefix = {
    wts: '[' + '<font color=#FF0000>WTS</font>' + '] ',
    wtb: '[' + '<font color=#00FF00>WTB</font>' + '] ',
    lr: '[' + '<font color=#FF00FF>Lootrights</font>' + '] ',
    general: '[' + '<font color=#FCA712>General</font>' + '] ',
    pvm: '[' + '<font color=#f0f409>PVM</font>' + '] '
};

GlobalFn.retrieveSplitAndBroadcast = function() {
    // Check if there are any messages in the queue
    MsgQueue.findOneAndRemove().then(function(msgObj) {
        if (msgObj !== null) {
            winston.debug('Message found and ready to broadcast.');
            Online.find().populate({
                path: '_id',
                match: {
                    [msgObj.channel + 'Channel']: true
                }
            }).exec(function(err, online) {
                if (err) {
                    winston.error(err);
                } else {
                    let online_filtered = online.filter(removeNull);

                    // Inform user message is being distributed
                    GlobalFn.PMUser(msgObj.userid, 'Your message is being distributed to ' +
                        online_filtered.length + ' players', 'success');
                    // Send Message to Private Group
                    send_PRIVGRP_MESSAGE(GlobalFn.botId, Prefix[msgObj.channel] +
                        '<font color="#f7892a">' + msgObj.message + '</font>' +
                        ' [<a href="user://' + msgObj.name + '">' + msgObj.name + '</a>]');

                    // Find all player on private group(chat) and remove them from
                    // receivers list
                    Chat.find({}, function(err, onChat) {
                        if (err) {
                            winston.error(err);
                        } else {
                            let online_refiltered = online_filtered.filter(function(e) {
                                let search = _.find(onChat, function(obj) {
                                    return obj._id === e._id._id;
                                });
                                return search === undefined;
                            });
                            let playerArray = _.chunk(online_refiltered, 5);
                            for (let i = 0, len = playerArray.length; i < len; i++) {
                                findAvailableReplica(5000).then(function(result) {
                                    let replica = Obj[result.replicaname];
                                    // Check if replica is connected and receiving messages;
                                    if (replica !== undefined && replica.connected) {
                                        replica.send({
                                            playerArray: playerArray[i],
                                            channel: msgObj.channel,
                                            sender: msgObj.name,
                                            sender_id: msgObj.userid,
                                            message: msgObj.message
                                        });
                                    } else {
                                        i--;
                                    }
                                });
                            }
                        }
                    });

                    // Add the message details to history.
                    let addToHistory = new History();
                    addToHistory.name = msgObj.name;
                    addToHistory.channel = msgObj.channel;
                    addToHistory.message = msgObj.message;

                    addToHistory.save(function(err) {
                      if(err) {
                        winston.error(err);
                      } else {
                        console.log('all good');
                      }
                    });

                }
            });
        }
    });
};


function removeNull(e) {
    return e._id !== null;
}

function findAvailableReplica(delay) {
    return new Promise(function(resolve, reject) {
        function next() {
            winston.debug('Searching for an available replica...');
            Replica.findOneAndUpdate({
                'ready': true
            }, {
                'ready': false
            }).then(function(result) {
                if (result !== null) {
                    // found a result, exiting loop
                    winston.debug('Found replica ' + result.replicaname);
                    resolve(result);
                } else {
                    // run another iteration of the loop after delay
                    setTimeout(next, delay);
                }
            }, reject).catch(function(err) {
                winston.error(err);
            });
        }
        // start first iteration of the loop
        next();
    });
}
