'use strict';

module.exports = class HashTable {
    constructor(exponent) {
        this.exponent = exponent || 16;
        this.size = Math.pow(2, this.exponent);
        this.table = new Array(this.size);
    }

    add(loHash, hiHash, depth, value) {
        var oldValue = this.get(loHash, hiHash) || {};
        oldValue[depth] = value;
        this.set(loHash, hiHash, oldValue);
    }

    set(loHash, hiHash, value) {
        this.table[loHash % this.size] = [loHash, hiHash, value];
    }

    get(loHash, hiHash) {
        var value = this.table[loHash % this.size];
        return value && value[0] === loHash && value[1] === hiHash ? value[2] : undefined;
    }
};