'use strict';

const constants = require('./constants');
const utils = require('./utils');
const polyglot = require('./polyglot');
const BoardPieceList = require('./piece_list').BoardPieceList;
const see = require('./see');

module.exports = class Board {
    constructor() {
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
        this.kings = new Uint32Array(2);
        this.hiHash = 0;
        this.loHash = 0;

        // Set illegal board out of bounds
        this.board.fill(constants.OUT_OF_BOUNDS);

        // Set legal board empty
        var rankIndex, fileIndex, index;

        for (rankIndex = 0; rankIndex <= 7; rankIndex++) {
            for (fileIndex = 0; fileIndex <= 7; fileIndex++) {
                index = utils.rankFileToIndex(rankIndex, fileIndex);
                this.board[index] = constants.EMPTY;
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

                if (this.board[index] !== constants.EMPTY) {
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
        var turn = this.turn === constants.WHITE ? 'w' : 'b';
        var castling = '';

        if (this.castling) {
            // Odd loop order
            [2, 3, 0, 1].forEach(castlingIndex => {
                var castlingInfo = constants.CASTLING_INFO[castlingIndex];
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
        if (pieceValue === constants.KING) {
            this.kings[turn] = index;
        }
    }

    addHistory() {
        this.currentHistory = [this.enPassant, this.castling, this.loHash, this.hiHash, this.halfMoveClock];
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
        var zobristIndex;

        if (this.enPassant) {
            var direction = this.turn === constants.WHITE ? 1 : -1;

            // opponentTurn === opponentPiece, because pawn offset is 0
            if (this.board[this.enPassant - 14 * direction] === this.turn || this.board[this.enPassant - 16 * direction] === this.turn) {
                zobristIndex = polyglot.EN_PASSANT_OFFSET + utils.indexToFile(this.enPassant);
                this.loHash ^= polyglot.LO_HASH[zobristIndex];
                this.hiHash ^= polyglot.HI_HASH[zobristIndex];
            }
        }

        this.enPassant = null;

        switch (bits) {
            case constants.MOVE_BITS_EMPTY:
                this.movePiece(from, to);
                this.updateCastlingAndKings(from, to);
                this.halfMoveClock++;
                break;
            case constants.MOVE_BITS_CAPTURE:
                zobristIndex = 64 * this.board[to] + 8 * utils.indexToRank(to) + utils.indexToFile(to);
                this.loHash ^= polyglot.LO_HASH[zobristIndex];
                this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                this.pieces[opponentTurn].remove(to);
                this.movePiece(from, to);
                this.updateCastlingAndKings(from, to);
                this.halfMoveClock = 0;
                break;
            case constants.MOVE_BITS_CASTLING:
                this.movePiece(from, to);
                var rookFrom = constants.CASTLING_ROOK_FROM[to];
                var rookTo = constants.CASTLING_ROOK_TO[to];
                var direction = to > from ? 1 : -1;
                this.movePiece(rookFrom, rookTo);
                this.updateCastlingAndKings(from, to);
                this.halfMoveClock++;

                for (var kingIndex = from; kingIndex !== to; kingIndex += direction) {
                    if (this.isAttacked(kingIndex, opponentTurn)) {
                        castledThroughCheck = true;
                        break;
                    }
                }
                break;
            case constants.MOVE_BITS_EN_PASSANT:
                this.movePiece(from, to);
                var pawnIncrement = this.turn === constants.WHITE ? -15 : 15;
                var destroyedPawn = to + pawnIncrement;
                this.pieces[opponentTurn].remove(destroyedPawn);
                zobristIndex = 64 * this.board[destroyedPawn] + 8 * utils.indexToRank(destroyedPawn) + utils.indexToFile(destroyedPawn);
                this.loHash ^= polyglot.LO_HASH[zobristIndex];
                this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                this.board[destroyedPawn] = constants.EMPTY;
                this.halfMoveClock = 0;
                break;
            case constants.MOVE_BITS_PAWN:
                this.movePiece(from, to);
                this.halfMoveClock = 0;
                break;
            case constants.MOVE_BITS_DOUBLE_PAWN:
                this.movePiece(from, to);
                var pawnIncrement = this.turn === constants.WHITE ? 15 : -15;
                var direction = this.turn === constants.WHITE ? -1 : 1;
                this.enPassant = from + pawnIncrement;

                if (this.board[this.enPassant - 14 * direction] === opponentTurn || this.board[this.enPassant - 16 * direction] === opponentTurn) {
                    zobristIndex = polyglot.EN_PASSANT_OFFSET + utils.indexToFile(this.enPassant);
                    this.loHash ^= polyglot.LO_HASH[zobristIndex];
                    this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                }

                this.halfMoveClock = 0;
                break;
            case constants.MOVE_BITS_PROMOTION:
                this.movePiece(from, to);
                var promotion = utils.movePromotion(move);
                this.board[to] = promotion | this.turn;
                // Recategorize in piece list
                this.pieces[this.turn].remove(to);
                this.pieces[this.turn].push(to);
                this.halfMoveClock = 0;
                break;
            case constants.MOVE_BITS_PROMOTION_CAPTURE:
                zobristIndex = 64 * this.board[to] + 8 * utils.indexToRank(to) + utils.indexToFile(to);
                this.loHash ^= polyglot.LO_HASH[zobristIndex];
                this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                this.pieces[opponentTurn].remove(to);
                this.movePiece(from, to);
                var promotion = utils.movePromotion(move);
                this.board[to] = promotion | this.turn;
                // Recategorize in piece list
                this.pieces[this.turn].remove(to);
                this.pieces[this.turn].push(to);
                this.updateCastlingAndKings(from, to);
                this.halfMoveClock = 0;
                break;
        }

        // Increment full move number after black's turn
        if (this.turn === constants.BLACK) {
            this.fullMoveNumber++;
        }

        // Update turn
        this.loHash ^= polyglot.LO_HASH[polyglot.TURN_OFFSET];
        this.hiHash ^= polyglot.HI_HASH[polyglot.TURN_OFFSET];
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
        this.board[to] = captured === constants.EMPTY ? captured : (captured | opponentTurn);
        this.enPassant = this.currentHistory[0];
        this.castling = this.currentHistory[1];
        this.halfMoveClock = this.currentHistory[4];

        if ((this.board[from] & constants.JUST_PIECE) === constants.KING) {
            this.kings[this.turn] = from;
        }

        switch (bits) {
            case constants.MOVE_BITS_CAPTURE:
                this.pieces[opponentTurn].push(to);
                break;
            case constants.MOVE_BITS_CASTLING:
                var rookFrom = constants.CASTLING_ROOK_FROM[to];
                var rookTo = constants.CASTLING_ROOK_TO[to];
                this.movePieceNoHash(rookTo, rookFrom);
                break;
            case constants.MOVE_BITS_EN_PASSANT:
                var pawnIncrement = this.turn === constants.WHITE ? -15 : 15;
                var destroyedPawn = to + pawnIncrement;
                this.board[destroyedPawn] = constants.PAWN | opponentTurn;
                this.pieces[opponentTurn].push(destroyedPawn);
                break;
            case constants.MOVE_BITS_PROMOTION:
                this.board[from] = constants.PAWN | this.turn;
                // Recategorize in piece list
                this.pieces[this.turn].remove(from);
                this.pieces[this.turn].push(from);
                break;
            case constants.MOVE_BITS_PROMOTION_CAPTURE:
                this.board[from] = constants.PAWN | this.turn;
                this.pieces[opponentTurn].push(to);
                // Recategorize in piece list
                this.pieces[this.turn].remove(from);
                this.pieces[this.turn].push(from);
                break;
        }

        // Decrement full move number after black's turn
        if (this.turn === constants.BLACK) {
            this.fullMoveNumber--;
        }

        this.loHash = this.currentHistory[2];
        this.hiHash = this.currentHistory[3];
    }

    updateCastlingAndKings(from, to) {
        for (var castlingIndex = 0; castlingIndex < constants.CASTLING_INFO.length; castlingIndex++) {
            var castlingInfo = constants.CASTLING_INFO[castlingIndex];
            if ((this.castling & castlingInfo[0]) && (from === castlingInfo[1] || to === castlingInfo[3] || from === castlingInfo[3])) {
                this.castling -= castlingInfo[0];
                this.loHash ^= polyglot.LO_HASH[polyglot.CASTLING_OFFSET + castlingInfo[6]];
                this.hiHash ^= polyglot.HI_HASH[polyglot.CASTLING_OFFSET + castlingInfo[6]];
            }
        }

        if ((this.board[to] & constants.JUST_PIECE) === constants.KING) {
            this.kings[this.turn] = to;
        }
    }

    movePiece(from, to) {
        var zobristIndex = 64 * this.board[from] + 8 * utils.indexToRank(from) + utils.indexToFile(from);
        this.loHash ^= polyglot.LO_HASH[zobristIndex];
        this.hiHash ^= polyglot.HI_HASH[zobristIndex];
        this.board[to] = this.board[from];
        this.board[from] = constants.EMPTY;
        this.pieces[this.turn].remove(from);
        this.pieces[this.turn].push(to);
        zobristIndex = 64 * this.board[to] + 8 * utils.indexToRank(to) + utils.indexToFile(to);
        this.loHash ^= polyglot.LO_HASH[zobristIndex];
        this.hiHash ^= polyglot.HI_HASH[zobristIndex];
    }

    movePieceNoHash(from, to) {
        this.board[to] = this.board[from];
        this.board[from] = constants.EMPTY;
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
                case constants.PAWN:
                    this.pawnMoves(moves, index);
                    break;
                case constants.KNIGHT:
                    this.deltaMoves(moves, constants.DELTA_KNIGHT, index);
                    break;
                case constants.BISHOP:
                    this.slidingMoves(moves, constants.DELTA_BISHOP, index);
                    break;
                case constants.ROOK:
                    this.slidingMoves(moves, constants.DELTA_ROOK, index);
                    break;
                case constants.QUEEN:
                    this.slidingMoves(moves, constants.DELTA_BISHOP, index);
                    this.slidingMoves(moves, constants.DELTA_ROOK, index);
                    break;
                case constants.KING:
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
                case constants.PAWN:
                    this.pawnCaptures(moves, index);
                    this.pawnPromotions(moves, index);
                    break;
                case constants.KNIGHT:
                    this.deltaCaptures(moves, constants.DELTA_KNIGHT, index);
                    break;
                case constants.BISHOP:
                    this.slidingCaptures(moves, constants.DELTA_BISHOP, index);
                    break;
                case constants.ROOK:
                    this.slidingCaptures(moves, constants.DELTA_ROOK, index);
                    break;
                case constants.QUEEN:
                    this.slidingCaptures(moves, constants.DELTA_BISHOP, index);
                    this.slidingCaptures(moves, constants.DELTA_ROOK, index);
                    break;
                case constants.KING:
                    this.deltaCaptures(moves, constants.DELTA_KING, index);
                    break;
            }
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

    polyglotMoveToMoveString(polyglotMove) {
        var toFile          = (polyglotMove & 0b000000000000111);
        var toRank          = (polyglotMove & 0b000000000111000) >> 3;
        var fromFile        = (polyglotMove & 0b000000111000000) >> 6;
        var fromRank        = (polyglotMove & 0b000111000000000) >> 9;
        var promotionPiece  = (polyglotMove & 0b111000000000000) >> 12;

        var moveString = String.fromCharCode(96 + fromFile + 1) +
            (fromRank + 1) +
            String.fromCharCode(96 + toFile + 1) +
            (toRank + 1);

        if (promotionPiece) {
            moveString += constants.POLYGLOT_PROMOTION_STRINGS[promotionPiece];
        }

        // Special case fix for castling
        if (moveString === 'e1h1')
            if (this.kings[constants.WHITE] === 37)
                moveString = 'e1g1';


        if (moveString === 'e1a1')
            if (this.kings[constants.WHITE] === 37)
                moveString = 'e1c1';


        if (moveString === 'e8h8')
            if (this.kings[constants.BLACK] === 142)
                moveString = 'e8g8';


        if (moveString === 'e8a8')
            if (this.kings[constants.BLACK] === 142)
                moveString = 'e8c8';


        return moveString;
    }

    pawnMoves(moves, index) {
        var lastRank = constants.PAWN_LAST_RANK[this.turn];
        var firstRank = constants.PAWN_FIRST_RANK[this.turn]
        var j;

        // Regular push
        var newMove = index - 15 + 30 * this.turn;
        if (this.board[newMove] === constants.EMPTY) {
            if (newMove >= lastRank[0] && newMove <= lastRank[1]) {
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, constants.EMPTY, constants.QUEEN));
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, constants.EMPTY, constants.ROOK));
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, constants.EMPTY, constants.BISHOP));
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, constants.EMPTY, constants.KNIGHT));
            } else {
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PAWN));
            }
        }

        // Double push
        newMove = index - 30 + 60 * this.turn;
        if (this.board[newMove] === constants.EMPTY &&
            this.board[index - 15 + 30 * this.turn] === constants.EMPTY &&
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
        var newMove = index - 15 + 30 * this.turn;
        if (this.board[newMove] === constants.EMPTY && newMove >= lastRank[0] && newMove <= lastRank[1]) {
            moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, constants.EMPTY, constants.QUEEN));
            moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, constants.EMPTY, constants.ROOK));
            moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, constants.EMPTY, constants.BISHOP));
            moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION, constants.EMPTY, constants.KNIGHT));
        }

    }

    pawnCaptures(moves, index) {
        var j, newMove;
        var lastRank = constants.PAWN_LAST_RANK[this.turn];

        for (j = 0; j < 2; j++) {
            // Captures
            newMove = index + (14 + 2 * j) * (this.turn === constants.WHITE ? 1 : -1);
            if (this.board[newMove] !== constants.OUT_OF_BOUNDS && this.board[newMove] !== constants.EMPTY && this.board[newMove] % 2 !== this.turn) {
                if (newMove >= lastRank[0] && newMove <= lastRank[1]) {
                    moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION_CAPTURE, this.board[newMove], constants.QUEEN));
                    moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION_CAPTURE, this.board[newMove], constants.ROOK));
                    moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION_CAPTURE, this.board[newMove], constants.BISHOP));
                    moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_PROMOTION_CAPTURE, this.board[newMove], constants.KNIGHT));
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

        // deltas.length is always 8 for kings/knights
        for (var j = 0; j < 8; j++) {
            newMove = index + deltas[j];
            if (this.board[newMove] === constants.EMPTY) {
                moves.push(utils.createMove(index, newMove));
            } else if (this.board[newMove] !== constants.OUT_OF_BOUNDS && this.board[newMove] % 2 !== this.turn) {
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_CAPTURE, this.board[newMove]));
            }
        }
    }

    deltaCaptures(moves, deltas, index) {
        var newMove;

        for (var j = 0; j < 8; j++) {
            newMove = index + deltas[j];
            if (this.board[newMove] !== constants.OUT_OF_BOUNDS &&
                this.board[newMove] !== constants.EMPTY &&
                this.board[newMove] % 2 !== this.turn) {
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_CAPTURE, this.board[newMove]));
            }
        }
    }

    slidingMoves(moves, deltas, index) {
        var newMove, i;

        // deltas.length is always 4 for sliding moves
        for (i = 0; i < 4; i++) {
            newMove = index;

            do {
                newMove += deltas[i];
                if (this.board[newMove] === constants.EMPTY) {
                    moves.push(utils.createMove(index, newMove));
                } else if (this.board[newMove] !== constants.OUT_OF_BOUNDS && this.board[newMove] % 2 !== this.turn) {
                    moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_CAPTURE, this.board[newMove]));
                }
            } while (this.board[newMove] === constants.EMPTY);
        }
    }

    slidingCaptures(moves, deltas, index) {
        var newMove, i;

        for (i = 0; i < 4; i++) {
            newMove = index;

            do {
                newMove += deltas[i];
            } while (this.board[newMove] !== constants.OUT_OF_BOUNDS && this.board[newMove] === constants.EMPTY);

            if (this.board[newMove] !== constants.OUT_OF_BOUNDS && this.board[newMove] % 2 !== this.turn) {
                moves.push(utils.createMove(index, newMove, constants.MOVE_BITS_CAPTURE, this.board[newMove]));
            }
        }
    }

    castlingMoves(moves) {
        var index = this.turn === constants.WHITE ? 37 : 142;
        var i, j, castlingIndex, castlingInfo, newMove, numberOffset, direction, indexToCheck;

        castlingLoop:
        for (i = 0; i < 2; i++) {
            castlingIndex = i + 2 * this.turn;
            castlingInfo = constants.CASTLING_INFO[castlingIndex];

            if (this.castling & castlingInfo[0]) {
                newMove = castlingInfo[2];
                numberOffset = castlingIndex % 2 === 0 ? 2 : 3;
                direction = castlingIndex % 2 === 0 ? 1 : -1;

                for (j = 1; j <= numberOffset; j++) {
                    indexToCheck = index + j * direction;
                    if (this.board[indexToCheck] !== constants.EMPTY) {
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
            newMove = index + (14 + 2 * j) * (turn === constants.WHITE ? -1 : 1);
            if (this.board[newMove] !== constants.OUT_OF_BOUNDS &&
                this.board[newMove] % 2 === turn &&
                (this.board[newMove] & constants.JUST_PIECE) === constants.PAWN) {
                return true;
            }
        }

        // Delta attacks
        for (k = 2; k < 4; k++) {
            deltas = constants.DELTA_MAP[k][0];
            deltaPiece = constants.DELTA_MAP[k][1];

            for (j = 0; j < 8; j++) {
                newMove = deltas[j] + index;
                if (this.board[newMove] !== constants.OUT_OF_BOUNDS &&
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

                while (this.board[newMove] !== constants.OUT_OF_BOUNDS && this.board[newMove] === constants.EMPTY) {
                    newMove += deltas[j];
                }

                if (this.board[newMove] % 2 === turn &&
                    ((this.board[newMove] & constants.JUST_PIECE) === deltaPiece ||
                        (this.board[newMove] & constants.JUST_PIECE) === constants.QUEEN)) {
                    return true;
                }
            }
        }

        return false;
    }

    isInCheck() {
        return this.isAttacked(this.kings[this.turn], (this.turn) ^ 1);
    }

    initialHash() {
        this.loHash = 0;
        this.hiHash = 0;
        var rankIndex, fileIndex, index, castlingIndex, zobristIndex, enPassantCapture;

        for (rankIndex = 0; rankIndex <= 7; rankIndex++) {
            for (fileIndex = 0; fileIndex <= 7; fileIndex++) {
                index = utils.rankFileToIndex(rankIndex, fileIndex);
                if (this.board[index] !== constants.EMPTY) {
                    zobristIndex = 64 * this.board[index] + 8 * rankIndex + fileIndex;
                    this.loHash ^= polyglot.LO_HASH[zobristIndex];
                    this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                }
            }
        }

        if (this.enPassant) {
            for (var j = 0; j < 2; j++) {
                index = this.enPassant + (14 + 2 * j) * (this.turn === constants.WHITE ? 1 : -1);
                if (this.board[index] !== constants.OUT_OF_BOUNDS &&
                    this.board[index] % 2 === (this.turn ^ 1) &&
                    (this.board[index] & constants.JUST_PIECE) === constants.PAWN) {
                    enPassantCapture = true;
                    break;
                }
            }

            if (enPassantCapture) {
                zobristIndex = polyglot.EN_PASSANT_OFFSET + utils.indexToFile(this.enPassant);
                this.loHash ^= polyglot.LO_HASH[zobristIndex];
                this.hiHash ^= polyglot.HI_HASH[zobristIndex];
            }
        }

        if (this.castling) {
            for (castlingIndex = 0; castlingIndex < 4; castlingIndex++) {
                if (this.castling & (1 << castlingIndex)) {
                    zobristIndex = polyglot.CASTLING_OFFSET + castlingIndex;
                    this.loHash ^= polyglot.LO_HASH[zobristIndex];
                    this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                }
            }
        }

        if (this.turn === constants.WHITE) {
            this.loHash ^= polyglot.LO_HASH[polyglot.TURN_OFFSET];
            this.hiHash ^= polyglot.HI_HASH[polyglot.TURN_OFFSET];
        }
    }

    get hashString() {
        return utils.unsignedHexString(this.hiHash) + utils.unsignedHexString(this.loHash);
    }

    // Outputs MVV/LVA score for move, scaled from 0-63
    // Inspired by Laser's implementation
    mvvLva(move) {
        var captured = utils.moveCaptured(move);

        if (captured === constants.EMPTY) {
            return 0;
        }

        var from = utils.moveFrom(move);
        var attacker = this.board[from] & constants.JUST_PIECE;

        return (constants.MVV_LVA_PIECE_VALUES[captured] * 5 + 5 - constants.MVV_LVA_PIECE_VALUES[attacker]) | 0;
    }

    maxRepetitions() {
        var repetitionsByKey = {};
        var key;
        var maxRep = 0;

        for (var i = 0; i < this.history.length; i++) {
            key = this.history[i][3].toString(16) + this.history[i][2].toString(16);

            if (!repetitionsByKey[key]) {
                repetitionsByKey[key] = 0;
            }

            repetitionsByKey[key]++;

            if (repetitionsByKey[key] > maxRep) {
                maxRep = repetitionsByKey[key];
            }
        }

        return maxRep;
    }
};