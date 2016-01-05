'use strict';

const MersenneTwister = require('mersennetwister');
const PGN = require('./pgn');
const Board = require('./board');
const utils = require('./utils');

module.exports = class Opening {
    constructor() {
        this.board = new Board();
        this.mt = new MersenneTwister();
        this.openingTable = {};
        this.bookLoaded = false;
        this.loadBook();
    }

    loadBook() {
        var json, book;

        // Try JSON first, then go to BOK
        if (process.browser) {
            json = utils.syncGET('book.json');

            if (!json) {
                book = utils.syncGET('book.bok');
            }
        } else {
            json = utils.readFile('./book.json');

            if (!json) {
                json = utils.readFile('./suites/json/large.json');
            }

            if (!json) {
                book = utils.readFile('./book.bok');

                if (!book) {
                    book = utils.readFile('./suites/bok/large.bok');
                }
            }
        }

        if (json) {
            this.addJSON(json);
            this.bookLoaded = true;
        } else if (book) {
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
        var openingTable = {};

        lines.forEach(line => {
            var moveStrings = this.chunkString(line.trim(), 4);
            var moveInts = [];

            moveStrings.forEach(moveString => {
                var boardHashString = this.board.hashString;
                var moves = openingTable[boardHashString] || [];
                moves.push(moveString);
                moves = moves.filter(this.onlyUnique);
                openingTable[boardHashString] = moves;
                moveInts.push(this.board.addMoveString(moveString));
                moveCount++;
            });

            moveStrings.forEach(() => {
                this.board.subtractMove(moveInts.pop());
                this.board.subtractHistory();
            });
        });

        this.openingTable = openingTable;

        // For regeneration, run:
        // utils.writeFile('./suites/json/large.json', JSON.stringify(openingTable));
    }

    addJSON(jsonText) {
        this.openingTable = JSON.parse(jsonText);
    }

    lookupRandom(board) {
        var possibleMoves = this.openingTable[board.hashString];
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