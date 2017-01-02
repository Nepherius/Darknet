const winston = require('winston');
const rfr = require('rfr');
const assert = require('assert');
const util = require('util');
const events = require('events');
const Promise = require('bluebird');
const moment = require('moment');

const pack = require('./system/core/pack');
const auth = require('./system//core/chat-packet');
const connect = require('./system/core/connect');
const handle = connect.handle;
const s = connect.s;
const Ops = require('./system/recursive_ops');

// Load Database Models
const Settings = require('./config/models/settings.js');
const Command = require('./config/models/commands.js');
const Player = require('./config/models/player.js');
const Chat = require('./config/models/prvGroup.js');
const Online = require('./config/models/online.js');



// Import Commands Index & Global Functions
const Cmd = require('./modules/index.js');
const GlobalFn = require('./system/globals.js');
// Register Events
global.outstandingLookups = new events.EventEmitter();
global.onClientName = new events.EventEmitter();
const buddyStatus = new events.EventEmitter();
const privgrp = new events.EventEmitter();
const incMessage = new events.EventEmitter();
const channels = new events.EventEmitter();


// Configure Log
//{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
winston.configure({
    level: 'info',
    transports: [
        new(winston.transports.Console)({
            colorize: true,
            'timestamp': true,
            handleExceptions: true,
            humanReadableUnhandledException: true
        }),
        new(require('winston-daily-rotate-file'))({
            filename: './log',
            prepend: true,
            handleExceptions: true,
            humanReadableUnhandledException: true
        })
    ]
});

// Login
const startTime = process.hrtime(); // Used later to prevent login PM spam

function pack_key(key) {
    return pack.pack(
        [
            ['I', 0],
            ['S', GlobalFn.Login],
            ['S', key]
        ]);
}
handle[auth.AOCP.LOGIN_SEED] = function(payload) {
    winston.debug('Login_SEED');
    var seedLength = payload.readInt16BE(0);
    assert.equal(seedLength, payload.length - 2);
    var seed = payload.slice(2);

    let data = pack_key(auth.generate_login_key(seed, GlobalFn.Login, GlobalFn.Pass));
    var pp = auth.assemble_packet(auth.AOCP.LOGIN_REQUEST, data);

    s.write(pp);
};
// Select Character
handle[auth.AOCP.LOGIN_CHARLIST] = function(data) {
    var chars = pack.unpack(data);
    winston.debug(chars); // Display all chars on the account
    for (let key in chars) {
        if (key.toLowerCase() === GlobalFn.botname.toLowerCase()) {
            winston.info(GlobalFn.botname + ' Found');
            var i = Object.keys(chars).indexOf(key);
            GlobalFn.botId = chars[Object.keys(chars)[i]].id;
            break;
        }
    }
    if (!GlobalFn.botId) {
        winston.error(GlobalFn.botname + ' was not found on this account!');
        process.exitCode = 1;
    }
    winston.debug({
        botId: GlobalFn.botId
    });
    data = pack.pack([
        ['I', GlobalFn.botId]
    ]);
    var pp = auth.assemble_packet(auth.AOCP.LOGIN_SELECT, data);
    s.write(pp);
};



/*************** RESPONSE HANDLERS ***************/
handle[auth.AOCP.LOGIN_ERROR] = function(data, u) {
    let loginError = u.S();
    pack.unpackError(data);
    winston.error(loginError);
    GlobalFn.die();
};

handle[auth.AOCP.LOGIN_OK] = function() {
    winston.info('Logged On');

    const recursivePing = function() {
        send_PING();
        setTimeout(recursivePing, 120000);
    };
    recursivePing();


    Settings.findOneAndUpdate({}, {
        loggedOn: Date.now()
    }, function(err) {
        if (err) {
            winston.error(err);
            process.exitCode = 1;
        }
    });

    // Load Settings
    GlobalFn.loadSettings();
    // Clean Online List
    Online.remove({}, function(err) {
        if (err) {
            winston.error(err);
        }
    });
    // Clean Chat Guest List
    Chat.remove({}, function(err) {
        if (err) {
            winston.error(err);
        }
    });

};

handle[auth.AOCP.CLIENT_NAME] = function(data, u) {
    let userId = u.I();
    let userName = u.S();
    u.done();

    Player.findOne({
        '_id': userId
    }, function(err, result) {
        if (err) {
            winston.error(err);
        } else if (result === null || result === undefined ||
            moment().subtract(12, 'hours').isAfter(moment(result.lastupdate))) {
            GlobalFn.getPlayerData(userId, userName);
        } else {
            winston.debug('No update for: ' + userId + ' already updated on ' +
                result.lastupdate);
        }
    });

};

handle[auth.AOCP.BUDDY_ADD] = function(data, u) { // handles online/offline status too
    let userId = u.I();
    var userStatus = u.I() == 1 ? 'online' : 'offline';
    var unknownPart = u.S();
    u.done();
    winston.debug({
        userId: userId,
        userStatus: userStatus
    });
    if (userStatus === 'online') {
        buddyStatus.emit('online', userId, userStatus);
    } else if (userStatus === 'offline') {
        buddyStatus.emit('offline', userId, userStatus);
    }
};

handle[auth.AOCP.BUDDY_REMOVE] = function(data, u) {
    let userId = u.I();
    u.done();
    winston.debug('BUDDY_REMOVE:' + userId);
    buddyStatus.emit('offline', userId);
};

handle[auth.AOCP.MESSAGE_PRIVATE] = function(data, u) {
    let userId = u.I();
    var text = u.S().replace(GlobalFn.cmdPrefix, ''); // prefix not needed for PM
    var unknownPart = u.S();
    u.done();
    winston.info({
        userId: userId,
        text: text
    });
    incMessage.emit('pm', userId, text);
};
handle[auth.AOCP.MESSAGE_SYSTEM] = function(data, u) {
    var systemMsg = u.S();
    u.done();
    winston.info('System Message : ' + systemMsg);
};
handle[auth.AOCP.CLIENT_LOOKUP] = function(data, u) {
    let userId = u.I();
    var userName = u.S();
    u.done();
    let idResult = userId;
    winston.debug('CLIENT_LOOKUP:', {
        userId: userId,
        userName: userName
    });
    outstandingLookups.emit(userName, idResult);
};

handle[auth.AOCP.CHAT_NOTICE] = function(data, u) {
    let userId = u.I();
    var data2 = u.I(); // ?
    var data3 = u.I(); // ?
    var text = u.S();
    u.done();
    winston.debug('CHAT_NOTICE:', {
        userId: userId,
        data2: data2,
        data3: data3,
        text: text
    });
};

handle[auth.AOCP.PRIVGRP_CLIJOIN] = function(data, u) {
    let botId = u.I();
    let userId = u.I();
    u.done();
    privgrp.emit('join', userId);

};

handle[auth.AOCP.PRIVGRP_CLIPART] = function(data, u) {
    let botId = u.I();
    let userId = u.I();
    u.done();
    privgrp.emit('part', userId);

};

handle[auth.AOCP.PRIVGRP_PART] = function(data, u) {
    let botId = u.I();
    let userId = u.I();
    u.done();
};

handle[auth.AOCP.PRIVGRP_MESSAGE] = function(data, u) {
    let botId = u.I();
    let userId = u.I();
    var text = u.S();
    var unknownPart = u.S();
    u.done();
    winston.debug({
        userId: userId,
        text: text
    });
    incMessage.emit('grp', userId, text);

};

handle[auth.AOCP.PRIVGRP_REFUSE] = function(data, u) // Needs testing
    {
        var arg1 = u.I();
        var arg2 = u.I();
        u.done();
    };

handle[auth.AOCP.GROUP_ANNOUNCE] = function(data, u) {
    var buffer = u.G();
    var channelName = u.S();
    var unknownId = u.I();
    var unknownPart = u.S();
    u.done();
    channels.emit('new', channelName, buffer);
};

handle[auth.AOCP.PING] = function(data, u) {
    var Pong = u.S();
    u.done();
    winston.debug({
        Pong: Pong
    });
};


/*************** Requests ***************/

global.send = function(type, spec) {
    s.write(auth.assemble_packet(type, pack.pack(spec)));
};

global.send_PRIVGRP_MESSAGE = function(chanId, text) {
    send(
        auth.AOCP.PRIVGRP_MESSAGE, [
            ['I', chanId],
            ['S', text],
            ['S', '\0']
        ]);
};
global.send_MESSAGE_PRIVATE = function(userId, text) {
    winston.info('%s -> %d', text, userId);
    send(
        auth.AOCP.MESSAGE_PRIVATE, [
            ['I', userId],
            ['S', text],
            ['S', '\0']
        ]);
};

global.send_ONLINE_SET = function(arg) {
    winston.info('SET ONlINE');
    send(
        auth.AOCP.ONLINE_SET, [
            ['I', arg]
        ]);
};

global.send_PRIVGRP_INVITE = function(userId) {
    winston.info('Inviting user to chat');
    send(
        auth.AOCP.PRIVGRP_INVITE, [
            ['I', userId]
        ]);
};

global.send_PRIVGRP_KICK = function(userId) {
    send(
        auth.AOCP.PRIVGRP_KICK, [
            ['I', userId]
        ]);
};

global.send_PRIVGRP_JOIN = function(userId) {
    send(
        auth.AOCP.PRIVGRP_JOIN, [
            ['I', userId]
        ]);

};

global.send_PRIVGRP_PART = function(userId) {
    send(
        auth.AOCP.PRIVGRP_PART, [
            ['I', userId]
        ]);

};

global.send_PRIVGRP_KICKALL = function() {
    send(
        auth.AOCP.PRIVGRP_KICKALL, []
    );

};

global.send_CLIENT_LOOKUP = function(userName) {
    send(
        auth.AOCP.CLIENT_LOOKUP, [
            ['S', userName.toString()]
        ]);

};

global.send_BUDDY_ADD = function(userId) {
    winston.info('BUDDY_ADD_id %d', userId);
    send(
        auth.AOCP.BUDDY_ADD, [
            ['I', userId],
            ['S', '\u0001']
        ]);
};

global.send_BUDDY_REMOVE = function(userId) {
    winston.info('BUDDY_REMOVE_id %d', userId);
    send(
        auth.AOCP.BUDDY_REMOVE, [
            ['I', userId]
        ]);
};

global.send_PING = function() {
    winston.debug('Ping');
    send(
        auth.AOCP.PING, [
            ['S', 'Ping']
        ]);
};



/***************** Events *****************/

// Private Messages
incMessage.on('pm', function(userId, message) {
    // Continue only if at least 5 seconds passed since login
    // to prevent offline msg spam
    if (process.hrtime(startTime)[0] > 5) {
        if (!message.match(/Away from keyboard/igm)) { // if message is afk reply stop here
            let cmdName = message.split(' ')[0].toLowerCase();
            Promise.join(
                Command.findOne({
                    cmdName: cmdName
                }),
                Player.findById(userId),
                function(cmd, user) {
                    // Search for user in DB
                    if (user !== null && user.banned) {
                        // Do nothing if user is banned, no need to waste a reply.
                    } else if (cmd === null || cmd.length === 0) {
                        GlobalFn.PMUser(userId, 'Command not found!', 'warning');
                    } else if (cmd.disabled) {
                        GlobalFn.PMUser(userId, 'This command has been disabled.', 'warning');
                    } else if (user === null || user.length === 0) {
                        // If user is not found an async lookup is happening
                        // and db is being filled with the default values:
                        // Access Level = 0
                        if (cmd.accessRequired === 0) {
                            let args = [];
                            for (let i = 1; i < message.split(' ').length; i++) {
                                args.push(message.split(' ')[i]);
                            }
                            Cmd[cmdName](userId, args);
                        } else {
                            GlobalFn.PMUser(userId, 'Access Denied!', 'error');
                        }
                    } else if (user.name.toLowerCase() !== GlobalFn.owner.toLowerCase() && cmd.accessRequired > user.accessLevel) {
                        GlobalFn.PMUser(userId, 'Access Denied!', 'error');
                    } else { // All checks passed, exec command
                        let args = [];
                        for (let i = 1; i < message.split(' ').length; i++) {
                            args.push(message.split(' ')[i]);
                        }
                        Cmd[cmdName](userId, args);
                    }
                }).catch(function(err) {
                winston.error('Private Message: ' + err);
            });

        }
    }
});

// Group Message
incMessage.on('grp', function(userId, message) {
    winston.info("[Chat]" + userId + ": " + message);


});

// Friend(Buddy) List
buddyStatus.on('online', function(userId, userStatus) {
    Player.update({
        '_id': userId
    }, {
        'lastseen': Date.now()
    }, function(err) {
        if (err) {
            winston.error(err);
        } else {
            winston.debug('Updated lastseen of user: ' + userId);
        }
    });
    let addOnline = new Online();
    addOnline._id = userId;
    addOnline.save(function(err) {
        if (err) {
            winston.error('Failed adding to Online: ' + err);
        }
    });
});

buddyStatus.on('offline', function(userId, userStatus) {
    Online.remove({
        _id: userId
    }, function(err) {
        if (err) {
            winston.error('Remove from online failed: ' + err);
        }
    });
});

// Private Group(Chat)

privgrp.on('join', function(userId) {
    new Chat({ // Add user to private chat
        _id: userId
    }).save(function(err, result) {
        if (err) {
            winston.error(err);
        } else {
            Chat.findById(result._id).populate('_id').exec(function(err, result) {
                if (err) {
                    winston.error(err);
                } else {
                    send_PRIVGRP_MESSAGE(GlobalFn.botId, result._id.name + ' joined the chat');
                }
            });
        }
    });
});

privgrp.on('part', function(userId) {
    Chat.findOneAndRemove({
        _id: userId
    }).populate('_id').exec(function(err, result) {
        if (err) {
            winston.error('Faild to remove user from chat' + err);
        }
        send_PRIVGRP_MESSAGE(GlobalFn.botId, result._id.name + ' left the chat');
    });
});
global.Channels = {};
channels.on('new', function(chName, chBuffer) {
    Channels[chName] = chBuffer;
    if (chBuffer.slice(0, 1).toString('hex') == 3) {
        global.orgBuffer = new Buffer(chBuffer);
    }
});
