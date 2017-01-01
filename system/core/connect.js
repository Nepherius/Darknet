const net = require('net');
const auth = require('./chat-packet');
const pack = require('./pack');
const winston = require('winston');
const GlobalFn = require('../globals');

const DEBUG = 0;

process.on('uncaughtException', function(err) {
    console.log("uncaughtException %s", err);
    console.log(err.stack);
});

//Connect to server & auth

const s = new net.Socket();
//s.setKeepAlive(true, 60000);
exports.s = s;

exports.startBot = startBot = function(HOST, PORT) {
    winston.info('Connecting to AO...');
    s.connect(PORT, HOST, function() {
        winston.info('Connection Established!');
    });
};


exports.handle = {};

var remains = new Buffer(0);


s.on('readable', function() {
    var buf = s.read();

    try {
        remains = Buffer.concat([remains, buf]);
    } catch (e) {
        winston.error(e);
        process.exit(1);
    }

    while (parseChunk(remains));
});


function parseChunk(buf) {
    var p = auth.parse_packet(buf);
    remains = p.remains;
    if (!p.data) {
        winston.debug('Partial packet');
        return false;
    }
    winston.debug("Packet type %d", p.type);
    winston.debug(p.data.toString('hex'));
    if (p.type in exports.handle) {
        exports.handle[p.type](p.data, new pack.Unpacker(p.data));
    } else {
        winston.debug("Unknown packet type %d", p.type);
        winston.debug(p.data.toString('hex'));
    }
    return true;
}

s.on('end', function() {
    winston.info('Socket Closed');
    process.exit();
});
