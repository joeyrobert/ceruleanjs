'use strict';

module.exports = class HashTable {
    constructor(exponent) {
        this.exponent = exponent || 16;
        this.size = (1 << this.exponent);
        this.bits = this.size - 1;
        this.table = [];

        for (var i = 0; i < this.size; i++) {
            this.table.push([0, 0, undefined]);
        }
    }

    set(loHash, hiHash, value) {
        var entry = this.table[loHash & this.bits];
        entry[0] = loHash;
        entry[1] = hiHash;
        entry[2] = value;
    }

    get(loHash, hiHash) {
        var value = this.table[loHash & this.bits];
        return value && value[0] === loHash && value[1] === hiHash ? value[2] : undefined;
    }
};