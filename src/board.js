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
        let board = [];

        for (let fileIndex = 0; fileIndex <= 7; fileIndex++) {
            let fileOffset = 0;
            let fileBoard = '';

            for (let rankIndex = 7; rankIndex >= 0; rankIndex++) {
                let index = rankFileToIndex(rankIndex, fileIndex);

                if (this.board[index]) {
                    fileBoard += fenOffset;
                    fenOffset = 0;
                    fileBoard += constants.INVERSE_PIECE_MAP[]
                } else {
                    fenOffset++;
                }
            }
            board.push(fileBoard);
        }

        board = board.join('/');
        let turn = this.turn === constants.WHITE ? 'w' : 'b';
        let castling = '';

        for (let castlingTurn = 0; castlingTurn <= 1; castlingTurn++) {
        }

        let enPassant = this.enPassant ? this.indexToAlgebraic(this.enPassant) : '-';

        return [
            board,
            turn,
            castling,
            enPassant,
            this.halfMoveClock,
            this.fullMoveNumber
        ].join(' ');
    }

    set fen(fen) {
        if (!constants.FEN_BOARD_REGEX.test(fen)) {
            console.log('Attempted to load invalid FEN board:', fen);
            return;
        }

        this.emptyBoard();
        let parts = fen.split(' ');
        let ranks = parts[0].split('/');

        ranks.forEach((rank, invertedRankIndex) => {
            let fileIndex = 0;
            let rankIndex = 7 - invertedRankIndex;
            let pieces = rank.split('');

            pieces.forEach(piece => {
                if (utils.isNumeric(piece))
                    fileIndex += parseInt(piece, 10);
                else {
                    let turn = piece.toUpperCase() === piece ? constants.WHITE : constants.BLACK;
                    this.addPiece(rankIndex, fileIndex, piece, turn);
                    fileIndex++;
                }
            });
        });

        this.turn = parts[1] === 'w' ? constants.WHITE : constants.BLACK;
        this.castling = [false, false, false, false];

        parts[2].split().forEach(castling => {
            if (item === '-') return;
            let turn = castling === castling.toUpperCase() ? constants.WHITE : constants.BLACK;
            this.castling[constants.CASTLING[castling]] = true;
        });

        this.enPassant = parts[3] === '-' ? null : this.algebraicToIndex(parts[3]);
        this.halfMoveClock = parseInt(parts[4], 10);
        this.fullMoveNumber = parseInt(parts[5], 10);
    }

    addPiece(rankIndex, fileIndex, piece, turn) {
        let index = this.rankFileToIndex(rankIndex, fileIndex);
        this.pieces[turn].push(index);
        this.board[index] = piece & turn;
    }

    rankFileToIndex(rankIndex, fileIndex) {
        return rankIndex*15 + fileIndex + 17;
    }

    indexToRank(index) {
        return (index / 15) >> 0 - 1;
    }

    indexToFile(index) {
        return (index - 3) % 15 + 1;
    }

    algebraicToIndex(algebraic) {
        let splitted = algebraic.split();
        let fileIndex = splitted[0].charCodeAt(0) - 97;
        let rankIndex = parseInt(splitted[1], 10);
        return this.rankFileToIndex(rankIndex, fileIndex);
    }

    indexToAlgebraic(index) {
        let fileIndex = this.indexToFile(index);
        let rankIndex = this.indexToRank(index);
        return String.fromCharCode(97 + fileIndex) + rankIndex;
    }
};