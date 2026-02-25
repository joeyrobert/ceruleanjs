'use strict';

const {
    EMPTY,
    HASH_EXACT,
    PIECE_VALUES,
    HASH_ALPHA,
    HASH_BETA,
    JUST_PIECE,
    MATE_VALUE,
    MOVE_ORDER_FIRST,
    MOVE_ORDER_KILLER,
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
        this.killerMoves = [];
        for (var k = 0; k < 64; k++) {
            this.killerMoves[k] = [0, 0];
        }
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

    // Simple capture gain for ordering (captured - attacker; positive = winning)
    seeGain(board, move) {
        var captured = utils.moveCaptured(move);
        if (captured === EMPTY) return 0;
        var attacker = board.board[utils.moveFrom(move)] & JUST_PIECE;
        return PIECE_VALUES[captured] - PIECE_VALUES[attacker];
    }

    relativeHistory(turn, move) {
        const index = utils.historyIndex(move);
        if (this.butterflyHeuristic[turn][index]) {
            return Math.floor(this.historyHeuristic[turn][index] * RELATIVE_HISTORY_SCALE / this.butterflyHeuristic[turn][index]);
        }
        return 0;
    }

    scoreToTT(score, ply) {
        if (score > MATE_VALUE - 1000) return score + ply;
        if (score < -MATE_VALUE + 1000) return score - ply;
        return score;
    }

    scoreFromTT(score, ply) {
        if (score > MATE_VALUE - 1000) return score - ply;
        if (score < -MATE_VALUE + 1000) return score + ply;
        return score;
    }

    search(board, alpha, beta, depth, ply) {
        ply = ply || 0;
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
            ttScore = this.scoreFromTT(ttScore, ply);

            if (ttDepth >= depth) {
                maxMove = ttMove;
                if (ttFlag === HASH_EXACT) {
                    this.pv[this.ply][depth] = ttMove;
                    return ttScore;
                }
                if (ttFlag === HASH_ALPHA && ttScore <= alpha) {
                    return alpha;
                }
                if (ttFlag === HASH_BETA && ttScore >= beta) {
                    return beta;
                }
            } else if (ttMove) {
                maxMove = ttMove;
            }
        }

        if (depth === 0) {
            return this.qsearch(board, alpha, beta);
        }

        var standPat = this.evaluate.evaluate(board);

        // Razoring (conservative - only at depth 1)
        if (depth === 1 && standPat + 300 < alpha) {
            return this.qsearch(board, alpha, beta);
        }

        var score;
        var searchedMoves = 0;
        var move, moves = board.generateMoves();

        // Add move ordering (Hash + PV + Killer + MVV/LVA + History)
        var moveMask;
        for (var i = 0; i < moves.length; i++) {
            moveMask = moves[i] & MOVE_SANS_ORDER_MASK;
            if (maxMove && moveMask === maxMove) {
                moves[i] = utils.moveAddOrder(moves[i], MOVE_ORDER_FIRST);
            } else if (this.pv[this.ply - 1] && this.pv[this.ply - 1][this.ply - 1] && moveMask === this.pv[this.ply - 1][this.ply - 1]) {
                moves[i] = utils.moveAddOrder(moves[i], MOVE_ORDER_SECOND);
            } else if (!utils.moveCaptured(moves[i]) && ply < 64 && (moveMask === this.killerMoves[ply][0] || moveMask === this.killerMoves[ply][1])) {
                moves[i] = utils.moveAddOrder(moves[i], MOVE_ORDER_KILLER);
            } else if (utils.movePromotion(moves[i])) {
                moves[i] = utils.moveAddOrder(moves[i], MOVE_ORDER_SECOND);
            } else if (utils.moveCaptured(moves[i])) {
                var capOrder = this.mvvLva(board, moves[i]) + this.relativeHistory(board.turn, moves[i]);
                if (this.seeGain(board, moves[i]) < 0) capOrder -= 100;
                moves[i] = utils.moveAddOrder(moves[i], capOrder);
            } else {
                moves[i] = utils.moveAddOrder(moves[i], this.relativeHistory(board.turn, moves[i]));
            }
        }
        moves.sort(utils.reverseOrder);

        board.addHistory();

        // PVS search
        var alphaMove = 0;

        var futilityMargin = 120;
        for (i = 0; i < moves.length; i++) {
            move = moves[i] & MOVE_SANS_ORDER_MASK;
            const historyIndex = utils.historyIndex(move);
            var isCapture = utils.moveCaptured(move) !== EMPTY;
            var isPromotion = utils.movePromotion(move) !== 0;

            if (board.addMove(move)) {
                searchedMoves++;

                // Futility pruning at depth 1 (less aggressive for positional play)
                if (depth === 1 && !isCapture && !isPromotion && standPat + futilityMargin < alpha) {
                    board.subtractMove(move);
                    continue;
                }

                var reduction = 0;
                if (alphaMove && i > 5 && !isCapture && !board.isInCheck() && depth >= 4) {
                    reduction = 1;
                }

                var searchDepth = depth - 1 - reduction;
                if (!alphaMove) {
                    score = -this.search(board, -beta, -alpha, searchDepth, ply + 1);
                } else {
                    score = -this.search(board, -alpha - 1, -alpha, searchDepth, ply + 1);

                    if (score > alpha) {
                        score = -this.search(board, -beta, -alpha, depth - 1, ply + 1);
                    }
                }

                if (reduction > 0 && score >= beta) {
                    score = -this.search(board, -beta, -alpha, depth - 1, ply + 1);
                }

                board.subtractMove(move);

                this.butterflyHeuristic[board.turn][historyIndex] += 1;
                if (score >= beta) {
                    if (!isCapture && ply < 64) {
                        if (this.killerMoves[ply][0] !== move) {
                            this.killerMoves[ply][1] = this.killerMoves[ply][0];
                            this.killerMoves[ply][0] = move;
                        }
                    }
                    board.subtractHistory();

                    if (depth > ttDepth) {
                        this.searchTable.set(board.loHash, board.hiHash, [move, utils.packSearchEntry(depth, HASH_BETA, this.scoreToTT(score, ply))]);
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
                this.searchTable.set(board.loHash, board.hiHash, [alphaMove, utils.packSearchEntry(depth, HASH_EXACT, this.scoreToTT(alpha, ply))]);
            }
        } else if (depth > ttDepth) {
            this.searchTable.set(board.loHash, board.hiHash, [0, utils.packSearchEntry(depth, HASH_ALPHA, this.scoreToTT(alpha, ply))]);
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

        var ttEntry = this.searchTable.get(board.loHash, board.hiHash);
        if (ttEntry) {
            var qttMove = ttEntry[0];
            var qttData = ttEntry[1];
            var qttDepth, qttFlag, qttScore;
            [qttDepth, qttFlag, qttScore] = utils.unpackSearchEntry(qttData);
            if (qttFlag === HASH_EXACT) return qttScore;
            if (qttFlag === HASH_ALPHA && qttScore <= alpha) return alpha;
            if (qttFlag === HASH_BETA && qttScore >= beta) return beta;
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

        var captured, deltaMargin = 350;
        for (i = 0; i < moves.length; i++) {
            move = moves[i];
            captured = utils.moveCaptured(move);
            if (captured !== EMPTY && standPat + PIECE_VALUES[captured] + deltaMargin < alpha) {
                continue;
            }

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

            var alpha = -Infinity;
            var beta = Infinity;
            if (depth > 1 && utils.isNumeric(score)) {
                alpha = score - 50;
                beta = score + 50;
            }
            score = this.search(board, alpha, beta, depth, 0);
            if (!utils.isNumeric(score) || score <= alpha || score >= beta) {
                score = this.search(board, -Infinity, +Infinity, depth, 0);
            }

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
        for (var k = 0; k < 64; k++) {
            this.killerMoves[k][0] = 0;
            this.killerMoves[k][1] = 0;
        }
    }
};