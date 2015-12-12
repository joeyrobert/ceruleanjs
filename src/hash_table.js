'use strict';

module.exports = class HashTable {
    constructor(exponent) {
        this.exponent = exponent || 16;
        this.size = Math.pow(2, this.exponent);
        this.table = new Array(this.size);
    }

    add(key, depth, value) {
        var oldValue = this.get(key) || {};
        oldValue[depth] = value;
        this.set(key, oldValue);
    }

    set(key, value) {
        this.table[key % this.size] = [key, value];
    }

    get(key) {
        var value = this.table[key % this.size];
        return value && value[0] === key ? value[1] : undefined;
    }
};