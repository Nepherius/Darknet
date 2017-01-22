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
    cmdlist: function(userId) {
        Command.find({}, function(err, result) {
            if (err) {
                winston.error(err);
                GlobalFn.PMUser(userId, 'Something went wrong, try again.', 'error');
            } else {
                let cmdReply = '<center> <font color=#FFFF00> :::Darknet Command List::: </font> </center> \n\n';
                for (let i = 0, len = result.length; i < len; i++) {
                    cmdReply += '<font color=#00FFFF>Cmd name:</font> ' + _.capitalize(result[i].cmdName) + ' \n';
                    cmdReply += '<font color=#00FFFF>Description:</font> ' + result[i].description + ' \n';
                    cmdReply += '<font color=#00FFFF>Usage:</font> ' + result[i].help + ' \n';
                    cmdReply += '<font color=#00FFFF>Access Required:</font> ' + result[i].accessRequired + ' \n';
                    cmdReply += '<font color=#00FFFF>Status:</font>' +
                        (result[i].enabled === false ? '<font color=#FF0000>Disabled' : '<font color=#00FF00>Enabled') + '</font>\n\n';
                }
                GlobalFn.PMUser(userId, GlobalFn.blob('Command List', cmdReply));
            }
        });
    },
    stats: function(userId) {
        Promise.join(
            Player.count({
                'accessLevel': {
                    $gte: 1
                }
            }),
            Online.count(),
            Chat.count(),
            //$lte: moment().subtract(30, 'days')
            History.count({
                createdAt: {
                    $gte: moment().subtract(30, 'days')
                }
            }),
            History.count({
                'channel': 'general',
                createdAt: {
                    $gte: moment().subtract(30, 'days')
                }
            }),
            History.count({
                'channel': 'wtb',
                createdAt: {
                    $gte: moment().subtract(30, 'days')
                }
            }),
            History.count({
                'channel': 'wts',
                createdAt: {
                    $gte: moment().subtract(30, 'days')
                }
            }),
            History.count({
                'channel': 'lr',
                createdAt: {
                    $gte: moment().subtract(30, 'days')
                }
            }),
            History.count({
                'channel': 'pvm',
                createdAt: {
                    $gte: moment().subtract(30, 'days')
                }
            }),
            History.count(),
            History.count({
                'channel': 'general'
            }),
            History.count({
                'channel': 'wtb'
            }),
            History.count({
                'channel': 'wts'
            }),
            History.count({
                'channel': 'lr'
            }),
            History.count({
                'channel': 'pvm'
            }),
            Player.count({
                'banned': true
            }),
            function(members, online, chat, totalBroadcasts, general, wtb, wts, lr, pvm, totalBroadcastsAT, generalAT, wtbAT, wtsAT, lrAT, pvmAT, banned) {
                let statsReply = '<center> <font color=#FFFF00> :::Darknet Statistics::: </font> </center> \n\n';
                statsReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n';
                statsReply += '<font color=#00FFFF>Total Members:</font>' + members + '\n';
                statsReply += '<font color=#00FFFF>Online Members:</font>' + online + '\n';
                statsReply += '<font color=#00FFFF>Members in Private Chat:</font>' + chat + '\n';
                statsReply += '<font color=#00FFFF>Banned:</font>' + banned + '\n';
                statsReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
                statsReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n';
                statsReply += '<font color=#00FFFF>Total Broadcasts Last 30 days:</font>' + totalBroadcasts + '\n';
                statsReply += '<font color=#00FFFF>General:</font>' + general + '\n';
                statsReply += '<font color=#00FFFF>WTB:</font>' + wtb + '\n';
                statsReply += '<font color=#00FFFF>WTS:</font>' + wts + '\n';
                statsReply += '<font color=#00FFFF>Lootrights:</font>' + lr + '\n';
                statsReply += '<font color=#00FFFF>Pvm:</font>' + pvm + '\n';
                statsReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
                statsReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n';
                statsReply += '<font color=#00FFFF>Total Broadcasts All Time:</font>' + totalBroadcastsAT + '\n';
                statsReply += '<font color=#00FFFF>General:</font>' + generalAT + '\n';
                statsReply += '<font color=#00FFFF>WTB:</font>' + wtbAT + '\n';
                statsReply += '<font color=#00FFFF>WTS:</font>' + wtsAT + '\n';
                statsReply += '<font color=#00FFFF>Lootrights:</font>' + lr + '\n';
                statsReply += '<font color=#00FFFF>Pvm:</font>' + pvmAT + '\n';
                statsReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
                statsReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n';
                statsReply += '<font color=#00FFFF>Uptime:</font> ' +
                    moment.duration(process.uptime(), 'seconds').humanize() + ' \n';
                statsReply += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>';
                GlobalFn.PMUser(userId, GlobalFn.blob('Darknet Stats', statsReply));
            }).catch(function(err) {
            winston.error('Statistics retrieval error: ' + err);
        });
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
                            // BUDDY_ADD Event will fill the rest
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
                            // BUDDY_ADD Event will fill the rest
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
    test: function(userId) {
        
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
                            historyMsg += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
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
                            historyMsg += result[i].message.replace(/[^\x00-\x7F]/gmi, "") + '<font color=#00FFFF> [' +
                                result[i].name + ']</font> - ' +
                                moment(result[i].createdAt).fromNow() + '\n\n';
                            historyMsg += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
                        }
                        GlobalFn.PMUser(userId, GlobalFn.blob('History', historyMsg));
                    }
                });
        } else {
            GlobalFn.PMUser(userId, 'Invalid channel selected.', 'warning');
        }
    },
    replicastatus: function(userId) {
        Replica.find({}, function(err, result) {
            let repStatus = '<center> <font color=#FFFF00> :::Darknet Replicas Status::: </font> </center> \n\n';
            for (let i = 0, len = result.length; i < len; i++) {
                repStatus += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n';
                repStatus += '<font color=#00FFFF>Name: </font>' + result[i].replicaname + '\n';
                if (result[i].ready) {
                    repStatus += '<font color=#00FFFF>Busy: </font> <font color=#00FF00>No </font>\n';
                } else {
                    repStatus += '<font color=#00FFFF>Busy: </font> <font color=#FF0000>Yes </font>\n';
                }
                repStatus += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
            }
            GlobalFn.PMUser(userId, GlobalFn.blob('Replicas Status', repStatus));
        });
    },
    ignore: function(userId, args) {
        if (!args[0]) {
            GlobalFn.PMUser(userId, 'Invalid request, see !help ignore.', 'warning');
        } else {
            let userName = _.capitalize(args[0]);
            Player.findOne({
                'name': userName
            }, function(err, result) {
                if (err) {
                    winston.error(err);
                    GlobalFn.PMUser(userId, 'Database operation failed.', 'error');
                } else if (result === null) {
                    GlobalFn.PMUser(userId, 'Specified player is not a member.', 'warning');
                } else {
                    Player.findOneAndUpdate({
                        '_id': userId
                    }, {
                        $addToSet: {
                            'ignorelist': result._id
                        }
                    }, function(err) {
                        if (err) {
                            winston.error(err);
                            GlobalFn.PMUser(userId, 'Database operation failed.', 'error');
                        } else {
                            GlobalFn.PMUser(userId, 'Added ' + userName + ' to ignore list.', 'success');
                        }
                    });
                }
            });
        }
    },
    unignore: function(userId, args) {
        if (!args[0]) {
            GlobalFn.PMUser(userId, 'Invalid request, see !help unignore.', 'warning');
        } else {
            let userName = _.capitalize(args[0]);
            Player.findOne({
                'name': userName
            }, function(err, result) {
                if (err) {
                    winston.error(err);
                    GlobalFn.PMUser(userId, 'Database operation failed.', 'error');
                } else if (result === null) {
                    GlobalFn.PMUser(userId, 'Specified player is not a member.', 'warning');
                } else {
                    Player.findOneAndUpdate({
                        '_id': userId
                    }, {
                        $pull: {
                            'ignorelist': result._id
                        }
                    }, function(err) {
                        if (err) {
                            winston.error(err);
                            GlobalFn.PMUser(userId, 'Database operation failed.', 'error');
                        } else {
                            GlobalFn.PMUser(userId, 'Removed ' + userName + ' from ignore list.', 'success');
                        }
                    });
                }
            });
        }
    },
    playerhistory: function(userId, args) {
        if (!args[0]) {
            //If no arguments provided display braodcast history of sender.
            Player.findOne({
                '_id': userId
            }, function(err, playerInfo) {
                if (err) {
                    winston.error(err);
                } else {
                    History
                        .find({
                            'name': playerInfo.name
                        })
                        .sort({
                            createdAt: 'descending'
                        })
                        .limit(20)
                        .exec(function(err, result) {
                            if (err) {
                                winston.error(err);
                                GlobalFn.PMUser(userId, 'Database operation failed.', 'error');
                            } else {
                                let historyMsg = '<center> <font color=#FFFF00> :::' + playerInfo.name + '\'s Broadcast History::: </font> </center> \n\n';
                                for (let i = 0, len = result.length; i < len; i++) {
                                    historyMsg += '<font color=#00FFFF>' + _.capitalize(result[i].channel) + ': </font>';
                                    historyMsg += result[i].message.replace(/[^\x00-\x7F]/gmi, "") + '<font color=#00FFFF> [' +
                                        result[i].name + ']</font> - ' +
                                        moment(result[i].createdAt).fromNow() + '\n\n';
                                    historyMsg += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
                                }
                                GlobalFn.PMUser(userId, GlobalFn.blob(playerInfo.name + '\'s History', historyMsg));
                            }
                        });
                }

            });
        } else {
            let userName = _.capitalize(args[0]);
            History
                .find({
                    'name': userName
                })
                .sort({
                    createdAt: 'descending'
                })
                .limit(30)
                .exec(function(err, result) {
                    if (err) {
                        winston.error(err);
                        GlobalFn.PMUser(userId, 'Database operation failed.', 'error');
                    } else {
                        let historyMsg = '<center> <font color=#FFFF00> :::' + userName + '\'s Broadcast History::: </font> </center> \n\n';
                        for (let i = 0, len = result.length; i < len; i++) {
                            historyMsg += '<font color=#00FFFF>' + _.capitalize(result[i].channel) + ': </font>';
                            historyMsg += result[i].message.replace(/[^\x00-\x7F]/gmi, "") + '<font color=#00FFFF> [' +
                                result[i].name + ']</font> - ' +
                                moment(result[i].createdAt).fromNow() + '\n\n';
                            historyMsg += '<img src=tdb://id:GFX_GUI_FRIENDLIST_SPLITTER>\n\n';
                        }
                        GlobalFn.PMUser(userId, GlobalFn.blob(userName + '\'s History', historyMsg));
                    }
                });
        }
    },
    admins: function(userId) {
        GlobalFn.PMUser(userId, 'My master is [<a href="user://Wafflespower">Wafflespower</a>], feel free to contact him for any Darknet issues, suggestions or just general feedback.');
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
about += '<font color=#00FFFF>Version:</font> 0.2.5 \n';
about += '<font color=#00FFFF>By:</font> Nepherius \n';
about += '<font color=#00FFFF>On:</font>' + process.platform + '\n';
about += '<font color=#00FFFF>In:</font> Node v' + process.versions.node + '\n';
about += '<font color=#00FFFF>With:</font> MongoDB(Mongoose) \n';
about += '<font color=#00FFFF>Contact:</font> nepherius@live.com \n';
about += '<font color=#00FFFF>Source Code</font> https://github.com/Nepherius/Darknet \n\n';

about += '<font color=#00FFFF>Special Thanks:</font> To all the people that worked on the original AO Chat Bots, Nephbot would not be possible without them.    \n';


helpMsg = '<center> <font color=#FFFF00> :::General Help::: </font> </center> \n\n';
helpMsg += '<font color=#00FFFF> [arg] <- This is an optional argument  </font>' + '\n\n';
helpMsg += '<font color=#00FFFF>help [command name]</font> - Display general help or for a specific command.' + '\n';
helpMsg += '<font color=#00FFFF>about </font> - General Bot info.' + '\n';
helpMsg += '<font color=#00FFFF>cmdlist </font> - List all commands.' + '\n';
helpMsg += '<font color=#00FFFF>join </font> - Join private channel, while on this channel you will no longer receive PM from Darknet.' + '\n';
helpMsg += '<font color=#00FFFF>rules </font> - List Darknet rules.' + '\n';
helpMsg += '<font color=#00FFFF>status </font> - Display your channel subscription status.' + '\n';
helpMsg += '<font color=#00FFFF>autoinvite [on|off]</font> - See your current autoinvite status or turn on/off.' + '\n';
helpMsg += '<font color=#00FFFF>history [channel name]</font> - List last 20 broadcasts, optionally for a specific channel.' + '\n';
helpMsg += '<font color=#00FFFF>stats </font> - Display Darknet statistics.' + '\n';
helpMsg += '<font color=#00FFFF>subscribe < channel name|all > </font> - Subscribe to a channel or all.' + '\n';
helpMsg += '<font color=#00FFFF>unsubscribe < channel name|all > </font> - Unsubscribe from a channel or all.' + '\n';
helpMsg += '<font color=#00FFFF>general < msg > </font> - Send a general message.' + '\n';
helpMsg += '<font color=#00FFFF>lr < msg > </font> - Send a message to lootrights channel.' + '\n';
helpMsg += '<font color=#00FFFF>wts < msg > </font> - Send a message to Want To Sell channel.' + '\n';
helpMsg += '<font color=#00FFFF>wtb < msg > </font> - Send a message to Want To Buy channel.' + '\n';
helpMsg += '<font color=#00FFFF>pvm < msg > </font> - Send a message to PVM channel.' + '\n';

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
