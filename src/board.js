'use strict';

const constants = require('./constants');
const utils = require('./utils');
const zobrist = require('./zobrist');
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
        this.hash = 0;

        // Set legal board empty
        var rankIndex, fileIndex, index;

        for (rankIndex = 1; rankIndex <= 8; rankIndex++) {
            for (fileIndex = 1; fileIndex <= 8; fileIndex++) {
                index = utils.rankFileToIndex(rankIndex, fileIndex);
                this.board[index] = constants.PIECE_MAP.empty;
            }
        }
    }

    get fen() {
        var board = [];
        var rankIndex, fileOffset, rankBoard, fileIndex, piece, index;

        for (rankIndex = 8; rankIndex >= 1; rankIndex--) {
            fileOffset = 0;
            rankBoard = '';

            for (fileIndex = 1; fileIndex <= 8; fileIndex++) {
                index = utils.rankFileToIndex(rankIndex, fileIndex);

                if (this.board[index] !== constants.PIECE_MAP.empty) {
                    if (fileOffset > 0) {
                        rankBoard += fileOffset;
                        fileOffset = 0;
                    }

                    piece = constants.INVERSE_PIECE_MAP[this.board[index] & constants.JUST_PIECE];

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
        var turn = this.turn ? 'b' : 'w';
        var castling = '';

        if (this.castling) {
            constants.CASTLING_INFO.forEach((castlingInfo, castlingIndex) => {
                if (this.castling & constants.CASTLING_INFO[castlingIndex][0]) {
                    castling += castlingInfo[5];
                }
            });
        } else {
            castling += '-';
        }

        var enPassant = this.enPassant ? utils.indexToAlgebraic(this.enPassant) : '-';

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
        var parts = fen.split(' ');
        var ranks = parts[0].split('/');

        ranks.forEach((rank, invertedRankIndex) => {
            var fileIndex = 1;
            var rankIndex = 8 - invertedRankIndex;
            var pieces = rank.split('');

            pieces.forEach(piece => {
                if (utils.isNumeric(piece)) {
                    fileIndex += parseInt(piece, 10);
                } else {
                    var turn = piece.toUpperCase() === piece ? constants.WHITE : constants.BLACK;
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

        this.enPassant = parts[3] === '-' ? null : utils.algebraicToIndex(parts[3]);
        this.halfMoveClock = parseInt(parts[4], 10);
        this.fullMoveNumber = parseInt(parts[5], 10);
        this.hash = this.generateHash();
    }

    addPiece(rankIndex, fileIndex, piece, turn) {
        var index = utils.rankFileToIndex(rankIndex, fileIndex);
        var pieceValue = constants.PIECE_MAP[piece.toLowerCase()];
        this.pieces[turn].push(index);
        this.board[index] = pieceValue | turn;
        if (pieceValue === constants.PIECE_MAP.k) {
            this.kings[turn] = index;
        }
    }

    addMove(move) {
        var from = this.moveFrom(move);
        var to = this.moveTo(move);
        var opponentTurn = (this.turn + 1) % 2;
        var pawnDirection = this.turn ? -1 : 1;
        var promotion = this.movePromotion(move);
        this.history.push([move, this.board[to], this.enPassant, this.castling, this.hash]);

        // Capture
        if (this.board[to] !== constants.PIECE_MAP.empty) {
            this.hash -= zobrist.SQUARES[to][this.board[to]];
            this.pieces[opponentTurn].remove(to);
        }

        // En passant
        else if (to === this.enPassant && (this.board[from] & constants.JUST_PIECE) === constants.PIECE_MAP.p) {
            var destroyedPawn = to + -1 * pawnDirection * 15;
            this.pieces[opponentTurn].remove(destroyedPawn);
            this.board[destroyedPawn] = constants.PIECE_MAP.empty;
            this.hash -= zobrist.SQUARES[destroyedPawn][this.board[destroyedPawn]];
        }

        // Regular move
        this.movePiece(from, to);

        // Promotion
        if (promotion) {
            this.board[to] = promotion | this.turn;
        }

        // Castling
        var castledThroughCheck = false;

        if (constants.CASTLING_MAP[to] === from && (this.board[to] & constants.JUST_PIECE) === constants.PIECE_MAP.k) {
            var rookMove = constants.CASTLING_ROOK_MOVES[to];
            this.movePiece(this.moveFrom(rookMove), this.moveTo(rookMove));
            var direction = to > from ? 1 : -1;

            for (var kingIndex = from; kingIndex !== to; kingIndex += direction) {
                if (this.isAttacked(kingIndex, opponentTurn)) {
                    castledThroughCheck = true;
                    break;
                }
            }
        }

        // If castled through check, no need to update these values, they'll be restored from history
        if (!castledThroughCheck) {
            // Update enPassant
            if (this.enPassant) {
                this.hash -= zobrist.EN_PASSANT[this.enPassant];
            }

            if ((this.board[to] & constants.JUST_PIECE) === constants.PIECE_MAP.p && from + 30 * pawnDirection === to) {
                this.enPassant = from + 15 * pawnDirection;
                this.hash += zobrist.EN_PASSANT[this.enPassant];
            } else {
                this.enPassant = undefined;
            }

            // Update castling
            for (var castlingIndex = 0; castlingIndex < constants.CASTLING_INFO.length; castlingIndex++) {
                var castlingInfo = constants.CASTLING_INFO[castlingIndex];
                if ((this.castling & castlingInfo[0]) && (from === castlingInfo[1] || to === castlingInfo[3] || from === castlingInfo[3])) {
                    this.castling -= castlingInfo[0];
                    this.hash -= zobrist.CASTLING[castlingIndex];
                }
            }
        }

        // Update kings
        if ((this.board[to] & constants.JUST_PIECE) === constants.PIECE_MAP.k) {
            this.kings[this.turn] = to;
        }

        // Update turn
        this.hash += zobrist.TURN * (opponentTurn ? 1 : -1);
        var oldTurn = this.turn;
        this.turn = opponentTurn;

        // Revert if in check or castled through check
        if (castledThroughCheck || this.isAttacked(this.kings[oldTurn], this.turn)) {
            this.subtractMove();
            return false;
        }

        return true;
    }

    subtractMove() {
        var history = this.history.pop();
        var move = history[0];
        var from = this.moveFrom(move);
        var to = this.moveTo(move);
        var opponentTurn = this.turn;
        this.turn = (this.turn + 1) % 2;
        this.movePiece(to, from);
        this.board[to] = history[1];
        this.enPassant = history[2];
        this.castling = history[3];

        if (this.movePromotion(move)) {
            this.board[from] = constants.PIECE_MAP.p | this.turn;
        }

        if ((this.board[from] & constants.JUST_PIECE) === constants.PIECE_MAP.k) {
            this.kings[this.turn] = from;
        }

        // Capture
        if (this.board[to] !== constants.PIECE_MAP.empty) {
            this.pieces[opponentTurn].push(to);
        }
        // En passant
        else if (to === this.enPassant &&
            (this.board[from] & constants.JUST_PIECE) === constants.PIECE_MAP.p) {
            var pawnDirection = this.turn ? -1 : 1;
            var destroyedPawn = to + -1 * pawnDirection * 15;
            this.pieces[opponentTurn].push(destroyedPawn);
            this.board[destroyedPawn] = constants.PIECE_MAP.p | opponentTurn;
        }
        // Castling
        else if (constants.CASTLING_MAP[to] === from &&
            (this.board[from] & constants.JUST_PIECE) === constants.PIECE_MAP.k) {
            var rookMove = constants.CASTLING_ROOK_MOVES[to];
            this.movePiece(this.moveTo(rookMove), this.moveFrom(rookMove));
        }

        this.hash = history[4];
    }

    movePiece(from, to) {
        this.hash -= zobrist.SQUARES[from][this.board[from]];
        this.pieces[this.turn].remove(from);
        this.pieces[this.turn].push(to);
        this.board[to] = this.board[from];
        this.board[from] = constants.PIECE_MAP.empty;
        this.hash += zobrist.SQUARES[to][this.board[to]];
    }

    moveStringToMove(moveString) {
        var from = utils.algebraicToIndex(moveString.slice(0, 2));
        var to = utils.algebraicToIndex(moveString.slice(2, 4));
        var promotion = constants.PIECE_MAP[moveString[5]];
        return this.createMove(from, to, promotion);
    }

    generateMoves() {
        var pieces = this.pieces[this.turn];
        var moves = [];
        var i, index, piece;

        // Piece moves
        for (i = 0; i < pieces.length; i++) {
            index = pieces.indices[i];
            piece = this.board[index] & constants.JUST_PIECE;

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
                    moves = moves.concat(this.slidingMoves(constants.DELTA_BISHOP, index))
                        .concat(this.slidingMoves(constants.DELTA_ROOK, index));
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

    generateCaptures() {
        var pieces = this.pieces[this.turn];
        var moves = [];
        var i, index, piece;

        // Piece moves
        for (i = 0; i < pieces.length; i++) {
            index = pieces.indices[i];
            piece = this.board[index] & constants.JUST_PIECE;

            switch (piece) {
                case constants.PIECE_MAP.p:
                    moves = moves.concat(this.pawnCaptures(index));
                    break;
                case constants.PIECE_MAP.n:
                    moves = moves.concat(this.deltaCaptures(constants.DELTA_KNIGHT, index));
                    break;
                case constants.PIECE_MAP.b:
                    moves = moves.concat(this.slidingCaptures(constants.DELTA_BISHOP, index));
                    break;
                case constants.PIECE_MAP.r:
                    moves = moves.concat(this.slidingCaptures(constants.DELTA_ROOK, index));
                    break;
                case constants.PIECE_MAP.q:
                    moves = moves.concat(this.slidingCaptures(constants.DELTA_BISHOP, index))
                        .concat(this.slidingCaptures(constants.DELTA_ROOK, index));
                    break;
                case constants.PIECE_MAP.k:
                    moves = moves.concat(this.deltaCaptures(constants.DELTA_KING, index));
                    break;
            }
        }

        return moves;
    }

    movesString() {
        var moves = this.generateMoves();
        return moves.map(move => this.moveToString(move)).join('\n');
    }

    moveToString(move) {
        return utils.indexToAlgebraic(this.moveFrom(move)) +
            utils.indexToAlgebraic(this.moveTo(move)) +
            (this.movePromotion(move) ? constants.INVERSE_PIECE_MAP[this.movePromotion(move)] : '');
    }

    pawnMoves(index) {
        var moves = [];
        var lastRank = constants.PAWN_LAST_RANK[this.turn];
        var firstRank = constants.PAWN_FIRST_RANK[this.turn]
        var j;

        // Regular push
        var newMove = index + 15 - 30 * this.turn;
        if (this.board[newMove] === constants.PIECE_MAP.empty) {
            if (newMove >= lastRank[0] && newMove <= lastRank[1]) {
                moves.push(this.createMove(index, newMove, constants.PIECE_MAP.q));
                moves.push(this.createMove(index, newMove, constants.PIECE_MAP.r));
                moves.push(this.createMove(index, newMove, constants.PIECE_MAP.b));
                moves.push(this.createMove(index, newMove, constants.PIECE_MAP.n));
            } else {
                moves.push(this.createMove(index, newMove));
            }
        }

        // Double push
        newMove = index + 30 - 60 * this.turn;
        if (this.board[newMove] === constants.PIECE_MAP.empty &&
            this.board[index + 15  - 30 * this.turn] === constants.PIECE_MAP.empty &&
            index >= firstRank[0] && index <= firstRank[1]) {
            moves.push(this.createMove(index, newMove));
        }

        moves = moves.concat(this.pawnCaptures(index));

        return moves;
    }

    pawnCaptures(index) {
        var moves = [];
        let j, newMove;
        var lastRank = constants.PAWN_LAST_RANK[this.turn];

        for (j = 0; j < 2; j++) {
            // Captures
            newMove = index + (14 + 2 * j) * (this.turn ? -1 : 1);
            if (this.board[newMove] && this.board[newMove] !== constants.PIECE_MAP.empty && this.board[newMove] % 2 !== this.turn) {
                if (newMove >= lastRank[0] && newMove <= lastRank[1]) {
                    moves.push(this.createMove(index, newMove, constants.PIECE_MAP.q));
                    moves.push(this.createMove(index, newMove, constants.PIECE_MAP.r));
                    moves.push(this.createMove(index, newMove, constants.PIECE_MAP.b));
                    moves.push(this.createMove(index, newMove, constants.PIECE_MAP.n));
                } else {
                    moves.push(this.createMove(index, newMove));
                }
            }

            // En passant
            if (newMove === this.enPassant) {
                moves.push(this.createMove(index, newMove));
            }
        }

        return moves;
    }

    deltaMoves(deltas, index) {
        var moves = [];
        var newMove;

        for (var j = 0; j < deltas.length; j++) {
            newMove = index + deltas[j];
            if (this.board[newMove] &&
                (this.board[newMove] === constants.PIECE_MAP.empty ||
                this.board[newMove] % 2 !== this.turn)) {
                moves.push(this.createMove(index, newMove));
            }
        }

        return moves;
    }

    deltaCaptures(deltas, index) {
        var moves = [];
        var newMove;

        for (var j = 0; j < deltas.length; j++) {
            newMove = index + deltas[j];
            if (this.board[newMove] &&
                this.board[newMove] !== constants.PIECE_MAP.empty &&
                (this.board[newMove] % 2) !== this.turn) {
                moves.push(this.createMove(index, newMove));
            }
        }

        return moves;
    }

    slidingMoves(deltas, index) {
        var moves = [];
        var newMove, i;

        for (i = 0; i < deltas.length; i++) {
            newMove = index;

            do {
                newMove += deltas[i];

                if (this.board[newMove] &&
                    (this.board[newMove] === constants.PIECE_MAP.empty ||
                    this.board[newMove] % 2 !== this.turn)) {
                    moves.push(this.createMove(index, newMove));
                }
            } while (this.board[newMove] === constants.PIECE_MAP.empty);
        }

        return moves;
    }

    slidingCaptures(deltas, index) {
        var moves = [];
        var newMove, i;

        for (i = 0; i < deltas.length; i++) {
            newMove = index;

            do {
                newMove += deltas[i];
            } while (this.board[newMove] && this.board[newMove] === constants.PIECE_MAP.empty);

            if (this.board[newMove] && (this.board[newMove] % 2) !== this.turn) {
                moves.push(this.createMove(index, newMove));
            }
        }

        return moves;
    }

    castlingMoves() {
        var moves = [];
        var index = this.turn ? 142 : 37;
        var i, j, castlingIndex, castlingInfo, newMove, numberOffset, direction, indexToCheck;

        castlingLoop:
        for (i = 0; i < 2; i++) {
            castlingIndex = i + this.turn * 2;
            castlingInfo = constants.CASTLING_INFO[castlingIndex];

            if (this.castling & castlingInfo[0]) {
                newMove = castlingInfo[2];
                numberOffset = castlingIndex % 2 === 0 ? 2 : 3;
                direction = castlingIndex % 2 === 0 ? 1 : -1;

                for (j = 1; j <= numberOffset; j++) {
                    indexToCheck = index + j * direction;
                    if (this.board[indexToCheck] !== constants.PIECE_MAP.empty) {
                        continue castlingLoop;
                    }
                }

                moves.push(this.createMove(index, newMove));
            }
        }

        return moves;
    }

    isAttacked(index, turn) {
        var newMove, deltas, deltaPiece, j, k;

        // Pawns
        for (j = 0; j < 2; j++) {
            newMove = index + (14 + 2 * j) * (turn ? 1 : -1);
            if (this.board[newMove] &&
                this.board[newMove] % 2 === turn &&
                (this.board[newMove] & constants.JUST_PIECE) === constants.PIECE_MAP.p) {
                return true;
            }
        }

        // Sliding attacks
        for (k = 0; k < 2; k++) {
            deltas = constants.DELTA_MAP[k][0];
            deltaPiece = constants.DELTA_MAP[k][1];

            for (j = 0; j < 4; j++) {
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
        for (k = 2; k < 4; k++) {
            deltas = constants.DELTA_MAP[k][0];
            deltaPiece = constants.DELTA_MAP[k][1];

            for (j = 0; j < 8; j++) {
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

    isInCheck(turn) {
        return this.isAttacked(this.kings[turn], (turn + 1) % 2);
    }

    generateHash() {
        var hash = 0;
        var rankIndex, fileIndex, index;

        for (rankIndex = 1; rankIndex <= 8; rankIndex++) {
            for (fileIndex = 1; fileIndex <= 8; fileIndex++) {
                index = utils.rankFileToIndex(rankIndex, fileIndex);
                if (this.board[index] !== constants.PIECE_MAP.empty) {
                    hash += zobrist.SQUARES[index][this.board[index]];
                }
            }
        }

        if (this.enPassant) {
            hash += zobrist.EN_PASSANT[this.enPassant];
        }

        if (this.castling) {
            constants.CASTLING_INFO.forEach((castlingInfo, castlingIndex) => {
                if (this.castling & constants.CASTLING_INFO[castlingIndex][0]) {
                    hash += zobrist.CASTLING[castlingIndex];
                }
            });
        }

        if (this.turn) {
            hash += zobrist.TURN;
        }

        return hash;
    }

    createMove(from, to, promotion) {
        return from + (to << 8) + (promotion << 16);
    }

    moveFrom(move) {
        return move & 0b11111111;
    }

    moveTo(move) {
        return (move >> 8) & 0b11111111;
    }

    movePromotion(move) {
        return move >> 16;
    }
};