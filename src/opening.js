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
        this.mt = new MersenneTwister();
        this.bookLoaded = false;

        var book;

        if (process.browser) {
            // Synchronous HTTP request for book
            var request = new XMLHttpRequest();
            request.open('GET', 'book.bok', false);
            request.send(null);

            if (request.status === 200) {
                book = request.responseText;
            }
        } else {
            try {
                book = fs.readFileSync('./book.bok', 'utf-8');
            } catch (err) {
                try {
                    book = fs.readFileSync('./suites/bok/small.bok', 'utf-8');
                } catch (err2) {

                }
            }
        }

        if (book) {
            this.addBok(book);
            this.bookLoaded = true;
        }
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
            var moveStrings = this.chunkString(line.trim(), 4);
            var moveInts = [];

            moveStrings.forEach(moveString => {
                var moves = this.openingTable.get(this.board.loHash, this.board.hiHash) || [];
                moves.push(moveString);
                moves = moves.filter(this.onlyUnique);
                this.openingTable.set(this.board.loHash, this.board.hiHash, moves);
                moveInts.push(this.board.addMoveString(moveString));
                moveCount++;
            });

            moveStrings.forEach(() => {
                this.board.subtractMove(moveInts.pop());
                this.board.subtractHistory();
            });
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