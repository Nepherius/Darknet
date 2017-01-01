const fork = require('child_process').fork;
const util = require('util');
const winston = require('winston');
const rfr = require('rfr');
const _ = require('lodash');
const Promise = require('bluebird');

const GlobalFn = require('../globals');
const MsgQueue = rfr('config/models/message_queue');
const Online = rfr('config/models/online');
const Replica = rfr('config/models/replica_login');
const Player = rfr('config/models/player');


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
            replicaname = 'darknet1';
        } else if (buddyObj.count <= 2970) {
            replicaname = 'darknet2';
        } else if (buddyObj.count <= 3960) {
            replicaname = 'darknet3';
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
                    let playerArray = _.chunk(online_filtered, 5);

                    GlobalFn.PMUser(msgObj.userid, 'Your message is being distributed to ' +
                        online_filtered.length + ' players', 'success');

                    for (let i = 0, len = playerArray.length; i < len; i++) {
                        findAvailableReplica(5000).then(function(result) {
                            let replica = Obj[result.replicaname];
                            // Check if replica is connected and receiving messages;
                            if (replica.connected) {
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
