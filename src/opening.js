'use strict';

const fs = require('fs');
const HashTable = require('./hash_table');
const PGN = require('./pgn');

module.exports = class Opening {
    constructor() {
        this.openingTable = new HashTable(22);
        this.addPgn(fs.readFileSync('./suites/pgn/adams.pgn', 'utf-8'));
    }

    addPgn(pgnText) {
        var pgn = new PGN(pgnText);
        pgn.games.forEach(game => {

        });
    }
};