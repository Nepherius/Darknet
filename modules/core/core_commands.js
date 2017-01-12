const events = require('events');
const winston = require('winston');
const Promise = require('bluebird');
const _ = require('lodash');
const rfr = require('rfr');
const moment = require('moment');

const fork = require('child_process').fork;

const GlobalFn = rfr('system/globals.js');
const Chat = rfr('config/models/prvGroup.js');
const Online = rfr('config/models/online.js');
const Player = rfr('config/models/player.js');
const Replica = rfr('config/models/replica_login.js');
const MsgQueue = rfr('config/models/message_queue.js');
const History = rfr('config/models/history');
const Command = rfr('config/models/commands.js');
const Settings = rfr('config/models/settings.js');

const ValidChannels = {
    general: 'generalChannel',
    gen: 'generalChannel',
    lr: 'lrChannel',
    lootrights: 'lrChannel',
    wts: 'wtsChannel',
    wtb: 'wtsChannel',
    all: 'all',
    pvm: 'pvm'
};

const coreCmd = {
    lookupUserName: function(userName) {
        return new Promise(function(resolve, reject) {
            send_CLIENT_LOOKUP(userName);
            outstandingLookups.once(userName, function(idResult) {
                winston.debug('CLIENT_LOOKUP Event Result: ' + idResult);
                resolve(idResult);
            });
        });
    },
    getClientName: function(userId) {
        return new Promise(function(resolve, reject) {
            onClientName.once(userId, function(userName) {
                winston.debug('Client Name ' + userName);
                setTimeout(function() {
                    resolve(userName);
                }, 1000);
            });
        });
    },
    help: function(userId, args) {
        if (!args[0]) {
            GlobalFn.PMUser(userId, GlobalFn.blob('Help', helpMsg));
        } else {
            Command.findOne({
                'cmdName': args[0].toLowerCase()
            }, function(err, result) {
                if (result === null) {
                    GlobalFn.PMUser(userId, 'No help found on this topic.', 'warning');
                } else {
                    GlobalFn.PMUser(userId, result.help);
                }
            });
        }
    },
    ban: function(userId, args) {
        if (!args[0]) {
            GlobalFn.PMUser(userId, 'Invalid request, check !help ban', 'warning');
        } else {
            let userName = _.capitalize(args[0]);
            Player.findOneAndUpdate({
                'name': userName
            }, {
                'banned': true
            }, function(err, result) {
                if (err) {
                    winston.error(err);
                } else if (!result) {
                    GlobalFn.PMUser(userId, 'Player is not a member.', 'warning');
                } else {
                    GlobalFn.PMUser(userId, 'Player successfully banned!', 'success');
                }
            });
        }
    },
    unban: function(userId, args) {
        if (!args[0]) {
            GlobalFn.PMUser(userId, 'Invalid request, check !help unban', 'warning');
        } else {
            let userName = _.capitalize(args[0]);
            Player.findOneAndUpdate({
                'name': userName
            }, {
                'banned': false
            }, function(err, result) {
                if (err) {
                    winston.error(err);
                } else if (!result) {
                    GlobalFn.PMUser(userId, 'Player is not a member.', 'warning');
                } else {
                    GlobalFn.PMUser(userId, 'Player successfully unbanned!', 'success');
                }
            });
        }
    },
    about: function(userId) {
        GlobalFn.PMUser(userId, GlobalFn.blob('About', about));
    },
    rules: function(userId) {
        GlobalFn.PMUser(userId, GlobalFn.blob('Rules', rules));
    },
    addadmin: function(userId, args) {
        let userName = _.capitalize(args[0]);
        if (userName !== undefined) {
            this.lookupUserName(userName).then(function(idResult) {
                if (idResult !== -1) {
                    Player.findOne({
                        'name': userName
                    }, function(err, result) {
                        if (err) {
                            winston.error(err);
                        } else if (result === null) {
                            // If user is not found in the database, insert it with minimal info,
                            // BUDDY_ADD Event will fill the test
                            const addPlayer = new Player();
                            addPlayer._id = idResult;
                            addPlayer.name = _.capitalize(userName);
                            addPlayer.accessLevel = 2;
                            addPlayer.save(function(err) {
                                if (err) {
                                    winston.error('Failed to add new admin: ' + err);
                                    GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                                    // As a failsafe try to get data from AO server manually
                                    GlobalFn.getPlayerData(idResult, userName);
                                } else {
                                    send_BUDDY_ADD(idResult);
                                    GlobalFn.PMUser(userId, userName + ' is now an admin.', 'success');
                                }
                            });
                        } else if (result.accessLevel === 2) {
                            GlobalFn.PMUser(userId, userName + ' is already an admin.', 'warning');
                        } else {
                            Player.update({
                                'name': userName
                            }, {
                                'accessLevel': 2
                            }, function(err) {
                                if (err) {
                                    winston.error(err);
                                    GlobalFn.PMUser(userId, 'Database error, unable complete operation.', 'error');
                                } else {
                                    GlobalFn.PMUser(userId, userName + ' is now an admin.', 'success');
                                }
                            });
                        }
                    });
                } else {
                    GlobalFn.PMUser(userId, 'Character ' + userName + ' does not exist.', 'warning');
                }
            });
        } else {
            GlobalFn.PMUser(userId, 'Invalid request, use !addadmin <player name>.', 'warning');
        }

    },
    addmember: function(userId, args) {
        let userName = _.capitalize(args[0]);
        if (userName !== undefined) {
            this.lookupUserName(userName).then(function(idResult) {
                if (idResult !== -1) {
                    Player.findOne({
                        'name': userName
                    }, function(err, result) {
                        if (err) {
                            winston.error(err);
                        } else if (result === null) {
                            // If user is not found in the database, insert it with minimal info,
                            // BUDDY_ADD Event will fill the test
                            const addPlayer = new Player();
                            addPlayer._id = idResult;
                            addPlayer.name = userName;
                            addPlayer.accessLevel = 1;
                            addPlayer.generalChannel = true;
                            addPlayer.lrChannel = true;
                            addPlayer.wtbChannel = true;
                            addPlayer.wtsChannel = true;
                            addPlayer.pvmChannel = true;
                            addPlayer.save(function(err) {
                                if (err) {
                                    winston.error('Failed to add new member: ' + err);
                                    GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                                    // As a failsafe try to get data from AO server manually
                                    GlobalFn.getPlayerData(idResult, userName);
                                } else {
                                    Player.count({
                                        'accessLevel': {
                                            $gte: 1
                                        },
                                        'buddyList': 'main'
                                    }, function(err, result) {
                                        if (result >= 990) {
                                            GlobalFn.replicaBuddyList({
                                                buddyAction: 'add',
                                                buddyId: idResult,
                                                count: result
                                            });
                                        } else {
                                            send_BUDDY_ADD(idResult);
                                        }
                                    });
                                    GlobalFn.PMUser(userId, userName + ' is now a member.', 'success');
                                }
                            });
                        } else if (result.accessLevel === 1) {
                            GlobalFn.PMUser(userId, userName + ' is already a member.', 'warning');
                        } else {
                            Player.update({
                                'name': userName
                            }, {
                                'accessLevel': 1,
                                'generalChannel': true,
                                'lrChannel': true,
                                'wtbChannel': true,
                                'wtsChannel': true
                            }, function(err) {
                                if (err) {
                                    winston.error(err);
                                    GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                                } else {
                                    Player.count({
                                        'accessLevel': {
                                            $gte: 1
                                        },
                                        'buddyList': 'main'
                                    }, function(err, result) {
                                        if (result >= 990) {
                                            GlobalFn.replicaBuddyList({
                                                buddyAction: 'add',
                                                buddyId: idResult,
                                                count: result
                                            });
                                        } else {
                                            send_BUDDY_ADD(idResult);
                                        }
                                    });
                                    GlobalFn.PMUser(userId, userName + ' is now a member and has been subscribed to all channels!', 'success');
                                }
                            });
                        }
                    });
                } else {
                    GlobalFn.PMUser(userId, 'Character ' + userName + ' does not exist.', 'warning');
                }
            });
        } else {
            GlobalFn.PMUser(userId, 'Invalid request, use !addmember <player name>.', 'warning');
        }
    },
    register: function(userId) {
        Player.findOne({
            '_id': userId
        }, function(err, result) {
            if (err) {
                winston.error(err);
            } else if (!result) {
                coreCmd.getClientName(userId).then(function() {
                    Player.findOneAndUpdate({
                        '_id': userId,
                        'level': {
                            $gte: GlobalFn.minLevel
                        }
                    }, {
                        'accessLevel': 1,
                        'generalChannel': true,
                        'lrChannel': true,
                        'wtbChannel': true,
                        'wtsChannel': true,
                        'pvmChannel': true
                    }, function(err, result) {
                        if (err) {
                            winston.error(err);
                            GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                        } else if (result === null) {
                            GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                        } else {
                            Player.count({
                                'accessLevel': {
                                    $gte: 1
                                },
                                'buddyList': 'main'
                            }, function(err, result) {
                                if (result >= 990) {
                                    GlobalFn.replicaBuddyList({
                                        buddyAction: 'add',
                                        buddyId: userId,
                                        count: result
                                    });
                                } else {
                                    send_BUDDY_ADD(userId);
                                }
                            });
                            GlobalFn.PMUser(userId, 'Welcome to Darknet, you have been subscribed to all channels, please take a look at our ' +
                                GlobalFn.blob('Rules', rules) + ' and ' + GlobalFn.blob('Help.', helpMsg));
                        }
                    });
                });
            } else if (result.level < GlobalFn.minLevel) {
                GlobalFn.PMUser(userId, 'You need at least level ' +
                    GlobalFn.minLevel + ' to register', 'warning');
            } else if (result.accessLevel >= 1) {
                GlobalFn.PMUser(userId, 'You are already a member.', 'warning');
            } else {
                Player.findOneAndUpdate({
                    '_id': userId
                }, {
                    'accessLevel': 1,
                    'generalChannel': true,
                    'lrChannel': true,
                    'wtbChannel': true,
                    'wtsChannel': true,
                    'pvmChannel': true
                }, function(err) {
                    if (err) {
                        winston.error(err);
                        GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                    } else {
                        Player.count({
                            'accessLevel': {
                                $gte: 1
                            },
                            'buddyList': 'main'
                        }, function(err, result) {
                            if (result >= 990) {
                                GlobalFn.replicaBuddyList({
                                    buddyAction: 'add',
                                    buddyId: userId,
                                    count: result
                                });
                            } else {
                                send_BUDDY_ADD(userId);
                            }
                        });
                        GlobalFn.PMUser(userId, 'Welcome to Darknet ' + result.name +
                            ', you have been subscribed to all channels, please take a look at our ' +
                            GlobalFn.blob('Rules', rules) + ' and ' + GlobalFn.blob('Help.', helpMsg));
                    }
                });
            }
        });
    },
    remadmin: function(userId, args) {
        if (!args[0]) {
            GlobalFn.PMUser(userId, 'Invalid request, use !delmember <player name>.', 'warning');
        } else {
            let userName = _.capitalize(args[0]);
            Player.findOne({
                'name': userName
            }, function(err) {
                if (err) {
                    winston.error(err);
                    GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                } else if (!result || result.accessLevel !== 2) {
                    GlobalFn.PMUser(userId, userName + ' is not an admin.', 'warning');
                } else {
                    Player.update({
                        'name': userName
                    }, {
                        'accessLevel': 1
                    }, function(err) {
                        if (err) {
                            winston.error(err);
                            GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                        } else {
                            GlobalFn.PMUser(userId, userName + ' is no longer an admin.', 'success');
                        }
                    });
                }
            });
        }
    },
    remmember: function(userId, args) {
        if (!args[0]) {
            GlobalFn.PMUser(userId, 'Invalid request, use !remmember <player name>.', 'warning');
        } else {
            let userName = _.capitalize(args[0]);
            Player.findOne({
                'name': userName
            }, function(err, result) {
                if (err) {
                    winston.error(err);
                    GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                } else if (!result || result.accessLevel < 1) {
                    GlobalFn.PMUser(userId, userName + ' is not member.', 'warning');
                } else {
                    Player.update({
                        'name': userName
                    }, {
                        'accessLevel': 0,
                        'generalChannel': false,
                        'lrChannel': false,
                        'wtbChannel': false,
                        'wtsChannel': false,
                        'pvmChannel': false
                    }, function(err) {
                        if (err) {
                            winston.error(err);
                            GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                        } else {
                            if (result.buddyList === 'main') {
                                send_BUDDY_REMOVE(result._id);
                            } else {
                                GlobalFn.replicaBuddyList({
                                    buddyAction: 'rem',
                                    replica: result.buddyList,
                                    buddyId: result._id
                                });
                            }
                            send_BUDDY_REMOVE(result._id);
                            GlobalFn.PMUser(userId, userName + ' is no longer a member.', 'success');
                        }
                    });
                }
            });
        }
    },
    unregister: function(userId) {
        Player.findOne({
            '_id': userId
        }, function(err, result) {
            if (err) {
                winston.error(err);
            } else if (!result) { // this should not happen
                winston.debug('Unable to find ' + userId);
                GlobalFn.PMUser(userId, 'You are not a member!', 'warning');
            } else if (result.accessLevel === 0) {
                GlobalFn.PMUser(userId, 'You are not a member!', 'warning');
            } else {
                Player.update({
                    '_id': userId
                }, {
                    'accessLevel': 0,
                    'generalChannel': false,
                    'lrChannel': false,
                    'wtbChannel': false,
                    'wtsChannel': false,
                    'pvmChannel': false
                }, function(err) {
                    if (err) {
                        winston.error('Failed to unregister player: ' + err);
                        GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                    } else {
                        if (result.buddyList === 'main') {
                            send_BUDDY_REMOVE(userId);
                        } else {
                            GlobalFn.replicaBuddyList({
                                buddyAction: 'rem',
                                replica: result.buddyList,
                                buddyId: userId
                            });
                        }
                        GlobalFn.PMUser(userId, 'You are no longer a member and have been unsubscribed from all channels!', 'success');
                    }
                });
            }
        });
    },
    subscribe: function(userId, args) {
        if (!args[0]) {
            GlobalFn.PMUser(userId, 'Invalid request, see help.', 'warning');
        } else {
            args[0] = args[0].toLowerCase();
            if (ValidChannels.hasOwnProperty(args[0])) {
                let update = {};
                if (args[0] === 'all') {
                    update = {
                        'generalChannel': true,
                        'lrChannel': true,
                        'wtbChannel': true,
                        'wtsChannel': true,
                        'pvmChannel': true
                    };
                } else {
                    update[ValidChannels[args[0]]] = true;
                }
                Player.update({
                    '_id': userId
                }, update, function(err) {
                    if (err) {
                        winston.error(err);
                        GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                    } else {
                        GlobalFn.PMUser(userId, 'Successfully subscribed to  ' + args[0] + '.', 'success');
                    }
                });
            } else {
                GlobalFn.PMUser(userId, 'Invalid channel name.Valid choices are: general,lr,wts,wtb.', 'warning');
            }

        }
    },
    unsubscribe: function(userId, args) {
        if (!args[0]) {
            GlobalFn.PMUser(userId, 'Invalid request, see help.', 'warning');
        } else {
            args[0] = args[0].toLowerCase();
            if (ValidChannels.hasOwnProperty(args[0])) {
                let update = {};
                if (args[0] === 'all') {
                    update = {
                        'generalChannel': false,
                        'lrChannel': false,
                        'wtbChannel': false,
                        'wtsChannel': false,
                        'pvmChannel': false
                    };
                } else {
                    update[ValidChannels[args[0]]] = false;
                }
                Player.update({
                    '_id': userId
                }, update, function(err) {
                    if (err) {
                        winston.error(err);
                        GlobalFn.PMUser(userId, 'Database operation failed, try again.', 'error');
                    } else {
                        GlobalFn.PMUser(userId, 'Successfully unsubscribed from ' + args[0] + '.', 'success');
                    }
                });
            } else {
                GlobalFn.PMUser(userId, 'Invalid channel name.Valid choices are: general,lr,wts,wtb.', 'warning');
            }

        }
    },
    test: function(userId, msg) {

        /// Huh ?

    },
    addreplica: function(userId, args) {
        addReplica = new Replica();
        addReplica.username = args[0];
        addReplica.password = args[1];
        addReplica.replicaname = _.capitalize(args[2]);
        if (args[3]) {
            addReplica.dimension = args[3];
        }
        addReplica.save(function(err) {
            if (err) {
                winston.error(err);
                GlobalFn.PMUser(userId, 'Unable to add new replica, see Log for details!', 'error');
            } else {
                GlobalFn.PMUser(userId, 'Successfully added a new replica!', 'success');
            }
        });
    },
    shutdown: function(userId) {
        GlobalFn.die('Shutting down on user request');
    },
    invite: function(userId, args) {
        let userName = args[0];
        if (userName !== undefined) {
            this.lookupUserName(userName).then(function(idResult) {
                if (idResult !== -1) {
                    send_PRIVGRP_INVITE(idResult);
                    GlobalFn.PMUser(userId, 'Invited ' + userName + ' to this channel', 'success');
                } else {
                    GlobalFn.PMUser(userId, 'Character ' + userName + ' does not exist.', 'warn');
                }
            });
        } else {
            send_PRIVGRP_INVITE(userId);
        }
    },
    join: function(userId) {
        send_PRIVGRP_INVITE(userId);
    },
    kick: function(userId, args) {
        let userName = args[0];
        if (userName !== undefined) {
            this.lookupUserName(userName).then(function(idResult) {
                if (idResult !== -1) {
                    Chat.findById(idResult).populate('_id').exec(function(err, result) {
                        if (err) {
                            winston.error(err);
                        } else if (result === null) {
                            GlobalFn.PMUser(userId, userName + ' is not on the channel.', 'warning');
                        } else {
                            send_PRIVGRP_KICK(idResult);
                            GlobalFn.PMUser(userId, 'Kicked ' + userName + ' from this channel.', 'success');
                        }
                    });
                } else {
                    GlobalFn.PMUser(userId, 'Character ' + userName + ' does not exist.', 'warn');
                }
            });
        } else {
            send_PRIVGRP_KICK(userId);
            GlobalFn.PMUser(userId, 'You\'ve left the channel.', 'success');
        }
    },
    leave: function(userId) {
        send_PRIVGRP_KICK(userId);
        GlobalFn.PMUser(userId, 'You\'ve left the channel.', 'success');
    },
    set: function(userId, args) {
        if (ValidSettings.hasOwnProperty(args[0]) || !args[1]) {
            Settings.update({}, {
                [ValidSettings[args[0]]]: args[1]
            }, function(err) {
                if (err) {
                    winston.error(err);
                } else {
                    GlobalFn.loadSettings();
                    GlobalFn.PMUser(userId, 'Settings successfully updated', 'success');
                }
            });
        } else {
            GlobalFn.PMUser(userId, 'Invalid setting!', 'error');
        }
    },
    autoinvite: function(userId, args) {
        if (!args[0]) {
            Player.findOne({
                '_id': userId
            }, function(err, result) {
                if (err) {
                    winston.error(err);
                } else {
                    GlobalFn.PMUser(userId, 'Autoinvite is set to: ' + result.autoinvite, 'success');
                }
            });
        } else if (args[0].toLowerCase() === 'on' || args[0].toLowerCase() === 'off') {
            if (args[0].toLowerCase() === 'on') {
                Player.update({
                    '_id': userId
                }, {
                    autoinvite: true
                }, function(err) {
                    if (err) {
                        winston.error(err);
                    } else {
                        GlobalFn.PMUser(userId, 'Autoinvite successfully updated!');
                    }
                });
            } else {
                Player.update({
                    '_id': userId
                }, {
                    autoinvite: false
                }, function(err) {
                    if (err) {
                        winston.error(err);
                    } else {
                        GlobalFn.PMUser(userId, 'Autoinvite successfully updated!');
                    }
                });
            }
        } else {
            GlobalFn.PMUser(userId, 'Invalid setting!', 'error');
        }
    },
    history: function(userId, args) {
        if (!args[0]) {
            History
                .find()
                .sort({
                    createdAt: 'descending'
                })
                .limit(20)
                .exec(function(err, result) {
                    if (err) {
                        winston.error(err);
                    } else {
                        let historyMsg = '<center> <font color=#FFFF00> :::Darknet History::: </font> </center> \n\n';
                        for (let i = 0, len = result.length; i < len; i++) {
                            historyMsg += '<font color=#00FFFF>' + _.capitalize(result[i].channel) + ': </font>';
                            historyMsg += result[i].message + '<font color=#00FFFF> [' +
                                result[i].name + ']</font> - ' +
                                moment(result[i].createdAt).fromNow() + '\n';
                        }
                        GlobalFn.PMUser(userId, GlobalFn.blob('History', historyMsg));
                    }
                });
        } else if (args[0].toLowerCase() === 'wts' ||
            args[0].toLowerCase() === 'wtb' ||
            args[0].toLowerCase() === 'general' ||
            args[0].toLowerCase() === 'pvm' ||
            args[0].toLowerCase() === 'lr'
        ) {
            History
                .find({
                    channel: args[0].toLowerCase()
                })
                .sort({
                    createdAt: 'descending'
                })
                .limit(20)
                .exec(function(err, result) {
                    if (err) {
                        winston.error(err);
                    } else {
                        let historyMsg = '<center> <font color=#FFFF00> :::Darknet History::: </font> </center> \n\n';
                        for (let i = 0, len = result.length; i < len; i++) {
                            historyMsg += '<font color=#00FFFF>' + _.capitalize(result[i].channel) + ': </font>';
                            historyMsg += result[i].message + '<font color=#00FFFF> [' +
                                result[i].name + ']</font> - ' +
                                moment(result[i].createdAt).fromNow() + '\n\n';
                        }
                        GlobalFn.PMUser(userId, GlobalFn.blob('History', historyMsg));
                    }
                });
        } else {
          GlobalFn.PMUser(userId, 'Invalid channel selected.', 'warning');
        }
    }
};

const ValidSettings = {
    cmdprefix: 'cmdPrefix',
    pmcolor: 'defaultPMColor',
    successpmcolor: 'successPMColor',
    warnpmcolor: 'warnPMColor',
    errpmcolor: 'errPMColor',
    chatcolor: 'defaultChatColor',
    successchatcolor: 'successChatColor',
    warnchatcolor: 'warnChatColor',
    errchatcolor: 'errChatColor',
    minlevel: 'minLevel',
    maxwarnings: 'maxWarnings',
    generallock: 'generalLockDuration',
    wtslock: 'wtsLockDuration',
    wtblock: 'wtbLockDuration',
    lrlock: 'lrLockDuration',
    pvmlock: 'pvmLockDuration'
};

var about = '<center> <font color=#FFFF00> :::Nephbot - Darknet::: </font> </center> \n\n';
about += '<font color=#00FFFF>Version:</font> 0.2.0 \n';
about += '<font color=#00FFFF>By:</font> Nepherius \n';
about += '<font color=#00FFFF>On:</font>' + process.platform + '\n';
about += '<font color=#00FFFF>In:</font> Node v' + process.versions.node + '\n';
about += '<font color=#00FFFF>With:</font> MongoDB(Mongoose) \n';
about += '<font color=#00FFFF>Contact:</font> nepherius@live.com \n';
about += '<font color=#00FFFF>Source Code</font> https://github.com/Nepherius/Darknet \n\n';

about += '<font color=#00FFFF>Special Thanks:</font> To all the people that worked on the original AO Chat Bots, Nephbot would not be possible without them.    \n';


helpMsg = '<center> <font color=#FFFF00> :::General Help::: </font> </center> \n\n';
helpMsg += '<font color=#00FFFF> [arg] <- This is an optional argument  </font>' + '\n\n';
helpMsg += '<font color=#00FFFF>Help: </font> help [command name]' + '\n';
helpMsg += '<font color=#00FFFF>About: </font> General Bot info.' + '\n';
helpMsg += '<font color=#00FFFF>Join: </font> Join private channel, while on this channel you will no longer receive PM from Darknet.' + '\n';
helpMsg += '<font color=#00FFFF>Rules: </font> Rules suck but it would be chaos without them.' + '\n';
helpMsg += '<font color=#00FFFF>Status: </font> Display your channel subscription status.' + '\n';
helpMsg += '<font color=#00FFFF>Autoinvite: </font> !autoinvite [on|off]' + '\n';
helpMsg += '<font color=#00FFFF>History: </font> history [channel name] to view last 20 broadcasts.' + '\n';
helpMsg += '<font color=#00FFFF>Stats: </font> stats to see bot statistics.' + '\n';
helpMsg += '<font color=#00FFFF>Subscribe: </font> subscribe < channel name|all > to subscribe to a channel' + '\n';
helpMsg += '<font color=#00FFFF>Unsubscribe: </font> unsubscribe < channel name|all > to unsubscribe from a channel' + '\n';
helpMsg += '<font color=#00FFFF>General: </font> general < msg > to send a general message.' + '\n';
helpMsg += '<font color=#00FFFF>LR: </font> lr < msg > to send a message to lootrights channel.' + '\n';
helpMsg += '<font color=#00FFFF>WTS: </font> wts < msg > to send a message to Want To Sell channel.' + '\n';
helpMsg += '<font color=#00FFFF>WTB: </font> wtb < msg > to send a message to Want To Buy channel.' + '\n';
helpMsg += '<font color=#00FFFF>PVM: </font> pvm < msg > to send a message to PVM channel.' + '\n';

var rules = '<center> <font color=#FFFF00> :::Darknet Rules::: </font> </center> \n\n';
rules += '<font color=#00FFFF>Do NOT use any channel for chatting, you have PM for that.</font> \n';
rules += '<font color=#00FFFF>Personal issues, accusations of players or organizations, profanity and jokes are not allowed!</font> \n';
rules += '<font color=#00FFFF>The only language allowed is English!</font> \n';
rules += '<font color=#00FFFF>DO NOT USE ALTS TO GET AROUND LOCK TIMERS!This will result in a ban!</font> \n\n';
rules += '<font color=#FFC94D> WTB Channel: </font>';
rules += '<font color=#00FFFF>If you Want to Buy items with YesDrop Flag your message goes here! \nOptionally if you are buying regular items and NoDrop items you can post A SINGLE messages on this channel instead 2 messages, one on wtb channel and one on lr channel.</font> \n';
rules += '<font color=#FFC94D > WTS Channel: </font>';
rules += '<font color=#00FFFF>If you Want to Sell items with YesDrop Flag your message goes here!</font> \n';
rules += '<font color=#FFC94D > Lootrights Channel: </font>';
rules += '<font color=#00FFFF>If you Want to Buy/Sell items with NoDrop Flag your message goes here!</font> \n';
rules += '<font color=#FFC94D > PVM Channel: </font>';
rules += '<font color=#00FFFF>If you want to expand/form a team for that super-hard instance your message goes here!</font> \n';
rules += '<font color=#FFC94D > General Channel: </font>';
rules += '<font color=#00FFFF>For any other game related messages that don\'t match the other channels post here!</font> \n';
rules += '<font color=#FFC94D > Private Group(Chat): </font>';
rules += '<font color=#00FFFF> This chat only exists to provide an alternative for private messages, it should NOT be used for chatting. DO NOT send any messages on this chat or you WILL be Banned!\n';
rules += '<font color=#FF0000>All bans are PERMANENT!</font> \n';


// Export core commands
module.exports = coreCmd;
