const fs = require('fs');
const assert = require('assert');
const bignum = require('bignum');
const crypto = require('crypto');
const winston = require('winston');

const AOCP = {
    LOGIN_SEED: 0,
    LOGIN_REQUEST: 2,
    LOGIN_SELECT: 3,
    LOGIN_OK: 5,
    LOGIN_ERROR: 6,
    LOGIN_CHARLIST: 7,
    CLIENT_NAME: 20,
    CLIENT_LOOKUP: 21,
    MESSAGE_PRIVATE: 30,
    MESSAGE_VICINITY: 34,
    MESSAGE_VICINITYA: 35,
    MESSAGE_SYSTEM: 36,
    CHAT_NOTICE: 37,
    BUDDY_ADD: 40,
    BUDDY_REMOVE: 41,
    ONLINE_SET: 42,
    PRIVGRP_INVITE: 50,
    PRIVGRP_KICK: 51,
    PRIVGRP_JOIN: 52,
    PRIVGRP_PART: 53,
    PRIVGRP_KICKALL: 54,
    PRIVGRP_CLIJOIN: 55,
    PRIVGRP_CLIPART: 56,
    PRIVGRP_MESSAGE: 57,
    PRIVGRP_REFUSE: 58,
    GROUP_ANNOUNCE: 60,
    GROUP_MESSAGE: 65,
    PING: 100
};


var test = false;
var xtest = true;
    //winston.debug(data)
    //
function isInteger(n) {
    return n === +n && n === (n | 0);
}

function parse_packet(b) {
    if (b.length < 4) {
        return {
            remains: b
        };
    }
    var type = b.readInt16BE(0);
    var len = b.readInt16BE(2);

    if (len + 4 <= b.length) {
        return {
            type: type,
            data: b.slice(4, 4 + len),
            remains: b.slice(4 + len)
        };
    } else {
        return {
            remains: b
        };
    }
}

exports.assemble_packet = function(type, data) {
    assert.ok(isInteger(type), 'assemble_packet: packet type is not an integer. Probably it is missing from auth.AOCP hash');
    return Buffer.concat([bufInt16BE(type), bufInt16BE(data.length), data]);
};

exports.parse_packet = parse_packet;
exports.AOCP = AOCP;

function bufInt16BE(i) {
    var b = new Buffer(2);
    b.writeInt16BE(i, 0);
    return b;
}



function str_repeat(str, size) {
    var r = '';
    for (var i = 0; i < size; i++) {
        r += str;
    }
    return r;
}

function fromHex(hex) {
    return new bignum(hex, 16);
}

function generate_login_key(serverseed, username, password) {
    var dhY = fromHex("9c32cc23d559ca90fc31be72df817d0e124769e809f936bc14360ff4bed758f260a0d596584eacbbc2b88bdd410416163e11dbf62173393fbc0c6fefb2d855f1a03dec8e9f105bbad91b3437d8eb73fe2f44159597aa4053cf788d2f9d7012fb8d7c4ce3876f7d6cd5d0c31754f4cd96166708641958de54a6def5657b9f2e92");
    var dhN = fromHex("eca2e8c85d863dcdc26a429a71a9815ad052f6139669dd659f98ae159d313d13c6bf2838e10a69b6478b64a24bd054ba8248e8fa778703b418408249440b2c1edd28853e240d8a7e49540b76d120d3b1ad2878b1b99490eb4a2a5e84caa8a91cecbdb1aa7c816e8be343246f80c637abc653b893fd91686cf8d32d6cfe5f2a6f");
    var dhG = fromHex("05");

    var dhx = bignum.fromBuffer(crypto.pseudoRandomBytes(256 / 8));

    if (xtest) {
        dhx = fromHex('003876601271de8ab18761c925a39bce100e56d491e2630ef2e35e06c48992bf');
    }
    var dhX = dhG.powm(dhx, dhN);
    var dhK = dhY.powm(dhx, dhN);


    var str = [username, serverseed, password].join('|');


    dhK = dhK.toString(16);

    if (dhK.length < 32) {
        while (dhK.length < 32) {
            dhK = '0' + dhK;
        }
    } else {
        dhK = dhK.substring(0, 32);
    }
    if (test) {

        assert.equal(dhK, 'b188e3cacca6972ba7e6bdabe47c2146');
        assert.equal(dhX.toString(16), '832fd5cc0f5877423b4b2bca740cd33c82c1bfbce819ee4e71e4ed3d63227af7d3a9c16ad981204dd7bc75b82629d95ad12ad37bb7a87c6ac5af70dc6d756773f5d4f3100e60c502bc84781ab59fb7db61aadff75c285478c6c903a80d1a24a042ad483eee4bccec58bf671446fd77c302dde684eb7211cf525ed5046edc44eb');
    }
    var key = fromHex(dhK).toBuffer();
    var prefix = crypto.pseudoRandomBytes(64 / 8);
    if (xtest) {
        prefix = new Buffer('2113b70280ad6e9a', 'hex');
    }
    var length = 8 + 4 + str.length;
    var pad = new Buffer(str_repeat(" ", (8 - length % 8) % 8));
    var strlen = new Buffer(4);
    strlen.writeUInt32BE(str.length, 0);
    var plain = Buffer.concat([prefix, strlen, new Buffer(str), pad]);
    if (test) {
        assert.equal(plain.toString('hex'), "2113b70280ad6e9a0000000b6261727c666f6f7c62617a20");
    }
    var crypted = aochat_crypt(key, plain);

    if (test) {

        winston.debug(crypted.toString('hex'));
        winston.debug('0f8596dd08fd009cf7f4c33bb4411c16cadea63e7b16ca7b expected');
    }

    return dhX.toString(16) + '-' + crypted.toString('hex');

}

function key_arr(key) {
    assert.equal(key.length % 4, 0);

    var a = new Array();
    for (var i = 0; i < key.length; i += 4) {
        a.push(key.readInt32LE(i));
    }
    return a;
}

function aochat_crypt(key, str) {
    assert.equal(key.length, 16); // in bytes, not in nibbles as in PHP
    assert.equal(str.length % 8, 0);

    var now = [0, 0];
    var prev = [0, 0];
    var ret = new Buffer(str.length);

    var keyarr = key_arr(key);

    var dataarr = key_arr(str);
    if (test) {
        assert.deepEqual(keyarr, [-891057999, 731358924, -1413618009, 1176599780]);
    }
    var off = 0;

    var put = function(c) {
        ret.writeInt32LE(m(c), off);
        off += 4;
    };

    for (var i = 0; i < dataarr.length; i += 2) {

        now[0] = m(m(dataarr[i]) ^ m(prev[0]));
        now[1] = m(m(dataarr[i + 1]) ^ m(prev[1]));

        aocrypt_permute(now, keyarr, prev);

        put(prev[0]);
        put(prev[1]);
    }
    return ret;
}


function hex(x) {
    return new bignum(x).toString(16);
}

function m(x) {
    return x & 0xFFFFFFFF;
}

function aocrypt_permute(cycle, key, prev) {
    assert.equal(cycle.length, 2);
    assert.equal(key.length, 4, 'key');

    var a = cycle[0];
    var b = cycle[1];
    var sum = 0;
    var delta = 0x9e3779b9;
    //var i = 32;

    for (var i = 0; i < 32; i++) {
        sum = m(sum + delta);
        a += m((b << 4 & 0xfffffff0) + key[0]) ^ m(b + sum) ^ m((b >> 5 & 0x7ffffff) + key[1]);
        b += m((a << 4 & 0xfffffff0) + key[2]) ^ m(a + sum) ^ m((a >> 5 & 0x7ffffff) + key[3]);
    }
    prev[0] = (a);
    prev[1] = (b);
}

// generate_login_key("foo", "bar", "baz")

exports.generate_login_key = generate_login_key;
