'use strict';

const constants = require('./constants');
const utils = require('./utils');
const PieceList = require('./piece_list');

module.exports = class Board {
    constructor() {
        this.emptyBoard();
        this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }

    emptyBoard() {
        this.history = [];
        this.pieces = [new PieceList(), new PieceList()];
        this.board = new Array(constants.WIDTH * constants.HEIGHT);
        this.castling = 0;
        this.enPassant = false;
        this.turn = constants.WHITE;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.kings = [];

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

                if (this.board[index] !== constants.PIECE_MAP.empty) {
                    if (fileOffset > 0) {
                        rankBoard += fileOffset;
                        fileOffset = 0;
                    }

                    let piece = constants.INVERSE_PIECE_MAP[this.board[index] & constants.JUST_PIECE];

                    if (this.board[index] % 2 === constants.WHITE) {
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
        let turn = this.turn ? 'b' : 'w';
        let castling = '';

        if (this.castling) {
            if (this.castling & constants.CASTLING_W_K) castling += 'K';
            if (this.castling & constants.CASTLING_W_Q) castling += 'Q';
            if (this.castling & constants.CASTLING_B_K) castling += 'k';
            if (this.castling & constants.CASTLING_B_Q) castling += 'q';
        } else {
            castling += '-';
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
        this.castling = 0;

        parts[2].split('').forEach(castling => {
            if (castling === '-') {
                return;
            }

            this.castling += constants.CASTLING[castling];
        });

        this.enPassant = parts[3] === '-' ? null : this.algebraicToIndex(parts[3]);
        this.halfMoveClock = parseInt(parts[4], 10);
        this.fullMoveNumber = parseInt(parts[5], 10);
    }

    addPiece(rankIndex, fileIndex, piece, turn) {
        let index = this.rankFileToIndex(rankIndex, fileIndex);
        let pieceValue = constants.PIECE_MAP[piece.toLowerCase()];
        this.pieces[turn].push(index);
        this.board[index] = pieceValue | turn;
        if (pieceValue === constants.PIECE_MAP.k) {
            this.kings[turn] = index;
        }
    }

    rankFileToIndex(rankIndex, fileIndex) {
        return rankIndex * 15 + fileIndex + 17;
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
        let from = move[0];
        let to = move[1];
        let opponentTurn = (this.turn + 1) % 2;
        let pawnDirection = this.turn ? -1 : 1;
        this.history.push([move, this.board[to], this.enPassant, this.castling]);

        if (this.board[to] !== constants.PIECE_MAP.empty) {
            this.pieces[opponentTurn].remove(to);
        }

        if (to === this.enPassant && (this.board[from] & constants.JUST_PIECE) === constants.PIECE_MAP.p) {
            let destroyedPawn = to + -1 * pawnDirection * 15;
            this.pieces[opponentTurn].remove(destroyedPawn);
            this.board[destroyedPawn] = constants.PIECE_MAP.empty;
        }

        this.movePiece(from, to);

        if (move[2]) {
            this.board[to] = move[2] | this.turn;
        }

        let castledThroughCheck = false;

        if (move[3]) {
            let rookMove = this.rookMovesForCastle(this.turn, from, to);
            this.movePiece(rookMove[0], rookMove[1]);
            let direction = to > from ? 1 : -1;

            for (let kingIndex = from; kingIndex !== to; kingIndex += direction) {
                if (this.isAttacked(kingIndex, opponentTurn)) {
                    castledThroughCheck = true;
                    break;
                }
            }
        }

        if ((this.board[to] & constants.JUST_PIECE) === constants.PIECE_MAP.p && from + 30 * pawnDirection === to) {
            this.enPassant = from + 15 * pawnDirection;
        } else {
            this.enPassant = undefined;
        }

        if ((this.board[to] & constants.JUST_PIECE) === constants.PIECE_MAP.k) {
            this.kings[this.turn] = to;
        }

        for (let i = 0; i < 4; i++) {
            let castlingPieces = constants.CASTLING_PIECES[i];
            if ((this.castling & castlingPieces[2]) && (from == castlingPieces[0] || to == castlingPieces[1] || from == castlingPieces[1])) {
                this.castling -= castlingPieces[2];
            }
        }

        let oldTurn = this.turn;
        this.turn = opponentTurn;

        if (castledThroughCheck || this.isInCheck(oldTurn)) {
            this.subtractMove();
            return false;
        }

        return true;
    }

    rookMovesForCastle(turn, from, to) {
        for (let i = 0; i < 2; i++) {
            let castlingIndex = i + turn * 2;
            let castlingTo = constants.CASTLING_INDEX[castlingIndex][1];

            if (to === castlingTo && from === constants.CASTLING_MAP[castlingTo]) {
                let rookTo = to + (to > from ? -1 : 1);
                let rookFrom = to + (to > from ? 1 : -2);
                return [rookFrom, rookTo];
            }
        }
    }

    subtractMove() {
        let history = this.history.pop();
        let from = history[0][0];
        let to = history[0][1];
        let opponentTurn = this.turn;
        this.turn = (this.turn + 1) % 2;
        this.movePiece(to, from);
        this.board[to] = history[1];
        this.enPassant = history[2];
        this.castling = history[3];

        if (this.board[to] !== constants.PIECE_MAP.empty) {
            this.pieces[opponentTurn].push(to);
        }

        if ((this.board[from] & constants.JUST_PIECE) === constants.PIECE_MAP.k) {
            this.kings[this.turn] = from;
        }

        if (to === this.enPassant && (this.board[from] & constants.JUST_PIECE) === constants.PIECE_MAP.p) {
            let pawnDirection = this.turn ? -1 : 1;
            let destroyedPawn = to + -1 * pawnDirection * 15;
            this.pieces[opponentTurn].push(destroyedPawn);
            this.board[destroyedPawn] = constants.PIECE_MAP.p | opponentTurn;
        }

        if (history[0][3]) {
            let rookMove = this.rookMovesForCastle(this.turn, from, to);
            this.movePiece(rookMove[1], rookMove[0]);
        }
    }

    movePiece(from, to) {
        this.pieces[this.turn].remove(from);
        this.pieces[this.turn].push(to);
        this.board[to] = this.board[from];
        this.board[from] = constants.PIECE_MAP.empty;
    }

    addMoveString(moveString) {
        let from = this.algebraicToIndex(moveString.slice(0, 2));
        let to = this.algebraicToIndex(moveString.slice(2, 4));
        let capture = constants.PIECE_MAP[moveString[5]];
        let castling = false;

        Object.keys(constants.CASTLING_MAP).forEach(castlingTo => {
            if (to === parseInt(castlingTo, 10) && from === constants.CASTLING_MAP[castlingTo]) {
                castling = true;
            }
        });

        let move = [from, to, capture, castling];
        this.addMove(move);
    }

    // Move format is as follows: [from, to, promotion]
    generateMoves() {
        let pieces = this.pieces[this.turn];
        let moves = [];
        let newMove;

        // Piece moves
        for (let i = 0; i < pieces.length; i++) {
            let index = pieces.indices[i];
            let piece = this.board[index] & constants.JUST_PIECE;

            switch (piece) {
                case constants.PIECE_MAP.p:
                    moves = moves.concat(this.pawnMoves(index));
                    break;
                case constants.PIECE_MAP.n:
                    moves = moves.concat(this.deltaMoves(constants.DELTA_KNIGHT, index));
                    break;
                case constants.PIECE_MAP.b:
                    moves = moves.concat(this.slidingMoves(constants.DELTA_BISHOP, index));
                    break;
                case constants.PIECE_MAP.r:
                    moves = moves.concat(this.slidingMoves(constants.DELTA_ROOK, index));
                    break;
                case constants.PIECE_MAP.q:
                    moves = moves.concat(this.slidingMoves(constants.DELTA_BISHOP, index)).concat(this.slidingMoves(constants.DELTA_ROOK, index));
                    break;
                case constants.PIECE_MAP.k:
                    moves = moves.concat(this.deltaMoves(constants.DELTA_KING, index));
                    break;
            }
        }

        // Castling
        moves = moves.concat(this.castlingMoves());

        return moves;
    }

    movesString() {
        let moves = this.generateMoves();
        return moves.map(move => this.moveToString(move)).join('\n');
    }

    moveToString(move) {
        return this.indexToAlgebraic(move[0]) +
            this.indexToAlgebraic(move[1]) +
            (move[2] ? constants.INVERSE_PIECE_MAP[move[2]] : '');
    }

    pawnMoves(index) {
        let moves = [];
        let lastRank = this.turn ? 1 : 8;
        let firstRank = this.turn ? 7 : 2;

        // Regular push
        let newMove = index + 15 - 30 * this.turn;
        if (this.board[newMove] === constants.PIECE_MAP.empty) {
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
        if (this.board[newMove] === constants.PIECE_MAP.empty &&
            this.board[index + 15  - 30 * this.turn] === constants.PIECE_MAP.empty &&
            this.indexToRank(index) === firstRank) {
            moves.push([index, newMove]);
        }

        for (let j = 0; j < 2; j++) {
            // Captures
            newMove = index + (14 + 2 * j) * (this.turn ? -1 : 1);
            if (this.board[newMove] && this.board[newMove] !== constants.PIECE_MAP.empty && this.board[newMove] % 2 !== this.turn) {
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
            if (newMove === this.enPassant) {
                moves.push([index, newMove]);
            }
        }

        return moves;
    }

    deltaMoves(deltas, index) {
        let moves = [];

        for (let j = 0; j < deltas.length; j++) {
            let newMove = index + deltas[j];
            if (this.board[newMove] &&
                (this.board[newMove] === constants.PIECE_MAP.empty ||
                this.board[newMove] % 2 !== this.turn)) {
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

                if (this.board[newMove] &&
                    (this.board[newMove] === constants.PIECE_MAP.empty ||
                    this.board[newMove] % 2 !== this.turn)) {
                    moves.push([index, newMove]);
                }

                if (this.board[newMove] !== constants.PIECE_MAP.empty) {
                    break;
                }
            } while (true);
        }

        return moves;
    }

    castlingMoves() {
        let moves = [];
        let index = this.turn ? 142 : 37;

        castleLoop:
        for (let i = 0; i < 2; i++) {
            let castlingIndex = i + this.turn * 2;
            let castlingInfo = constants.CASTLING_INDEX[castlingIndex];

            if (this.castling & castlingInfo[0]) {
                let newMove = castlingInfo[1];
                let numberOffset = castlingIndex % 2 === 0 ? 2 : 3;
                let direction = castlingIndex % 2 === 0 ? 1 : -1;

                for (let j = 1; j <= numberOffset; j++) {
                    let indexToCheck = index + j * direction;
                    if (this.board[indexToCheck] !== constants.PIECE_MAP.empty) {
                        continue castleLoop;
                    }
                }

                moves.push([index, newMove, undefined, true]);
            }
        }

        return moves;
    }

    isInCheck(turn) {
        return this.isAttacked(this.kings[turn], (turn + 1) % 2);
    }

    isAttacked(index, turn) {
        let newMove;

        // Pawns
        for (let j = 0; j < 2; j++) {
            newMove = index + (14 + 2 * j) * (turn ? 1 : -1);
            if (this.board[newMove] &&
                this.board[newMove] % 2 === turn &&
                (this.board[newMove] & constants.JUST_PIECE) === constants.PIECE_MAP.p) {
                return true;
            }
        }

        // Sliding attacks
        for (let k = 0; k < 2; k++) {
            let deltas = constants.DELTA_MAP[k][0];
            let deltaPiece = constants.DELTA_MAP[k][1];

            for (let j = 0; j < 4; j++) {
                newMove = index;
                do {
                    newMove += deltas[j];
                    if (this.board[newMove] % 2 === turn &&
                        ((this.board[newMove] & constants.JUST_PIECE) === deltaPiece ||
                            (this.board[newMove] & constants.JUST_PIECE) === constants.PIECE_MAP.q)) {
                        return true;
                    }

                    if (this.board[newMove] !== constants.PIECE_MAP.empty) {
                        break;
                    }

                } while (true);
            }
        }

        // Delta attacks
        for (let k = 2; k < 4; k++) {
            let deltas = constants.DELTA_MAP[k][0];
            let deltaPiece = constants.DELTA_MAP[k][1];

            for (let j = 0; j < 8; j++) {
                newMove = deltas[j] + index;
                if (this.board[newMove] &&
                    this.board[newMove] % 2 === turn &&
                    (this.board[newMove] & constants.JUST_PIECE) === deltaPiece) {
                    return true;
                }
            }
        }

        return false;
    }
};