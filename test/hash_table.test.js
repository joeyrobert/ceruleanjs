'use strict';

const expect = require('chai').expect;
const {
    HashTable,
    NativeHashTable,
    NativeSingleHashTable,
} = require('../src/hash_table');
const { getRandomInt } = require('../src/utils');

const HASH_TABLE_SIZE = 15; // 2^15 == 32768
const BENCHMARK_HASH_TABLE_SIZE = 20; // 2^20 == 1048576
const TEST_LOOPS = 500000000;

describe('hash_table', () => {
    describe('HashTable', () => {
        it('stores one value', () => {
            const table = new HashTable(HASH_TABLE_SIZE);
            table.set(0, 1, 314159);
            expect(table.get(0, 1)).to.equal(314159);
        });

        it('stores two values', () => {
            const table = new HashTable(HASH_TABLE_SIZE);
            table.set(0, 1, [314159, 265359]);
            expect(table.get(0, 1)[0]).to.equal(314159);
            expect(table.get(0, 1)[1]).to.equal(265359);
        });

        it('stores object', () => {
            const table = new HashTable(HASH_TABLE_SIZE);
            table.set(0, 1, {cool: 'nice'});
            expect(table.get(0, 1)).to.deep.equal({cool: 'nice'});
        });
    });

    describe('NativeHashTable', () => {
        it('stores one value', () => {
            const table = new NativeHashTable(HASH_TABLE_SIZE);
            table.set(0, 1, 314159);
            expect(table.get(0, 1)).to.equal(314159);
        });

        it('stores two values', () => {
            const table = new NativeHashTable(HASH_TABLE_SIZE, 2);
            table.set(0, 1, 314159, 265359);
            expect(table.get(0, 1)[0]).to.equal(314159);
            expect(table.get(0, 1)[1]).to.equal(265359);
        });

        it('stores three values', () => {
            const table = new NativeHashTable(HASH_TABLE_SIZE, 3);
            table.set(0, 1, 314159, 265358, 979324);
            expect(table.get(0, 1)[0]).to.equal(314159);
            expect(table.get(0, 1)[1]).to.equal(265358);
            expect(table.get(0, 1)[2]).to.equal(979324);
        });
    });

    describe('NativeSingleHashTable', () => {
        it('stores one value', () => {
            const table = new NativeSingleHashTable(HASH_TABLE_SIZE);
            table.set(0, 1, 314159);
            expect(table.get(0, 1)).to.equal(314159);
        });
    });

    describe('benchmark', () => {
        // decouple instantiation from benchmark
        const hashTable = new HashTable(BENCHMARK_HASH_TABLE_SIZE);
        const nativeHashTable = new NativeHashTable(BENCHMARK_HASH_TABLE_SIZE);
        const nativeSingleHashTable = new NativeSingleHashTable(BENCHMARK_HASH_TABLE_SIZE);

        it('benchmark HashTable', () => {
            // Set first
            for (var i = 0; i < TEST_LOOPS; i++) {
                hashTable.set(i, i, i);
            }

            // Get second
            for (var i = 0; i < TEST_LOOPS; i++) {
                hashTable.get(i, i);
            }
        });

        it('benchmark NativeHashTable', () => {
            // Set first
            for (var i = 0; i < TEST_LOOPS; i++) {
                nativeHashTable.set(i, i, i);
            }

            // Get second
            for (var i = 0; i < TEST_LOOPS; i++) {
                nativeHashTable.get(i, i);
            }
        });

        it('benchmark NativeSingleHashTable', () => {
            // Set first
            for (var i = 0; i < TEST_LOOPS; i++) {
                nativeSingleHashTable.set(i, i, i);
            }

            // Get second
            for (var i = 0; i < TEST_LOOPS; i++) {
                nativeSingleHashTable.get(i, i);
            }
        });
    });
});