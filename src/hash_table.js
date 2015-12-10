'use strict';

module.exports = class HashTable {
    constructor(exponent = 16) {
        this.exponent = exponent;
        this.size = Math.pow(2, 16);
        this.table = new Array(this.size);
    }

    set(key, value) {
        this.table[key % this.size] = value;
    }

    get(key) {
        return this.table[key % this.size];
    }
};