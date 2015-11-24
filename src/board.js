'use strict';

const constants = require('./constants');
const utils = require('./utils');

module.exports = class Board {
    constructor() {
        this.emptyBoard();
        this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }

    emptyBoard() {
        this.moves = [];
        this.pieces = [];
        this.board = new Array(constants.WIDTH * constants.HEIGHT);
        this.castling = [true, true, true, true]; // KQkq
        this.enPassant = false;
        this.turn = constants.WHITE;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
    }

    addMove(move) {
        this.moves.push(move);
    }

    subtractMove() {
        this.moves.pop();
    }

    get fen() {

    }

    set fen(fen) {
        if (!constants.FEN_BOARD_REGEX.test(fen)) {
            console.log('Attempted to load invalid FEN board:', fen);
            return;
        }

        this.emptyBoard();

        var parts = fen.split(' ');
        var ranks = parts[0].split('/');

        ranks.forEach((rank, invertedRankIndex) => {
            var fileIndex = 0;
            var rankIndex = 7 - invertedRankIndex;
            var pieces = rank.split('');

            pieces.forEach(piece => {
                if (utils.isNumeric(piece))
                    fileIndex += parseInt(piece, 10);
                else {
                    let side = piece.toUpperCase() === piece ? constants.WHITE : constants.BLACK;
                    this.addPiece(rankIndex, fileIndex, piece, side);
                    fileIndex++;
                }
            });
        });
    }

    addPiece(rankIndex, fileIndex, piece, side) {
        console.log('addPiece', rankIndex, fileIndex, piece, side);
        this.pieces[side].push(this.rankFileToIndex(rankIndex, fileIndex));
    }

    rankFileToIndex(rankIndex, fileIndex) {
    }

    indexToRankFile() {

    }

    get pgn() {

    }

    set pgn(pgnRead) {

    }


};