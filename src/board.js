'use strict';

const utils = require('./utils');
const polyglot = require('./polyglot');
const BoardPieceList = require('./piece_list').BoardPieceList;
const {
    ATTACK_NONE,
    ATTACK_DIAGONAL,
    ATTACK_HORIZONTAL,
    ATTACK_VERTICAL,
    ATTACK_KNIGHT,
    ATTACK_KING,
    ATTACK_PAWN,
    ATTACK_PIECE_ORDER,
    BISHOP,
    BLACK,
    CASTLING,
    CASTLING_INFO,
    CASTLING_ROOK_FROM,
    CASTLING_ROOK_TO,
    DELTA_BISHOP,
    DELTA_KING,
    DELTA_KNIGHT,
    DELTA_MAP,
    DELTA_ROOK,
    EMPTY,
    FEN_BOARD_REGEX,
    INVERSE_PIECE_MAP,
    JUST_PIECE,
    KING,
    KNIGHT,
    MOVE_BITS_CAPTURE,
    MOVE_BITS_CASTLING,
    MOVE_BITS_DOUBLE_PAWN,
    MOVE_BITS_EMPTY,
    MOVE_BITS_EN_PASSANT,
    MOVE_BITS_PAWN,
    MOVE_BITS_PROMOTION,
    MOVE_BITS_PROMOTION_CAPTURE,
    MVV_LVA_PIECE_VALUES,
    OUT_OF_BOUNDS,
    PAWN,
    PAWN_FIRST_RANK,
    PAWN_LAST_RANK,
    PIECE_MAP,
    POLYGLOT_PROMOTION_STRINGS,
    QUEEN,
    ROOK,
    WHITE,
} = require('./constants');
const {
    ATTACK_LOOKUP,
    DELTA_LOOKUP,
} = require('./lookup');

module.exports = class Board {
    constructor() {
        this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }

    emptyBoard() {
        this.resetHistory();
        this.board = utils.getEmptyBoardArray();
        this.pieces = [new BoardPieceList(this), new BoardPieceList(this)];
        this.castling = 0;
        this.enPassant = null;
        this.turn = WHITE;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.kings = new Uint32Array(2);
        this.hiHash = 0;
        this.loHash = 0;
        this.pawnHiHash = 0;
        this.pawnLoHash = 0;
    }

    get fen() {
        var board = [];
        var rankIndex, fileOffset, rankBoard, fileIndex, piece, index;

        for (rankIndex = 7; rankIndex >= 0; rankIndex--) {
            fileOffset = 0;
            rankBoard = '';

            for (fileIndex = 0; fileIndex <= 7; fileIndex++) {
                index = utils.rankFileToIndex(rankIndex, fileIndex);

                if (this.board[index] !== EMPTY) {
                    if (fileOffset > 0) {
                        rankBoard += fileOffset;
                        fileOffset = 0;
                    }

                    piece = INVERSE_PIECE_MAP[this.board[index] & JUST_PIECE];

                    if (this.board[index] % 2 === WHITE) {
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
        var turn = this.turn === WHITE ? 'w' : 'b';
        var castling = '';

        if (this.castling) {
            // Odd loop order
            [2, 3, 0, 1].forEach(castlingIndex => {
                var castlingInfo = CASTLING_INFO[castlingIndex];
                if (this.castling & CASTLING_INFO[castlingIndex][0]) {
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
        if (!FEN_BOARD_REGEX.test(fen)) {
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
                    var turn = piece.toUpperCase() === piece ? WHITE : BLACK;
                    this.addPiece(rankIndex, fileIndex, piece, turn);
                    fileIndex++;
                }
            });
        });

        this.turn = parts[1] === 'w' ? WHITE : BLACK;
        this.castling = 0;

        parts[2].split('').forEach(castling => {
            if (castling === '-') {
                return;
            }

            this.castling += CASTLING[castling];
        });

        this.enPassant = parts[3] === '-' ? null : utils.algebraicToIndex(parts[3]);
        this.halfMoveClock = parseInt(parts[4], 10);
        this.fullMoveNumber = parseInt(parts[5], 10);
        this.initialHash();
    }

    addPiece(rankIndex, fileIndex, piece, turn) {
        var index = utils.rankFileToIndex(rankIndex, fileIndex);
        var pieceValue = PIECE_MAP[piece.toLowerCase()];
        this.board[index] = pieceValue | turn;
        this.pieces[turn].push(index);
        if (pieceValue === KING) {
            this.kings[turn] = index;
        }
    }

    addHistory() {
        this.currentHistory = [this.enPassant, this.castling, this.loHash, this.hiHash, this.pawnLoHash, this.pawnHiHash, this.halfMoveClock];
        this.history.push(this.currentHistory);
    }

    subtractHistory() {
        this.history.pop();
        this.currentHistory = this.history.length ? this.history[this.history.length - 1] : undefined;
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
        var zobristIndex, afterZobristIndex;
        var direction, pawnIncrement, promotion;

        if (this.enPassant) {
            direction = this.turn === WHITE ? 1 : -1;

            // opponentTurn === opponentPiece, because pawn offset is 0
            if (this.board[this.enPassant - 14 * direction] === this.turn || this.board[this.enPassant - 16 * direction] === this.turn) {
                zobristIndex = polyglot.EN_PASSANT_OFFSET + utils.indexToFile(this.enPassant);
                this.loHash ^= polyglot.LO_HASH[zobristIndex];
                this.hiHash ^= polyglot.HI_HASH[zobristIndex];
            }
        }

        this.enPassant = null;

        switch (bits) {
            case MOVE_BITS_EMPTY:
                this.movePiece(from, to);
                this.updateCastlingAndKings(from, to);
                this.halfMoveClock++;
                break;
            case MOVE_BITS_CAPTURE:
                zobristIndex = 64 * this.board[to] + 8 * utils.indexToRank(to) + utils.indexToFile(to);
                this.loHash ^= polyglot.LO_HASH[zobristIndex];
                this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                this.pieces[opponentTurn].remove(to);
                this.movePiece(from, to);
                this.updateCastlingAndKings(from, to);
                this.halfMoveClock = 0;
                break;
            case MOVE_BITS_CASTLING:
                this.movePiece(from, to);
                var rookFrom = CASTLING_ROOK_FROM[to];
                var rookTo = CASTLING_ROOK_TO[to];
                direction = to > from ? 1 : -1;
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
            case MOVE_BITS_EN_PASSANT:
                this.movePiece(from, to);
                pawnIncrement = this.turn === WHITE ? -15 : 15;
                var destroyedPawn = to + pawnIncrement;
                this.pieces[opponentTurn].remove(destroyedPawn);
                zobristIndex = 64 * this.board[destroyedPawn] + 8 * utils.indexToRank(destroyedPawn) + utils.indexToFile(destroyedPawn);
                this.loHash ^= polyglot.LO_HASH[zobristIndex];
                this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                this.board[destroyedPawn] = EMPTY;
                this.halfMoveClock = 0;
                break;
            case MOVE_BITS_PAWN:
                this.movePiece(from, to);
                this.halfMoveClock = 0;
                break;
            case MOVE_BITS_DOUBLE_PAWN:
                this.movePiece(from, to);
                pawnIncrement = this.turn === WHITE ? 15 : -15;
                direction = this.turn === WHITE ? -1 : 1;
                this.enPassant = from + pawnIncrement;

                if (this.board[this.enPassant - 14 * direction] === opponentTurn || this.board[this.enPassant - 16 * direction] === opponentTurn) {
                    zobristIndex = polyglot.EN_PASSANT_OFFSET + utils.indexToFile(this.enPassant);
                    this.loHash ^= polyglot.LO_HASH[zobristIndex];
                    this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                }

                this.halfMoveClock = 0;
                break;
            case MOVE_BITS_PROMOTION:
                this.movePiece(from, to);
                zobristIndex = 64 * this.board[to] + 8 * utils.indexToRank(to) + utils.indexToFile(to);
                promotion = utils.movePromotion(move);
                this.board[to] = promotion | this.turn;
                afterZobristIndex = 64 * this.board[to] + 8 * utils.indexToRank(to) + utils.indexToFile(to);
                // Recategorize in piece list
                this.pieces[this.turn].remove(to);
                this.pieces[this.turn].push(to);
                // Recategorize in hash
                this.loHash ^= polyglot.LO_HASH[zobristIndex];
                this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                this.loHash ^= polyglot.LO_HASH[afterZobristIndex];
                this.hiHash ^= polyglot.HI_HASH[afterZobristIndex];
                this.pawnLoHash ^= polyglot.LO_HASH[afterZobristIndex];
                this.pawnHiHash ^= polyglot.HI_HASH[afterZobristIndex];
                this.halfMoveClock = 0;
                break;
            case MOVE_BITS_PROMOTION_CAPTURE:
                zobristIndex = 64 * this.board[to] + 8 * utils.indexToRank(to) + utils.indexToFile(to);
                this.loHash ^= polyglot.LO_HASH[zobristIndex];
                this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                this.pieces[opponentTurn].remove(to);
                this.movePiece(from, to);
                promotion = utils.movePromotion(move);
                this.board[to] = promotion | this.turn;
                afterZobristIndex = 64 * this.board[to] + 8 * utils.indexToRank(to) + utils.indexToFile(to);
                // Recategorize in piece list
                this.pieces[this.turn].remove(to);
                this.pieces[this.turn].push(to);
                this.updateCastlingAndKings(from, to);
                // Recategorize in hash
                this.loHash ^= polyglot.LO_HASH[zobristIndex];
                this.hiHash ^= polyglot.HI_HASH[zobristIndex];
                this.loHash ^= polyglot.LO_HASH[afterZobristIndex];
                this.hiHash ^= polyglot.HI_HASH[afterZobristIndex];
                this.pawnLoHash ^= polyglot.LO_HASH[afterZobristIndex];
                this.pawnHiHash ^= polyglot.HI_HASH[afterZobristIndex];
                this.halfMoveClock = 0;
                break;
        }

        // Increment full move number after black's turn
        if (this.turn === BLACK) {
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
        this.turn = opponentTurn ^ 1;
        this.movePieceNoHash(to, from);
        this.board[to] = captured === EMPTY ? captured : (captured | opponentTurn);
        this.enPassant = this.currentHistory[0];
        this.castling = this.currentHistory[1];
        this.halfMoveClock = this.currentHistory[6];

        if ((this.board[from] & JUST_PIECE) === KING) {
            this.kings[this.turn] = from;
        }

        switch (bits) {
            case MOVE_BITS_CAPTURE:
                this.pieces[opponentTurn].push(to);
                break;
            case MOVE_BITS_CASTLING:
                var rookFrom = CASTLING_ROOK_FROM[to];
                var rookTo = CASTLING_ROOK_TO[to];
                this.movePieceNoHash(rookTo, rookFrom);
                break;
            case MOVE_BITS_EN_PASSANT:
                var pawnIncrement = this.turn === WHITE ? -15 : 15;
                var destroyedPawn = to + pawnIncrement;
                this.board[destroyedPawn] = PAWN | opponentTurn;
                this.pieces[opponentTurn].push(destroyedPawn);
                break;
            case MOVE_BITS_PROMOTION:
                this.board[from] = PAWN | this.turn;
                // Recategorize in piece list
                this.pieces[this.turn].remove(from);
                this.pieces[this.turn].push(from);
                break;
            case MOVE_BITS_PROMOTION_CAPTURE:
                this.board[from] = PAWN | this.turn;
                this.pieces[opponentTurn].push(to);
                // Recategorize in piece list
                this.pieces[this.turn].remove(from);
                this.pieces[this.turn].push(from);
                break;
        }

        // Decrement full move number after black's turn
        if (this.turn === BLACK) {
            this.fullMoveNumber--;
        }

        this.loHash = this.currentHistory[2];
        this.hiHash = this.currentHistory[3];
        this.pawnLoHash = this.currentHistory[4];
        this.pawnHiHash = this.currentHistory[5];
    }

    updateCastlingAndKings(from, to) {
        for (var castlingIndex = 0; castlingIndex < CASTLING_INFO.length; castlingIndex++) {
            var castlingInfo = CASTLING_INFO[castlingIndex];
            if ((this.castling & castlingInfo[0]) && (from === castlingInfo[1] || to === castlingInfo[3] || from === castlingInfo[3])) {
                this.castling -= castlingInfo[0];
                this.loHash ^= polyglot.LO_HASH[polyglot.CASTLING_OFFSET + castlingInfo[6]];
                this.hiHash ^= polyglot.HI_HASH[polyglot.CASTLING_OFFSET + castlingInfo[6]];
            }
        }

        if ((this.board[to] & JUST_PIECE) === KING) {
            this.kings[this.turn] = to;
        }
    }

    movePiece(from, to) {
        var zobristIndex = 64 * this.board[from] + 8 * utils.indexToRank(from) + utils.indexToFile(from);
        var isPawn = (this.board[from] & JUST_PIECE) === PAWN;
        this.loHash ^= polyglot.LO_HASH[zobristIndex];
        this.hiHash ^= polyglot.HI_HASH[zobristIndex];
        if (isPawn) {
            this.pawnLoHash ^= polyglot.LO_HASH[zobristIndex];
            this.pawnHiHash ^= polyglot.HI_HASH[zobristIndex];
        }
        this.board[to] = this.board[from];
        this.board[from] = EMPTY;
        this.pieces[this.turn].remove(from);
        this.pieces[this.turn].push(to);
        zobristIndex = 64 * this.board[to] + 8 * utils.indexToRank(to) + utils.indexToFile(to);
        this.loHash ^= polyglot.LO_HASH[zobristIndex];
        this.hiHash ^= polyglot.HI_HASH[zobristIndex];
        if (isPawn) {
            this.pawnLoHash ^= polyglot.LO_HASH[zobristIndex];
            this.pawnHiHash ^= polyglot.HI_HASH[zobristIndex];
        }
    }

    movePieceNoHash(from, to) {
        this.board[to] = this.board[from];
        this.board[from] = EMPTY;
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
            piece = this.board[index] & JUST_PIECE;

            switch (piece) {
                case PAWN:
                    this.pawnMoves(moves, index);
                    break;
                case KNIGHT:
                    this.deltaMoves(moves, DELTA_KNIGHT, index);
                    break;
                case BISHOP:
                    this.slidingMoves(moves, DELTA_BISHOP, index);
                    break;
                case ROOK:
                    this.slidingMoves(moves, DELTA_ROOK, index);
                    break;
                case QUEEN:
                    this.slidingMoves(moves, DELTA_BISHOP, index);
                    this.slidingMoves(moves, DELTA_ROOK, index);
                    break;
                case KING:
                    this.deltaMoves(moves, DELTA_KING, index);
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
            piece = this.board[index] & JUST_PIECE;

            switch (piece) {
                case PAWN:
                    this.pawnCaptures(moves, index);
                    this.pawnPromotions(moves, index);
                    break;
                case KNIGHT:
                    this.deltaCaptures(moves, DELTA_KNIGHT, index);
                    break;
                case BISHOP:
                    this.slidingCaptures(moves, DELTA_BISHOP, index);
                    break;
                case ROOK:
                    this.slidingCaptures(moves, DELTA_ROOK, index);
                    break;
                case QUEEN:
                    this.slidingCaptures(moves, DELTA_BISHOP, index);
                    this.slidingCaptures(moves, DELTA_ROOK, index);
                    break;
                case KING:
                    this.deltaCaptures(moves, DELTA_KING, index);
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
            moveString += POLYGLOT_PROMOTION_STRINGS[promotionPiece];
        }

        // Special case fix for castling
        if (moveString === 'e1h1')
            if (this.kings[WHITE] === 37)
                moveString = 'e1g1';


        if (moveString === 'e1a1')
            if (this.kings[WHITE] === 37)
                moveString = 'e1c1';


        if (moveString === 'e8h8')
            if (this.kings[BLACK] === 142)
                moveString = 'e8g8';


        if (moveString === 'e8a8')
            if (this.kings[BLACK] === 142)
                moveString = 'e8c8';


        return moveString;
    }

    pawnMoves(moves, index) {
        var lastRank = PAWN_LAST_RANK[this.turn];
        var firstRank = PAWN_FIRST_RANK[this.turn];

        // Regular push
        var newMove = index - 15 + 30 * this.turn;
        if (this.board[newMove] === EMPTY) {
            if (newMove >= lastRank[0] && newMove <= lastRank[1]) {
                moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION, EMPTY, QUEEN));
                moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION, EMPTY, ROOK));
                moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION, EMPTY, BISHOP));
                moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION, EMPTY, KNIGHT));
            } else {
                moves.push(utils.createMove(index, newMove, MOVE_BITS_PAWN));
            }
        }

        // Double push
        newMove = index - 30 + 60 * this.turn;
        if (this.board[newMove] === EMPTY &&
            this.board[index - 15 + 30 * this.turn] === EMPTY &&
            index >= firstRank[0] && index <= firstRank[1]) {
            moves.push(utils.createMove(index, newMove, MOVE_BITS_DOUBLE_PAWN));
        }

        this.pawnCaptures(moves, index);
    }

    pawnPromotions(moves, index) {
        var lastRank = PAWN_LAST_RANK[this.turn];

        // Regular push promotions
        // Capture promotions are handled by pawnCaptures
        var newMove = index - 15 + 30 * this.turn;
        if (this.board[newMove] === EMPTY && newMove >= lastRank[0] && newMove <= lastRank[1]) {
            moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION, EMPTY, QUEEN));
            moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION, EMPTY, ROOK));
            moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION, EMPTY, BISHOP));
            moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION, EMPTY, KNIGHT));
        }

    }

    pawnCaptures(moves, index) {
        var newMove = 0;
        var lastRank = PAWN_LAST_RANK[this.turn];
        var square = 0;

        for (var j = 0; j < 2; j++) {
            // Captures
            newMove = index + (14 + 2 * j) * (this.turn === WHITE ? 1 : -1);
            square = this.board[newMove];
            if (square !== OUT_OF_BOUNDS && square !== EMPTY && square % 2 !== this.turn) {
                if (newMove >= lastRank[0] && newMove <= lastRank[1]) {
                    moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION_CAPTURE, square, QUEEN));
                    moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION_CAPTURE, square, ROOK));
                    moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION_CAPTURE, square, BISHOP));
                    moves.push(utils.createMove(index, newMove, MOVE_BITS_PROMOTION_CAPTURE, square, KNIGHT));
                } else {
                    moves.push(utils.createMove(index, newMove, MOVE_BITS_CAPTURE, square));
                }
            }

            // En passant
            if (newMove === this.enPassant) {
                moves.push(utils.createMove(index, newMove, MOVE_BITS_EN_PASSANT, square));
            }
        }
    }

    deltaMoves(moves, deltas, index) {
        var newMove = 0;
        var square = 0;

        // deltas.length is always 8 for kings/knights
        for (var j = 0; j < 8; j++) {
            newMove = index + deltas[j];
            square = this.board[newMove];
            if (square === EMPTY) {
                moves.push(utils.createMove(index, newMove));
            } else if (square !== OUT_OF_BOUNDS && square % 2 !== this.turn) {
                moves.push(utils.createMove(index, newMove, MOVE_BITS_CAPTURE, square));
            }
        }
    }

    deltaMoveCount(deltas, index, turn) {
        var newMove = 0;
        var square = 0;
        var count = 0;

        // deltas.length is always 8 for kings/knights
        for (var j = 0; j < 8; j++) {
            newMove = index + deltas[j];
            square = this.board[newMove];
            if (square === EMPTY) {
                count++;
            } else if (square !== OUT_OF_BOUNDS && square % 2 !== turn) {
                count++;
            }
        }

        return count;
    }

    deltaCaptures(moves, deltas, index) {
        var newMove = 0;
        var square = 0;

        for (var j = 0; j < 8; j++) {
            newMove = index + deltas[j];
            square = this.board[newMove];
            if (square !== OUT_OF_BOUNDS && square !== EMPTY && square % 2 !== this.turn) {
                moves.push(utils.createMove(index, newMove, MOVE_BITS_CAPTURE, square));
            }
        }
    }

    slidingMoves(moves, deltas, index) {
        var newMove = 0;
        var square = 0;
        var delta = 0;

        // deltas.length is always 4 for sliding moves
        for (var i = 0; i < 4; i++) {
            newMove = index;
            delta = deltas[i];

            do {
                newMove += delta;
                square = this.board[newMove];
                if (square === EMPTY) {
                    moves.push(utils.createMove(index, newMove));
                } else if (square !== OUT_OF_BOUNDS && square % 2 !== this.turn) {
                    moves.push(utils.createMove(index, newMove, MOVE_BITS_CAPTURE, square));
                }
            } while (square === EMPTY);
        }
    }

    slidingMoveCount(deltas, index, turn) {
        var newMove = 0;
        var square = 0;
        var delta = 0;
        var count = 0;

        // deltas.length is always 4 for sliding moves
        for (var i = 0; i < 4; i++) {
            newMove = index;
            delta = deltas[i];

            do {
                newMove += delta;
                square = this.board[newMove];
                if (square === EMPTY) {
                    count++;
                } else if (square !== OUT_OF_BOUNDS && square % 2 !== turn) {
                    count++;
                }
            } while (square === EMPTY);
        }
        return count;
    }

    slidingCaptures(moves, deltas, index) {
        var newMove = 0;
        var square = 0;
        var delta = 0;

        for (var i = 0; i < 4; i++) {
            newMove = index;
            delta = deltas[i];

            do {
                newMove += delta;
                square = this.board[newMove];
            } while (square !== OUT_OF_BOUNDS && square === EMPTY);

            if (square !== OUT_OF_BOUNDS && square % 2 !== this.turn) {
                moves.push(utils.createMove(index, newMove, MOVE_BITS_CAPTURE, square));
            }
        }
    }

    castlingMoves(moves) {
        var index = this.turn === WHITE ? 37 : 142;
        var j = 0;
        var castlingIndex = 0;
        var newMove = 0;
        var numberOffset = 0;
        var direction = 0;
        var indexToCheck = 0;
        var castlingInfo;

        castlingLoop:
        for (var i = 0; i < 2; i++) {
            castlingIndex = i + 2 * this.turn;
            castlingInfo = CASTLING_INFO[castlingIndex];

            if (this.castling & castlingInfo[0]) {
                newMove = castlingInfo[2];
                numberOffset = castlingIndex % 2 === 0 ? 2 : 3;
                direction = castlingIndex % 2 === 0 ? 1 : -1;

                for (j = 1; j <= numberOffset; j++) {
                    indexToCheck = index + j * direction;
                    if (this.board[indexToCheck] !== EMPTY) {
                        continue castlingLoop;
                    }
                }

                moves.push(utils.createMove(index, newMove, MOVE_BITS_CASTLING));
            }
        }
    }

    isAttackedPawn(index, turn) {
        var newMove = 0;
        var square = 0;

        // Pawns
        for (var j = 0; j < 2; j++) {
            newMove = index + (14 + 2 * j) * (turn === WHITE ? -1 : 1);
            square = this.board[newMove];
            if (square !== OUT_OF_BOUNDS && square % 2 === turn && (square & JUST_PIECE) === PAWN) {
                return true;
            }
        }
        return false;
    }

    isAttackedDelta(index, turn) {
        var newMove = 0, deltas, deltaPiece;
        var square = 0;
        var j = 0;

        // Delta attacks
        for (var k = 2; k < 4; k++) {
            deltas = DELTA_MAP[k][0];
            deltaPiece = DELTA_MAP[k][1];

            for (j = 0; j < 8; j++) {
                newMove = deltas[j] + index;
                square = this.board[newMove];
                if (square !== OUT_OF_BOUNDS && square % 2 === turn && (square & JUST_PIECE) === deltaPiece) {
                    return true;
                }
            }
        }
        return false;
    }

    isAttackedSliding(index, turn) {
        var newMove, deltas, deltaPiece, pieceOnSquare, j, k, hasQueen;
        var square = 0;

        hasQueen = this.pieces[turn].pieces[QUEEN].length > 0;

        // Sliding attacks
        for (k = 0; k < 2; k++) {
            deltas = DELTA_MAP[k][0];
            deltaPiece = DELTA_MAP[k][1];

            // Skip if there's no possible piece on the board
            if (!hasQueen && this.pieces[turn].pieces[deltaPiece].length === 0) {
                continue;
            }

            for (j = 0; j < 4; j++) {
                newMove = index + deltas[j];
                square = this.board[newMove];

                while (square !== OUT_OF_BOUNDS && square === EMPTY) {
                    newMove += deltas[j];
                    square = this.board[newMove];
                }

                if (square % 2 === turn) {
                    pieceOnSquare = square & JUST_PIECE;

                    if (pieceOnSquare === deltaPiece || pieceOnSquare === QUEEN) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isAttackedOld(index, turn) {
        return this.isAttackedPawn(index, turn) || this.isAttackedDelta(index, turn) ||  this.isAttackedSliding(index, turn);
    }

    isAttacked(index, turn) {
        const rootPieceList = this.pieces[turn].pieces;
        var i, j, attackPiece, pieceList, pieceIndex, diff, absDiff, attacks, delta;

        for (i = 0; i < ATTACK_PIECE_ORDER.length; i++) {
            attackPiece = ATTACK_PIECE_ORDER[i];
            pieceList = rootPieceList[ATTACK_PIECE_ORDER[i]];

            for (j = 0; j < pieceList.length; j++) {
                pieceIndex = pieceList.indices[j];
                diff = index - pieceIndex;
                absDiff = Math.abs(diff);

                // Determine if piece qualifies for an attack
                attacks = ATTACK_LOOKUP[absDiff];

                if (attacks === ATTACK_NONE) {
                    continue;
                }

                // Delta check
                if ((attacks & ATTACK_PAWN && attackPiece === PAWN && ((diff > 0 && turn === WHITE) || (diff < 0 && turn === BLACK))) ||
                    (attacks & ATTACK_KNIGHT && attackPiece === KNIGHT) ||
                    (attacks & ATTACK_KING && attackPiece === KING)) {
                    return true;
                }

                // Sliding checks
                if ((attacks & ATTACK_DIAGONAL && (attackPiece === BISHOP || attackPiece === QUEEN)) ||
                    (attacks & ATTACK_VERTICAL && (attackPiece === ROOK || attackPiece === QUEEN)) ||
                    (attacks & ATTACK_HORIZONTAL && (attackPiece === ROOK || attackPiece === QUEEN))) {

                    // Lookup delta, match sign
                    delta = DELTA_LOOKUP[absDiff];
                    if (diff > 0) {
                        delta = -1 * delta;
                    }

                    const emptyInBetween = this.isInBetweenEmpty(index, pieceIndex, delta);

                    if (emptyInBetween) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    isInBetweenEmpty(index, otherIndex, delta) {
        var newMove = index + delta;

        while (this.board[newMove] === EMPTY && newMove !== otherIndex) {
            newMove += delta;
        }

        if (newMove === otherIndex) {
            return true;
        }

        return false;
    }

    isInCheck() {
        return this.isAttacked(this.kings[this.turn], (this.turn) ^ 1);
    }

    initialHash() {
        this.loHash = 0;
        this.hiHash = 0;
        this.pawnLoHash = 0;
        this.pawnHiHash = 0;
        var rankIndex, fileIndex, index, castlingIndex, zobristIndex, enPassantCapture;

        for (rankIndex = 0; rankIndex <= 7; rankIndex++) {
            for (fileIndex = 0; fileIndex <= 7; fileIndex++) {
                index = utils.rankFileToIndex(rankIndex, fileIndex);
                if (this.board[index] !== EMPTY) {
                    zobristIndex = 64 * this.board[index] + 8 * rankIndex + fileIndex;
                    this.loHash ^= polyglot.LO_HASH[zobristIndex];
                    this.hiHash ^= polyglot.HI_HASH[zobristIndex];

                    if ((this.board[index] & JUST_PIECE) === PAWN) {
                        this.pawnLoHash ^= polyglot.LO_HASH[zobristIndex];
                        this.pawnHiHash ^= polyglot.HI_HASH[zobristIndex];
                    }
                }
            }
        }

        if (this.enPassant) {
            for (var j = 0; j < 2; j++) {
                index = this.enPassant + (14 + 2 * j) * (this.turn === WHITE ? 1 : -1);
                if (this.board[index] !== OUT_OF_BOUNDS &&
                    this.board[index] % 2 === (this.turn ^ 1) &&
                    (this.board[index] & JUST_PIECE) === PAWN) {
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

        if (this.turn === WHITE) {
            this.loHash ^= polyglot.LO_HASH[polyglot.TURN_OFFSET];
            this.hiHash ^= polyglot.HI_HASH[polyglot.TURN_OFFSET];
        }
    }

    get hashString() {
        return utils.unsignedHexString(this.hiHash) + utils.unsignedHexString(this.loHash);
    }

    get pawnHashString() {
        return utils.unsignedHexString(this.pawnHiHash) + utils.unsignedHexString(this.pawnLoHash);
    }

    // Outputs MVV/LVA score for move, scaled from 0-63
    // Inspired by Laser's implementation
    mvvLva(move) {
        var captured = utils.moveCaptured(move);

        if (captured === EMPTY) {
            return 0;
        }

        var fromIndex = utils.moveFrom(move);
        var attacker = this.board[fromIndex] & JUST_PIECE;

        return (MVV_LVA_PIECE_VALUES[captured] * 5 + 5 - MVV_LVA_PIECE_VALUES[attacker]) | 0;
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

    toggleTurn() {
        this.turn ^= 1;
        this.loHash ^= polyglot.LO_HASH[polyglot.TURN_OFFSET];
        this.hiHash ^= polyglot.HI_HASH[polyglot.TURN_OFFSET];
    }
};