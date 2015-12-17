'use strict';

module.exports = class HashTable {
    constructor(exponent) {
        this.exponent = exponent || 16;
        this.size = Math.pow(2, this.exponent);
        this.table = [];

        for (var i = 0; i < this.size; i++) {
            this.table.push([0, 0, undefined]);
        }
    }

    add(loHash, hiHash, depth, value) {
        var oldValue = this.get(loHash, hiHash) || {};
        oldValue[depth] = value;
        this.set(loHash, hiHash, oldValue);
    }

    set(loHash, hiHash, value) {
        var entry = this.table[loHash % this.size];
        entry[0] = loHash;
        entry[1] = hiHash;
        entry[2] = value;
    }

    get(loHash, hiHash) {
        var value = this.table[loHash % this.size];
        return value && value[0] === loHash && value[1] === hiHash ? value[2] : undefined;
    }
};