'use strict';

const Board = require('./board');
const utils = require('./utils');

module.exports = class Opening {
    constructor() {
        this.board = new Board();
        this.openingTable = {};
        this.bookLoaded = false;
        this.loadBook();
    }

    loadBook() {
        var book;

        if (process.browser) {
            book = utils.syncGETBuffer('book.bin');

            if (book) {
                this.addBook(book);
            }
        } else {
            book = utils.readFileBuffer('./book.bin');

            if (!book) {
                book = utils.readFileBuffer('./node_modules/ceruleanjs_opening_books/gm2001.bin');
            }

            if (book) {
                this.addBook(utils.bufferToArrayBuffer(book));
            }
        }
    }

    lookupRandom(board) {
        var possibleMoves = this.openingTable[board.hashString];

        if (possibleMoves) {
            var randomIndex = Math.floor(Math.random() * (possibleMoves.length - 1));
            return possibleMoves[randomIndex];
        }
    }

    addBook(book) {
        var bookDataView = new DataView(book);

        for (var byteOffset = 0; byteOffset < bookDataView.byteLength - 8; byteOffset += 8) {
            var key = utils.unsignedHexString(bookDataView.getUint32(byteOffset)) + utils.unsignedHexString(bookDataView.getUint32(byteOffset + 4));
            var move = bookDataView.getUint16(byteOffset + 8);
            var weight = bookDataView.getUint16(byteOffset + 10);
            var learn = bookDataView.getUint32(byteOffset + 12);

            if (!this.openingTable[key]) {
                this.openingTable[key] = [];
            }

            this.openingTable[key].push(move);
        }

        this.bookLoaded = true;
    }
};