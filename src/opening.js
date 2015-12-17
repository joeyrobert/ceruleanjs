'use strict';

const fs = require('fs');
const MersenneTwister = require('mersennetwister');
const HashTable = require('./hash_table');
const PGN = require('./pgn');
const Board = require('./board');

module.exports = class Opening {
    constructor() {
        this.board = new Board();
        this.openingTable = new HashTable(14);
        // this.addPgn(fs.readFileSync('./suites/pgn/adams.pgn', 'utf-8'));
        this.addBok(fs.readFileSync('./suites/bok/small.bok', 'utf-8'));
        this.mt = new MersenneTwister();
    }

    addPgn(pgnText) {
        var pgn = new PGN(pgnText);
        pgn.games.forEach(game => {

        });
    }

    addBok(bokText) {
        var lines = bokText.split('\n');
        var moveCount = 0;

        lines.forEach(line => {
            var moveStrings = this.chunkString(line, 4);

            moveStrings.forEach(moveString => {
                var moves = this.openingTable.get(this.board.loHash, this.board.hiHash) || [];
                moves.push(moveString);
                moves = moves.filter(this.onlyUnique);
                this.openingTable.set(this.board.loHash, this.board.hiHash, moves);
                this.board.addMoveString(moveString);
                moveCount++;
            });

            moveStrings.forEach(() => this.board.subtractMove());
        });
    }

    lookupRandom(loHash, hiHash) {
        var possibleMoves = this.openingTable.get(loHash, hiHash);
        return possibleMoves && possibleMoves[this.mt.int31() % possibleMoves.length];
    }

    chunkString(str, len) {
        var s = Math.ceil(str.length / len),
            ret = new Array(s),
            offset;

        for (var i = 0; i < s; i++) {
            offset = i * len;
            ret[i] = str.substring(offset, offset + len);
        }

        return ret;
    }


    onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }
};