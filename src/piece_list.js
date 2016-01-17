'use strict';

const constants = require('./constants');

class PieceList {
    constructor() {
        this.indices = new Uint32Array(16);
        this.reverse = new Uint32Array(constants.WIDTH * constants.HEIGHT);
        this.length = 0;
    }

    push(index) {
        this.reverse[index] = this.length;
        this.indices[this.length] = index;
        this.length++;
    }

    remove(index) {
        this.length--;
        var reverseIndex = this.reverse[index];
        this.indices[reverseIndex] = this.indices[this.length];
        this.reverse[this.indices[reverseIndex]] = reverseIndex;
        this.indices[this.length] = undefined;
        this.reverse[index] = undefined;
    }
}

class BoardPieceList {
    constructor(board) {
        this.indices = new Uint32Array(16);
        this.reverse = new Uint32Array(constants.WIDTH * constants.HEIGHT);
        this.length = 0;

        this.indexToPiece = new Uint32Array(constants.WIDTH * constants.HEIGHT);
        this.board = board;
        this.pieces = [];
        this.pieces[constants.PAWN]     = new PieceList();
        this.pieces[constants.KNIGHT]   = new PieceList();
        this.pieces[constants.BISHOP]   = new PieceList();
        this.pieces[constants.ROOK]     = new PieceList();
        this.pieces[constants.QUEEN]    = new PieceList();
        this.pieces[constants.KING]     = new PieceList();
    }

    push(index) {
        this.reverse[index] = this.length;
        this.indices[this.length] = index;
        this.length++;
        var piece = this.board.board[index] & constants.JUST_PIECE;
        this.indexToPiece[index] = piece;
        this.pieces[piece].push(index);
    }

    remove(index) {
        this.length--;
        var reverseIndex = this.reverse[index];
        this.indices[reverseIndex] = this.indices[this.length];
        this.reverse[this.indices[reverseIndex]] = reverseIndex;
        this.indices[this.length] = undefined;
        this.reverse[index] = undefined;
        var piece = this.indexToPiece[index];
        this.pieces[piece].remove(index);
        this.indexToPiece[index] = undefined;
    }
}

module.exports = {
    PieceList,
    BoardPieceList
};