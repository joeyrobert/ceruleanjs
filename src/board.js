'use strict';

const constants = require('./constants');
const utils = require('./utils');
const zobrist = require('./zobrist');
const BoardPieceList = require('./piece_list').BoardPieceList;
const see = require('./see');

module.exports = class Board {
    constructor() {
        this.emptyBoard();
        this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }

    emptyBoard() {
        this.resetHistory();
        this.board = new Uint32Array(constants.WIDTH * constants.HEIGHT);
        this.pieces = [new BoardPieceList(this), new BoardPieceList(this)];
        this.castling = 0;
        this.enPassant = null;
        this.turn = constants.WHITE;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.kings = [];
        this.hiHash = 0;
        this.loHash = 0;

        // Set legal board empty
        var rankIndex, fileIndex, index;

        for (rankIndex = 0; rankIndex <= 7; rankIndex++) {
            for (fileIndex = 0; fileIndex <= 7; fileIndex++) {
                index = utils.rankFileToIndex(rankIndex, fileIndex);
                this.board[index] = constants.PIECE_EMPTY;
            }
        }
    }

    get fen() {
        var board = [];
        var rankIndex, fileOffset, rankBoard, fileIndex, piece, index;

        for (rankIndex = 7; rankIndex >= 0; rankIndex--) {
            fileOffset = 0;
            rankBoard = '';

            for (fileIndex = 0; fileIndex <= 7; fileIndex++) {
                index = utils.rankFileToIndex(rankIndex, fileIndex);

                if (this.board[index] !== constants.PIECE_EMPTY) {
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
            var fileIndex = 0;
            var rankIndex = 7 - invertedRankIndex;
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
        this.initialHash();
    }

    addPiece(rankIndex, fileIndex, piece, turn) {
        var index = utils.rankFileToIndex(rankIndex, fileIndex);
        var pieceValue = constants.PIECE_MAP[piece.toLowerCase()];
        this.board[index] = pieceValue | turn;
        this.pieces[turn].push(index);
        if (pieceValue === constants.PIECE_K) {
            this.kings[turn] = index;
        }
    }

    addHistory() {
        this.currentHistory = [this.enPassant, this.castling, this.loHash, this.hiHash];
        this.history.push(this.currentHistory);
    }

    subtractHistory() {
        this.history.pop();
        this.currentHistory = this.history[this.history.length - 1];
    }

    resetHistory() {
        this.history = [];
        this.currentHistory = undefined;
    }

    addMove(move) {
        var from = utils.moveFrom(move);
        var to = utils.moveTo(move);
        var bits = utils.moveBits(move);
        var opponentTurn = this.turn ^ 1;
        var castledThroughCheck = false;

        if (this.enPassant) {
            this.loHash ^= zobrist.EN_PASSANT[this.enPassant][0];
            this.hiHash ^= zobrist.EN_PASSANT[this.enPassant][1];
        }
        this.enPassant = null;

        switch (bits) {
            case constants.MOVE_BITS_EMPTY:
                this.movePiece(from, to);
                this.updateCastlingAndKings(from, to);
                break;
            case constants.MOVE_BITS_CAPTURE:
                this.loHash ^= zobrist.SQUARES[to][this.board[to]][0];
                this.hiHash ^= zobrist.SQUARES[to][this.board[to]][1];
                this.pieces[opponentTurn].remove(to);
                this.movePiece(from, to);
                this.updateCastlingAndKings(from, to);
                break;
            case constants.MOVE_BITS_CASTLING:
                this.movePiece(from, to);
                var rookMove = constants.CASTLING_ROOK_MOVES[to];
                var direction = to > from ? 1 : -1;
                this.movePiece(utils.moveFrom(rookMove), utils.moveTo(rookMove));
                this.updateCastlingAndKings(from, to);

                for (var kingIndex = from; kingIndex !== to; kingIndex += direction) {
                    if (this.isAttacked(kingIndex, opponentTurn)) {
                        castledThroughCheck = true;
                        break;
                    }
                }
                break;
            case constants.MOVE_BITS_EN_PASSANT:
                this.movePiece(from, to);
                var pawnIncrement = this.turn ? -15 : 15;
                var destroyedPawn = to + -1 * pawnIncrement;
                this.pieces[opponentTurn].remove(destroyedPawn);
                this.loHash ^= zobrist.SQUARES[destroyedPawn][this.board[destroyedPawn]][0];
                this.hiHash ^= zobrist.SQUARES[destroyedPawn][this.board[destroyedPawn]][1];
                this.board[destroyedPawn] = constants.PIECE_EMPTY;
                break;
            case constants.MOVE_BITS_PAWN:
                this.movePiece(from, to);
                break;
            case constants.MOVE_BITS_DOUBLE_PAWN:
                this.movePiece(from, to);
                var pawnIncrement = this.turn ? -15 : 15;
                this.enPassant = from + pawnIncrement;
                this.loHash ^= zobrist.EN_PASSANT[this.enPassant][0];
                this.hiHash ^= zobrist.EN_PASSANT[this.enPassant][1];
                break;
            case constants.MOVE_BITS_PROMOTION:
                this.movePiece(from, to);
                var promotion = utils.movePromotion(move);
                this.board[to] = promotion | this.turn;
                // Recategorize in piece list
                this.pieces[this.turn].remove(to);
                this.pieces[this.turn].push(to);
                break;
            case constants.MOVE_BITS_PROMOTION_CAPTURE:
                this.loHash ^= zobrist.SQUARES[to][this.board[to]][0];
                this.hiHash ^= zobrist.SQUARES[to][this.board[to]][1];
                this.pieces[opponentTurn].remove(to);
                this.movePiece(from, to);
                var promotion = utils.movePromotion(move);
                this.board[to] = promotion | this.turn;
                // Recategorize in piece list
                this.pieces[this.turn].remove(to);
                this.pieces[this.turn].push(to);
                this.updateCastlingAndKings(from, to);
                break;
        }

        // Update turn
        this.loHash ^= zobrist.TURN[0];
        this.hiHash ^= zobrist.TURN[1];
        var oldTurn = this.turn;
        this.turn = opponentTurn;

        // Revert if in check or castled through check
        if (castledThroughCheck || this.isAttacked(this.kings[oldTurn], this.turn)) {
            this.subtractMove(move);
            return false;
        }

        return true;
    }

    subtractMove(move) {
        var from = utils.moveFrom(move);
        var to = utils.moveTo(move);
        var bits = utils.moveBits(move);
        var captured = utils.moveCaptured(move);
        var opponentTurn = this.turn;
        this.turn = this.turn ^ 1;
        this.movePieceNoHash(to, from);
        this.board[to] = captured === constants.PIECE_EMPTY ? captured : (captured | opponentTurn);
        this.enPassant = this.currentHistory[0];
        this.castling = this.currentHistory[1];

        if ((this.board[from] & constants.JUST_PIECE) === constants.PIECE_K) {
            this.kings[this.turn] = from;
        }

        switch (bits) {
            case constants.MOVE_BITS_CAPTURE:
                this.pieces[opponentTurn].push(to);
                break;
            case constants.MOVE_BITS_CASTLING:
                var rookMove = constants.CASTLING_ROOK_MOVES[to];
                this.movePieceNoHash(utils.moveTo(rookMove), utils.moveFrom(rookMove));
                break;
            case constants.MOVE_BITS_EN_PASSANT:
                var pawnIncrement = this.turn ? -15 : 15;
                var destroyedPawn = to + -1 * pawnIncrement;
                this.board[destroyedPawn] = constants.PIECE_P | opponentTurn;
                this.pieces[opponentTurn].push(destroyedPawn);
                break;
            case constants.MOVE_BITS_PROMOTION:
                this.board[from] = constants.PIECE_P | this.turn;
                // Recategorize in piece list
                this.pieces[this.turn].remove(from);
                this.pieces[this.turn].push(from);
                break;
            case constants.MOVE_BITS_PROMOTION_CAPTURE:
                this.board[from] = constants.PIECE_P | this.turn;
                this.pieces[opponentTurn].push(to);
                // Recategorize in piece list
                this.pieces[this.turn].remove(from);
                this.pieces[this.turn].push(from);
                break;
        }

        this.loHash = this.currentHistory[2];
        this.hiHash = this.currentHistory[3];
    }

    updateCastlingAndKings(from, to) {
        for (var castlingIndex = 0; castlingIndex < constants.CASTLING_INFO.length; castlingIndex++) {
            var castlingInfo = constants.CASTLING_INFO[castlingIndex];
            if ((this.castling & castlingInfo[0]) && (from === castlingInfo[1] || to === castlingInfo[3] || from === castlingInfo[3])) {
                this.castling -= castlingInfo[0];
                this.loHash ^= zobrist.CASTLING[castlingIndex][0];
                this.hiHash ^= zobrist.CASTLING[castlingIndex][1];
            }
        }

        if ((this.board[to] & constants.JUST_PIECE) === constants.PIECE_K) {
            this.kings[this.turn] = to;
        }
    }

    movePiece(from, to) {
        this.loHash ^= zobrist.SQUARES[from][this.board[from]][0];
        this.loHash ^= zobrist.SQUARES[from][this.board[from]][1];
        this.board[to] = this.board[from];
        this.board[from] = constants.PIECE_EMPTY;
        this.pieces[this.turn].remove(from);
        this.pieces[this.turn].push(to);
        this.loHash ^= zobrist.SQUARES[to][this.board[to]][0];
        this.hiHash ^= zobrist.SQUARES[to][this.board[to]][1];
    }

    movePieceNoHash(from, to) {
        this.board[to] = this.board[from];
        this.board[from] = constants.PIECE_EMPTY;
        this.pieces[this.turn].remove(from);
        this.pieces[this.turn].push(to);
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
                case constants.PIECE_P:
                    this.pawnMoves(moves, index);
                    break;
                case constants.PIECE_N:
                    this.deltaMoves(moves, constants.DELTA_KNIGHT, index);
                    break;
                case constants.PIECE_B:
                    this.slidingMoves(moves, constants.DELTA_BISHOP, index);
                    break;
                case constants.PIECE_R:
                    this.slidingMoves(moves, constants.DELTA_ROOK, index);
                    break;
                case constants.PIECE_Q:
                    this.slidingMoves(moves, constants.DELTA_BISHOP, index);
                    this.slidingMoves(moves, constants.DELTA_ROOK, index);
                    break;
                case constants.PIECE_K:
                    this.deltaMoves(moves, constants.DELTA_KING, index);
                    break;
            }
        }

        // Castling
        this.castlingMoves(moves);

        return moves;
    }

    generateCapturesAndPromotions() {
        var pieces = this.pieces[this.turn];
        var moves = [];
        var i, index, piece;

        // Piece moves
        for (i = 0; i < pieces.length; i++) {
            index = pieces.indices[i];
            piece = this.board[index] & constants.JUST_PIECE;

            switch (piece) {
                case constants.PIECE_P:
                    this.pawnCaptures(moves, index);
                    this.pawnPromotions(moves, index);
                    break;
                case constants.PIECE_N:
                    this.deltaCaptures(moves, constants.DELTA_KNIGHT, index);
                    break;
                case constants.PIECE_B:
                    this.slidingCaptures(moves, constants.DELTA_BISHOP, index);
                    break;
                case constants.PIECE_R:
                    this.slidingCaptures(moves, constants.DELTA_ROOK, index);
                    break;
                case constants.PIECE_Q:
                    this.slidingCaptures(moves, constants.DELTA_BISHOP, index);
                    this.slidingCaptures(moves, constants.DELTA_ROOK, index);
                    break;
                case constants.PIECE_K:
                    this.deltaCaptures(moves, constants.DELTA_KING, index);
                    break;
            }
        }

        for (var i = 0; i < moves.length; i++) {
            moves[i] = utils.moveAddOrder(moves[i], see(this, moves[i]));
        }

        return moves;
    }

    generateLegalMoves() {
        var moves = this.generateMoves();
        this.addHistory();

        var legalMoves = moves.filter(move => {
            if (this.addMove(move)) {
                this.subtractMove(move);
                return true;
            }

            return false;
        });

        this.subtractHistory();

        return legalMoves;
    }

    moveStringToMove(moveString) {
        var moves = this.generateLegalMoves();
        var move = moves.filter(move => moveString === utils.moveToString(move))[0];
        return move;
    }

    addMoveString(moveString) {
        this.addHistory();
        var move = this.moveStringToMove(moveString);

        if (move) {
            return this.addMove(move) && move;
        } else {
            this.subtractHistory();
        }
    }

    pawnMoves(moves, index) {
        var lastRank = constants.PAWN_LAST_RANK[this.turn];
        var firstRank = constants.PAWN_FIRST_RANK[this.turn]
        var j;

        // Regular push
        var newMove = index + 15 - 30 * this.turn;
        if (this.board[newMove] === constants.PIECE_EMPTY) {
            if (newMove >= lastRank[0] && newMove <= lastRank[1]) {
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, 0, constants.PIECE_Q));
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, 0, constants.PIECE_R));
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, 0, constants.PIECE_B));
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, 0, constants.PIECE_N));
            } else {
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PAWN));
            }
        }

        // Double push
        newMove = index + 30 - 60 * this.turn;
        if (this.board[newMove] === constants.PIECE_EMPTY &&
            this.board[index + 15  - 30 * this.turn] === constants.PIECE_EMPTY &&
            index >= firstRank[0] && index <= firstRank[1]) {
            moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_DOUBLE_PAWN));
        }

        this.pawnCaptures(moves, index);
    }

    pawnPromotions(moves, index) {
        var lastRank = constants.PAWN_LAST_RANK[this.turn];
        var firstRank = constants.PAWN_FIRST_RANK[this.turn]
        var j;

        // Regular push promotions
        // Capture promotions are handled by pawnCaptures
        var newMove = index + 15 - 30 * this.turn;
        if (this.board[newMove] === constants.PIECE_EMPTY && newMove >= lastRank[0] && newMove <= lastRank[1]) {
            moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, 0, constants.PIECE_Q));
            moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, 0, constants.PIECE_R));
            moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, 0, constants.PIECE_B));
            moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, 0, constants.PIECE_N));
        }

    }

    pawnCaptures(moves, index) {
        var j, newMove;
        var lastRank = constants.PAWN_LAST_RANK[this.turn];

        for (j = 0; j < 2; j++) {
            // Captures
            newMove = index + (14 + 2 * j) * (this.turn ? -1 : 1);
            if (this.board[newMove] && this.board[newMove] !== constants.PIECE_EMPTY && this.board[newMove] % 2 !== this.turn) {
                if (newMove >= lastRank[0] && newMove <= lastRank[1]) {
                    moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION_CAPTURE, this.board[newMove], constants.PIECE_Q));
                    moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION_CAPTURE, this.board[newMove], constants.PIECE_R));
                    moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION_CAPTURE, this.board[newMove], constants.PIECE_B));
                    moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION_CAPTURE, this.board[newMove], constants.PIECE_N));
                } else {
                    moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_CAPTURE, this.board[newMove]));
                }
            }

            // En passant
            if (newMove === this.enPassant) {
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_EN_PASSANT, this.board[newMove]));
            }
        }
    }

    deltaMoves(moves, deltas, index) {
        var newMove;

        for (var j = 0; j < deltas.length; j++) {
            newMove = index + deltas[j];
            if (this.board[newMove]) {
                if(this.board[newMove] === constants.PIECE_EMPTY) {
                    moves.push(utils.createMove(index, newMove));
                } else if (this.board[newMove] % 2 !== this.turn) {
                    moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_CAPTURE, this.board[newMove]));
                }
            }
        }
    }

    deltaCaptures(moves, deltas, index) {
        var newMove;

        for (var j = 0; j < deltas.length; j++) {
            newMove = index + deltas[j];
            if (this.board[newMove] &&
                this.board[newMove] !== constants.PIECE_EMPTY &&
                (this.board[newMove] % 2) !== this.turn) {
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_CAPTURE, this.board[newMove]));
            }
        }
    }

    slidingMoves(moves, deltas, index) {
        var newMove, i;

        for (i = 0; i < deltas.length; i++) {
            newMove = index;

            do {
                newMove += deltas[i];
                if (this.board[newMove]) {
                    if(this.board[newMove] === constants.PIECE_EMPTY) {
                        moves.push(utils.createMove(index, newMove));
                    } else if (this.board[newMove] % 2 !== this.turn) {
                        moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_CAPTURE, this.board[newMove]));
                    }
                }
            } while (this.board[newMove] === constants.PIECE_EMPTY);
        }
    }

    slidingCaptures(moves, deltas, index) {
        var newMove, i;

        for (i = 0; i < deltas.length; i++) {
            newMove = index;

            do {
                newMove += deltas[i];
            } while (this.board[newMove] && this.board[newMove] === constants.PIECE_EMPTY);

            if (this.board[newMove] && (this.board[newMove] % 2) !== this.turn) {
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_CAPTURE, this.board[newMove]));
            }
        }
    }

    castlingMoves(moves) {
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
                    if (this.board[indexToCheck] !== constants.PIECE_EMPTY) {
                        continue castlingLoop;
                    }
                }

                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_CASTLING));
            }
        }
    }

    isAttacked(index, turn) {
        var newMove, deltas, deltaPiece, j, k;

        // Pawns
        for (j = 0; j < 2; j++) {
            newMove = index + (14 + 2 * j) * (turn ? 1 : -1);
            if (this.board[newMove] &&
                this.board[newMove] % 2 === turn &&
                (this.board[newMove] & constants.JUST_PIECE) === constants.PIECE_P) {
                return true;
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

        // Sliding attacks
        for (k = 0; k < 2; k++) {
            deltas = constants.DELTA_MAP[k][0];
            deltaPiece = constants.DELTA_MAP[k][1];

            for (j = 0; j < 4; j++) {
                newMove = index + deltas[j];

                while (this.board[newMove] && this.board[newMove] === constants.PIECE_EMPTY) {
                    newMove += deltas[j];
                }

                if (this.board[newMove] % 2 === turn &&
                    ((this.board[newMove] & constants.JUST_PIECE) === deltaPiece ||
                        (this.board[newMove] & constants.JUST_PIECE) === constants.PIECE_Q)) {
                    return true;
                }
            }
        }

        return false;
    }

    isInCheck(turn) {
        return this.isAttacked(this.kings[turn], turn ^ 1);
    }

    initialHash() {
        this.loHash = 0;
        this.hiHash = 0;
        var rankIndex, fileIndex, index;

        for (rankIndex = 0; rankIndex <= 7; rankIndex++) {
            for (fileIndex = 0; fileIndex <= 7; fileIndex++) {
                index = utils.rankFileToIndex(rankIndex, fileIndex);
                if (this.board[index] !== constants.PIECE_EMPTY) {
                    this.loHash ^= zobrist.SQUARES[index][this.board[index]][0];
                    this.hiHash ^= zobrist.SQUARES[index][this.board[index]][1];
                }
            }
        }

        if (this.enPassant) {
            this.loHash ^= zobrist.EN_PASSANT[this.enPassant][0];
            this.hiHash ^= zobrist.EN_PASSANT[this.enPassant][1];
        }

        if (this.castling) {
            constants.CASTLING_INFO.forEach((castlingInfo, castlingIndex) => {
                if (this.castling & constants.CASTLING_INFO[castlingIndex][0]) {
                    this.loHash ^= zobrist.CASTLING[castlingIndex][0];
                    this.hiHash ^= zobrist.CASTLING[castlingIndex][1];
                }
            });
        }

        if (this.turn) {
            this.loHash ^= zobrist.TURN[0];
            this.hiHash ^= zobrist.TURN[1];
        }
    }
};