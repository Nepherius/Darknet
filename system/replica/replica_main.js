const rfr = require('rfr');
const winston = require('winston');

const assert = require('assert');
const util = require('util');
const events = require('events');
const Promise = require('bluebird');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/darknet');

const connect = rfr('./system/core/connect');
const handle = connect.handle;
const s = connect.s;
const pack = rfr('./system/core/pack');
const auth = rfr('./system/core/chat-packet');
const Replica = rfr('./config/models/replica_login.js');
const Player = rfr('./config/models/player.js');
const Online = rfr('./config/models/online.js');

const start = startBot;
const GlobalFn = {};

Replica.findOneAndUpdate({
    'replicaname': process.argv[2]
}, {
    'ready': true
}).then(function(result) {
    GlobalFn.botname = result.replicaname;
    GlobalFn.replicaname = result.replicaname;
    GlobalFn.Login = result.username;
    GlobalFn.Pass = result.password;
    start('chat.d1.funcom.com', 7105);
}).catch(function(err) {
    winston.error(err);
});

const buddyStatus = new events.EventEmitter();

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


/* /// Send message to Master process
function func(input) {
    process.send('pong');
}
*/

const Prefix = {
    wts: '[' + '<font color=#FF0000>WTS</font>' + '] ',
    wtb: '[' + '<font color=#00FF00>WTB</font>' + '] ',
    lr: '[' + '<font color=#FF00FF>Lootrights</font>' + '] ',
    general: '[' + '<font color=#FCA712>General</font>' + '] ',
    pvm: '[' + '<font color=#f0f409>PVM</font>' + '] '
};

process.on('message', function(Obj) {
    if (Obj.buddyAction !== null && Obj.buddyAction !== undefined) {
        if (Obj.buddyAction === 'add') {
            send_BUDDY_ADD(Obj.buddyId);
        } else if (Obj.buddyAction === 'rem') {
            send_BUDDY_REMOVE(Obj.buddyId);
        }
    } else {
        for (let i = 0, len = Obj.playerArray.length; i < len; i++) {
            //Fail safe for online_filter
            if (Obj.playerArray[i]._id !== null && Obj.playerArray[i]._id.id !== null) {
                broadcastMessage(i, Obj.playerArray[i]._id._id, Prefix[Obj.channel] +
                    '<font color="#f7892a">' + Obj.message + '</font>' +
                    ' [<a href="user://' + Obj.sender + '">' + Obj.sender + '</a>]');
            }
        }
    }
    Replica.findOneAndUpdate({
        'replicaname': GlobalFn.replicaname
    }, {
        'ready': true
    }, function(err) {
        if (err) {
            winston.error(err);
        }
    });
});

function broadcastMessage(i, userId, message) {
    setTimeout(function() {
        send_MESSAGE_PRIVATE(userId, message);
    }, i * 1400);
}

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
};

handle[auth.AOCP.CLIENT_NAME] = function(data, u) {
    let userId = u.I();
    let userName = u.S();
    u.done();
    //GlobalFn.getPlayerData(userId, userName);
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

handle[auth.AOCP.GROUP_ANNOUNCE] = function(data, u) {
    var buffer = u.G();
    var channelName = u.S();
    var unknownId = u.I();
    var unknownPart = u.S();
    u.done();
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


global.send_MESSAGE_PRIVATE = function(userId, text) {
    winston.info('%s: %s -> %d', process.argv[2], text, userId);
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

global.send_BUDDY_ADD = function(userId) {
    winston.info('%s -> BUDDY_ADD_id %d', process.argv[2],userId);
    send(
        auth.AOCP.BUDDY_ADD, [
            ['I', userId],
            ['S', '\u0001']
        ]);
};

global.send_BUDDY_REMOVE = function(userId) {
    winston.info('%s -> BUDDY_REMOVE_id %d', process.argv[2],userId);
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

// Friend(Buddy) List
buddyStatus.on('online', function(userId, userStatus) {
    Player.update({
        '_id': userId
    }, {
        'lastseen': Date.now()
    });
    var addOnline = new Online();
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
