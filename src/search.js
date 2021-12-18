'use strict';

const {
    EMPTY,
    HASH_EXACT,
    HASH_ALPHA,
    HASH_BETA,
    JUST_PIECE,
    MATE_VALUE,
    MOVE_ORDER_FIRST,
    MOVE_ORDER_SECOND,
    MOVE_SANS_ORDER_MASK,
    MVV_LVA_OFFSET,
    MVV_LVA_PIECE_VALUES,
    RELATIVE_HISTORY_SCALE,
} = require('./constants');
const Evaluate = require('./evaluate');
const { NativeHashTable } = require('./hash_table');
const utils = require('./utils');

module.exports = class Search {
    constructor() {
        this.evaluate = new Evaluate();
        this.searchTable = new NativeHashTable(10, 2);
        this.timeDiffCount = 0;
        this.lastTime = 0;

        // 64 from * 64 to * 2 turns => 64*64*2
        this.historyHeuristic = [
            new Uint32Array(64*64),
            new Uint32Array(64*64),
        ];
        this.butterflyHeuristic = [
            new Uint32Array(64*64),
            new Uint32Array(64*64),
        ];
    }

    set hashSize(exponent=1) {
        this.searchTable = new NativeHashTable(exponent, 2);
    }

    minimax(board, depth) {
        if (depth === 0) {
            return this.evaluate.evaluate(board);
        }

        var max = -Infinity, score;
        var move, moves = board.generateMoves();
        board.addHistory();

        for (var i = 0; i < moves.length; i++) {
            move = moves[i];

            if (board.addMove(move)) {
                score = -this.minimax(board, depth - 1);

                if (score > max) {
                    max = score;
                    this.pv[this.ply][depth] = move;
                }

                board.subtractMove(move);
            }
        }

        board.subtractHistory();

        return max;
    }

    // Outputs MVV/LVA score for move, scaled from (0-63) => 190-253
    // Inspired by Laser's implementation
    mvvLva(board, move) {
        var captured = utils.moveCaptured(move);

        if (captured === EMPTY) {
            return 0;
        }

        var fromIndex = utils.moveFrom(move);
        var attacker = board.board[fromIndex] & JUST_PIECE;

        const x = ((MVV_LVA_PIECE_VALUES[captured] * 5 + 5 - MVV_LVA_PIECE_VALUES[attacker]) | 0) + MVV_LVA_OFFSET;
        return x;
    }

    relativeHistory(turn, move) {
        const index = utils.historyIndex(move);
        if (this.butterflyHeuristic[turn][index]) {
            return Math.floor(this.historyHeuristic[turn][index] * RELATIVE_HISTORY_SCALE / this.butterflyHeuristic[turn][index]);
        }
        return 0;
    }

    search(board, alpha, beta, depth) {
        if (this.endedEarly) {
            return;
        }

        if (this.timeDiff() >= this.timePerMove) {
            this.endedEarly = true;
            return;
        }

        var ttEntry = this.searchTable.get(board.loHash, board.hiHash);
        var maxMove = 0;
        var ttMove, ttData, ttDepth = 0, ttFlag, ttScore;

        if (ttEntry) {
            [ttMove, ttData] = ttEntry;
            [ttDepth, ttFlag, ttScore] = utils.unpackSearchEntry(ttData);

            if (ttDepth >= depth) {
                maxMove = ttMove;
                if (ttFlag === HASH_ALPHA && ttScore < alpha) {
                    alpha = ttScore;
                } else if (ttFlag === HASH_BETA && ttScore > beta) {
                    beta = ttScore;
                } else if (ttFlag === HASH_EXACT) {
                    this.pv[this.ply][depth] = ttMove;
                    return ttScore;
                }
            }
        }

        if (depth === 0) {
            return this.qsearch(board, alpha, beta);
        }

        var score;
        var searchedMoves = 0;
        var move, moves = board.generateMoves();

        // Add move ordering (Hash + iterative deepening PV + MVV/LVA)
        for (var i = 0; i < moves.length; i++) {
            if (moves[i] === maxMove) {
                moves[i] = utils.moveAddOrder(moves[i], MOVE_ORDER_FIRST);
            } else if (this.pv[this.ply].length && moves[i] === this.pv[this.ply - 1][this.ply - 1]) {
                moves[i] = utils.moveAddOrder(moves[i], MOVE_ORDER_SECOND);
            } else if (utils.moveCaptured(moves[i])) {
                moves[i] = utils.moveAddOrder(moves[i], this.mvvLva(board, moves[i]) + this.relativeHistory(board.turn, moves[i]));
            } else {
                moves[i] = utils.moveAddOrder(moves[i], this.relativeHistory(board.turn, moves[i]));
            }
        }
        moves.sort(utils.reverseOrder);

        board.addHistory();

        // PVS search
        var alphaMove = 0;

        for (i = 0; i < moves.length; i++) {
            move = moves[i] & MOVE_SANS_ORDER_MASK;
            const historyIndex = utils.historyIndex(move);

            if (board.addMove(move)) {
                searchedMoves++;

                if (!alphaMove) {
                    score = -this.search(board, -beta, -alpha, depth - 1);
                } else {
                    score = -this.search(board, -alpha - 1, -alpha, depth - 1);

                    if (score > alpha) {
                        score = -this.search(board, -beta, -alpha, depth - 1);
                    }
                }

                board.subtractMove(move);

                this.butterflyHeuristic[board.turn][historyIndex] += 1;
                if (score >= beta) {
                    board.subtractHistory();

                    if (depth > ttDepth) {
                        this.searchTable.set(board.loHash, board.hiHash, [move, utils.packSearchEntry(depth, HASH_BETA, score)]);
                    }

                    this.historyHeuristic[board.turn][historyIndex] += 1;
                    return beta;
                }

                if (score > alpha) {
                    alpha = score;
                    this.pv[this.ply][depth] = move;
                    alphaMove = move;
                }
            }
        }

        if (alphaMove) {
            this.pv[this.ply][depth] = alphaMove;

            if (depth > ttDepth) {
                this.searchTable.set(board.loHash, board.hiHash, [alphaMove, utils.packSearchEntry(depth, HASH_EXACT, alpha)]);
            }
        }
        board.subtractHistory();

        if (searchedMoves === 0) {
            if (board.isInCheck()) {
                return -1 * (MATE_VALUE + depth);
            } else {
                // DRAW
                return 0;
            }
        }

        return alpha;
    }

    qsearch(board, alpha, beta) {
        if (this.endedEarly) {
            return;
        }

        if (this.timeDiff() >= this.timePerMove) {
            this.endedEarly = true;
            return;
        }

        var standPat = this.evaluate.evaluate(board);

        if (standPat >= beta) {
            return beta;
        }

        if (alpha < standPat) {
            alpha = standPat;
        }

        var score;
        var move, moves = board.generateCapturesAndPromotions();

        // Add MVV/LVA
        for (var i = 0; i < moves.length; i++) {
            moves[i] = utils.moveAddOrder(moves[i], this.mvvLva(board, moves[i]));
        }
        // moves = utils.quickSort(moves);
        moves.sort(utils.reverseOrder);

        board.addHistory();

        for (i = 0; i < moves.length; i++) {
            move = moves[i];

            if (board.addMove(move)) {
                score = -this.qsearch(board, -beta, -alpha);
                board.subtractMove(move);

                if (score >= beta) {
                    board.subtractHistory();
                    return beta;
                }

                if (score > alpha) {
                    alpha = score;
                }
            }
        }

        board.subtractHistory();
        return alpha;
    }

    iterativeDeepening(board, timePerMove, maxDepth, hideDisplay) {
        this.startTime = performance.now();
        this.timePerMove = timePerMove - 1.0; // go under by just a MS
        this.ply = 1;
        this.endedEarly = false;
        this.pv = [];
        this.clearHeuristics();
        this.searchTable.clear();
        var moveStrings, score;

        for (var depth = 1; depth <= maxDepth; depth++) {
            this.ply = depth;
            this.pv[this.ply] = [];
            this.evaluate.resetEvalCount();
            score = this.search(board, -Infinity, +Infinity, depth);

            if (utils.isNumeric(score)) {
                moveStrings = [];
                for (var i = depth; i > 0; i--) {
                    moveStrings.push(utils.moveToString(this.pv[this.ply][i]));
                }

                if (!this.endedEarly && !hideDisplay) {
                    console.log(`${depth} ${score} ${Math.round(this.timeDiff() / 10)} ${this.evaluate.evalCount} ${moveStrings.join(' ')}`);
                }
            }

            if (this.timeDiff() >= this.timePerMove) {
                break;
            }
        }

        if (this.endedEarly) {
            this.ply--;
        }
        return this.pv[this.ply][this.ply];
    }

    timeDiff() {
        if (this.timeDiffCount % 1000 === 0) {
            this.lastTime = performance.now();
        }
        this.timeDiffCount++;
        return this.lastTime - this.startTime;
    }

    clearHeuristics() {
        this.historyHeuristic[0].fill(0);
        this.historyHeuristic[1].fill(0);
        this.butterflyHeuristic[0].fill(0);
        this.butterflyHeuristic[1].fill(0);
    }
};