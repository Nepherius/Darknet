var assert = require('assert')
var base85 = require('base85')

exports.pack = function(packSpec) {
    return Buffer.concat(packSpec.map(function(pair) {
        return packSingle[pair[0]](pair[1])
    }))
}

var packSingle = {}

packSingle.I = function(data) {
    var b = new Buffer(4)
    b.writeUInt32BE(data, 0)
    return b
}

packSingle.S = function(data) {
    var b = new Buffer(2)
    b.writeInt16BE(data.length, 0)
    return Buffer.concat([b, new Buffer(data)])
}

packSingle.G = function(data) {
    assert.ok(Buffer.isBuffer(data))
    assert.equal(data.length, 5)
    return data
}

exports.unpack = function(b) {
    //console.log("Unpack!")
    var off = 0

    var id = []
    off = unpackSingle.i(b, 0, id)

    var name = []
    off = unpackSingle.s(b, off, name)

    var level = []
    off = unpackSingle.i(b, off, level)
    var online = []
    off = unpackSingle.i(b, off, online)

    assert.equal(off, b.length)

    assert.equal(id.length, name.length)
    assert.equal(id.length, level.length)
    assert.equal(id.length, level.length)
    assert.equal(id.length, online.length)

    var chars = {}

    for (var i = 0; i < id.length; i++) {
        chars[name[i]] = {
            name: name[i],
            id: id[i],
            level: level[i],
            online: online[i]
        }
    }
    return chars
}

exports.unpackError = function(b) {
    var out = []
    unpackSingle.S(b, 0, out)
    console.log(out[0])
}


function Unpacker(b) {
    this.off = 0
    this.b = b
}

exports.Unpacker = Unpacker

Unpacker.prototype.I = function() {
    var ret = this.b.readInt32BE(this.off)
    this.off += 4
    return ret
}

Unpacker.prototype.S = function() {
    var len = this.b.readInt16BE(this.off)
    this.off += 2
    var ret = this.b.slice(this.off, this.off + len).toString()
    this.off += len
    return ret
}

Unpacker.prototype.eS = function() {
    var len = this.b.readUInt8(this.off)
    this.off += 1
    var ret = this.b.slice(this.off, this.off + len - 1).toString()
    this.off += len
    assert.ok(this.off <= this.b.length, JSON.stringify({
        off: this.off,
        length: this.b.length
    }))
    return ret
}

Unpacker.prototype.extMsg = function(ootext) {
    assert.ok(ootext.length > 0)

    if (String.fromCharCode(ootext[0]) != '~') {
        return {
            text: ootext.toString()
        }
    }

    assert.ok(ootext.length > 3)

    assert.equal(String.fromCharCode(ootext[1]), '&')
    assert.equal(String.fromCharCode(ootext[ootext.length - 1]), '~')

    var text = '<~' + ootext.slice(2, 12).toString() + '~>'

    var uu = new Unpacker(base85.decode(text, 'ascii85'))
    var cat = uu.I()



    var instance = uu.I().toString(16)

    return {
        category: cat,
        instance: instance,
        u: new Unpacker(ootext.slice(13))
    }


}


Unpacker.prototype.E = function() {
    var len = this.b.readInt16BE(this.off)
    this.off += 2
    var ret = this.b.slice(this.off, this.off + len)
    this.off += len

    return ret
}

Unpacker.prototype.G = function() {
    var ret = this.b.slice(this.off, this.off + 5)
    this.off += 5
    return ret
}

Unpacker.prototype.done = function() {
    assert.equal(this.off, this.b.length)
}

var unpackSingle = {}

unpackSingle.i = function(b, off, out) {
    var len = b.readInt16BE(off)
    off += 2

    for (var i = 0; i < len; i++) {
        out.push(b.readInt32BE(off))
        off += 4
    }

    return off
}

unpackSingle.s = function(b, off, out) {
    var len = b.readInt16BE(off)
    off += 2

    var slen

    for (var i = 0; i < len; i++) {
        slen = b.readInt16BE(off)
        off += 2

        out.push(b.slice(off, off + slen).toString())
        off += slen
    }

    return off
}

unpackSingle.S = function(b, off, out) {
    var len = b.readInt16BE(off)
    off += 2
    out.push(b.slice(off, off + len).toString())
    off += len
}

unpackSingle.I = function(b, off, out) {

}
