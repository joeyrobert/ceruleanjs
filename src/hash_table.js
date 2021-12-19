'use strict';

const { OUT_OF_BOUNDS } = require('./constants');

class HashTable {
    constructor(exponent) {
        this.exponent = exponent || 16;
        this.size = (1 << this.exponent);
        this.bits = this.size - 1;
        this.table = [];
        this.cacheHit = 0;
        this.cacheMiss = 0;

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

        if (value && value[0] === loHash && value[1] === hiHash) {
            this.cacheHit++;
            return value[2];
        }
        this.cacheMiss++;
    }
}

class NativeHashTable {
    constructor(exponent, valuesPerEntry=1, fillValue=OUT_OF_BOUNDS) {
        this.exponent = exponent || 16;
        this.size = (1 << this.exponent);
        this.bits = this.size - 1;
        // each entry consists of [loHash, hiHash, ...value]
        this.valuesPerEntry = valuesPerEntry;
        this.multiplier = valuesPerEntry + 2;
        this.table = new Int32Array(this.multiplier * this.size);
        this.fillValue = fillValue;
        this.cacheHit = 0;
        this.cacheMiss = 0;
        this.clear();
    }

    set(loHash, hiHash, value) {
        var offset = (loHash & this.bits) * this.multiplier;
        this.table[offset] = loHash;
        this.table[offset + 1] = hiHash;
        for (var i = 0; i < this.valuesPerEntry; i++) {
            this.table[offset + 2 + i] = value[i];
        }
    }

    get(loHash, hiHash) {
        var offset = (loHash & this.bits) * this.multiplier;
        if (this.table[offset] === loHash && this.table[offset + 1] === hiHash) {
            this.cacheHit++;
            if (this.valuesPerEntry === 1) {
                return this.table[offset + 2];
            }

            return this.table.subarray(offset + 2, offset + 2 + this.valuesPerEntry);
        }
        this.cacheMiss++;
    }

    clear() {
        this.table.fill(this.fillValue);
    }

    get bytes() {
        return this.size * this.multiplier * 4;
    }
}

class NativeSingleHashTable {
    constructor(exponent, fillValue=OUT_OF_BOUNDS) {
        this.exponent = exponent || 16;
        this.size = (1 << this.exponent);
        this.bits = this.size - 1;
        this.table = new Int32Array(3 * this.size);
        this.fillValue = fillValue;
        this.cacheHit = 0;
        this.cacheMiss = 0;
        this.clear();
    }

    set(loHash, hiHash, value) {
        var offset = (loHash & this.bits) * 3;
        this.table[offset] = loHash;
        this.table[offset + 1] = hiHash;
        this.table[offset + 2] = value;
    }

    get(loHash, hiHash) {
        var offset = (loHash & this.bits) * 3;

        if (this.table[offset] === loHash && this.table[offset + 1] === hiHash) {
            this.cacheHit++;
            return this.table[offset + 2];
        }
        this.cacheMiss++;
    }

    clear() {
        this.table.fill(this.fillValue);
    }

    get bytes() {
        return this.size * 3 * 4;
    }
}

module.exports = {
    HashTable,
    NativeHashTable,
    NativeSingleHashTable,
};