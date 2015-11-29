'use strict';

const constants = require('./constants');
const utils = require('./utils');

module.exports = class Board {
    constructor() {
        this.emptyBoard();
        this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        this.generateMoves();
    }

    emptyBoard() {
        this.moves = [];
        this.pieces = [[], []];
        this.board = new Array(constants.WIDTH * constants.HEIGHT);
        this.castling = [false, false, false, false]; // KQkq
        this.enPassant = false;
        this.turn = constants.WHITE;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;

        // Set legal board empty
        for (let rankIndex = 1; rankIndex <= 8; rankIndex++) {
            for (let fileIndex = 1; fileIndex <= 8; fileIndex++) {
                let index = this.rankFileToIndex(rankIndex, fileIndex);
                this.board[index] = constants.PIECE_MAP.empty;
            }
        }
    }

    get fen() {
        let board = [];

        for (let rankIndex = 8; rankIndex >= 1; rankIndex--) {
            let fileOffset = 0;
            let rankBoard = '';

            for (let fileIndex = 1; fileIndex <= 8; fileIndex++) {
                let index = this.rankFileToIndex(rankIndex, fileIndex);

                if (this.board[index]) {
                    if (fileOffset > 0) {
                        rankBoard += fileOffset;
                        fileOffset = 0;
                    }

                    let piece = constants.INVERSE_PIECE_MAP[this.board[index] & constants.JUST_PIECE];

                    if (this.board[index] % 2 === 0) {
                        piece = piece.toUpperCase();
                    }

                    rankBoard += piece;
                } else {
                    fileOffset++;
                }
            }

            if (fileOffset > 0)
                rankBoard += fileOffset;

            board.push(rankBoard);
        }

        board = board.join('/');
        let turn = this.turn === constants.WHITE ? 'w' : 'b';
        let castling = this.castling.reduce((memo, castle, index) => {
            if (castle) {
                memo = memo + constants.INVERSE_CASTLING[index];
            }
            return memo;
        }, '') || '-';
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
            let fileIndex = 1;
            let rankIndex = 8 - invertedRankIndex;
            let pieces = rank.split('');

            pieces.forEach(piece => {
                if (utils.isNumeric(piece)) {
                    fileIndex += parseInt(piece, 10);
                } else {
                    let turn = piece.toUpperCase() === piece ? constants.WHITE : constants.BLACK;
                    this.addPiece(rankIndex, fileIndex, piece, turn);
                    fileIndex++;
                }
            });
        });

        this.turn = parts[1] === 'w' ? constants.WHITE : constants.BLACK;
        this.castling = [false, false, false, false];

        parts[2].split('').forEach(castling => {
            if (castling === '-') {
                return;
            }

            this.castling[constants.CASTLING[castling]] = true;
        });

        this.enPassant = parts[3] === '-' ? null : this.algebraicToIndex(parts[3]);
        this.halfMoveClock = parseInt(parts[4], 10);
        this.fullMoveNumber = parseInt(parts[5], 10);
    }

    addPiece(rankIndex, fileIndex, piece, turn) {
        let index = this.rankFileToIndex(rankIndex, fileIndex);
        this.pieces[turn].push(index);
        this.board[index] = constants.PIECE_MAP[piece.toLowerCase()] | turn;
    }

    rankFileToIndex(rankIndex, fileIndex) {
        return rankIndex*15 + fileIndex + 17;
    }

    indexToRank(index) {
        return Math.floor(index / 15 - 1);
    }

    indexToFile(index) {
        return (index - 3) % 15 + 1;
    }

    algebraicToIndex(algebraic) {
        let splitted = algebraic.split('');
        let fileIndex = splitted[0].charCodeAt(0) - 96;
        let rankIndex = parseInt(splitted[1], 10);
        return this.rankFileToIndex(rankIndex, fileIndex);
    }

    indexToAlgebraic(index) {
        let fileIndex = this.indexToFile(index);
        let rankIndex = this.indexToRank(index);
        return String.fromCharCode(96 + fileIndex) + rankIndex;
    }

    addMove(move) {
        this.moves.push(move);
    }

    subtractMove() {
        this.moves.pop();
    }

    // Move format is as follows: [from, to, promotion]
    generateMoves() {
        let pieces = this.pieces[this.turn];
        let moves = [];
        let newMove;

        // Piece moves
        for (let i = 0; i < pieces.length; i++) {
            let index = pieces[i];
            let piece = this.board[index] - this.turn;

            switch (piece) {
                case constants.PIECE_MAP.p:
                    moves = moves.concat(this.pawnMoves(index));
                    break;
                case constants.PIECE_MAP.n:
                    moves = moves.concat(this.deltaMoves(constants.DELTA_KNIGHT, index));
                    break;
                case constants.PIECE_MAP.b:
                    moves = moves.concat(this.slidingMoves(constants.DELTA_BISHOP));
                    break;
                case constants.PIECE_MAP.r:
                    moves = moves.concat(this.slidingMoves(constants.DELTA_ROOK));
                    break;
                case constants.PIECE_MAP.q:
                    moves = moves.concat(this.slidingMoves(constants.DELTA_BISHOP)).concat(this.slidingMoves(constants.DELTA_ROOK));
                    break;
                case constants.PIECE_MAP.k:
                    moves = moves.concat(this.deltaMoves(constants.DELTA_KING, index));
                    break;
            }
        }

        // Castling
    }

    pawnMoves(index) {
        let moves = [];
        let lastRank = this.turn ? 1 : 8;
        let firstRank = this.turn ? 7 : 2;

        // Regular push
        let newMove = index + 15 - 30 * this.turn;
        if (this.board[newMove]) {
            if (this.indexToRank(newMove) === lastRank) {
                moves.push([index, newMove, constants.PIECE_MAP.q]);
                moves.push([index, newMove, constants.PIECE_MAP.r]);
                moves.push([index, newMove, constants.PIECE_MAP.b]);
                moves.push([index, newMove, constants.PIECE_MAP.n]);
            } else {
                moves.push([index, newMove]);
            }
        }

        // Double push
        newMove = index + 30 - 60 * this.turn;
        if (this.board[newMove] &&
            this.board[newMove] === constants.PIECE_MAP.empty &&
            this.board[index + 15  - 30 * this.turn] === constants.PIECE_MAP.empty &&
            this.indexToRank(index) === firstRank) {
            moves.push([index, newMove]);
        }

        for (let j = 0; j <= 2; j = j + 2) {
            // Captures
            newMove = index + (16 + j - 1) * this.turn;
            if (this.board[newMove] && this.board[newMove] & constants.JUST_TURN !== this.turn) {
                if (this.indexToRank(newMove) === lastRank) {
                    moves.push([index, newMove, constants.PIECE_MAP.q]);
                    moves.push([index, newMove, constants.PIECE_MAP.r]);
                    moves.push([index, newMove, constants.PIECE_MAP.b]);
                    moves.push([index, newMove, constants.PIECE_MAP.n]);
                } else {
                    moves.push([index, newMove]);
                }
            }

            // En passant
            if (this.board[newMove] && newMove === this.enPassant) {
                moves.push([index, newMove]);
            }
        }

        return moves;
    }

    deltaMoves(deltas, index) {
        let moves = [];

        for (let j = 0; j < deltas.length; j++) {
            let newMove = index + deltas[j];
            if (this.board[newMove] && this.board[newMove] !== this.turn) {
                moves.push([index, newMove]);
            }
        }

        return moves;
    }

    slidingMoves(deltas, index) {
        let moves = [];

        for (let i = 0; i < deltas.length; i++) {
            let newMove = index;

            do {
                newMove += deltas[i];
                if (!this.board[newMove] || this.board[newMove] & this.constants.JUST_TURN === this.turn) {
                    break;
                }

                if (this.board[newMove] === constants.PIECE_MAP.empty || this.board[newMove] & this.constants.JUST_TURN !== this.turn) {
                    moves.push([index, newMove]);
                } else {
                    break;
                }
            } while(true);
        }

        return moves;
    }
};