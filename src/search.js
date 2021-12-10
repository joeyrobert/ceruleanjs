'use strict';

const constants = require('./constants');
const Evaluate = require('./evaluate');
const { NativeHashTable } = require('./hash_table');
const utils = require('./utils');

module.exports = class Search {
    constructor() {
        this._evaluate = new Evaluate();
        this.searchTable = new NativeHashTable(5);
    }

    set hashSize(exponent=1) {
        this.searchTable = new NativeHashTable(exponent);
    }

    get evaluate() {
        return this._evaluate;
    }

    set evaluate(evaluate) {
        this._evaluate = evaluate;
    }

    minimax(board, depth) {
        if (depth === 0) {
            return this._evaluate.evaluate(board);
        }

        var max = -Infinity, score, bestMove;
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

    search(board, alpha, beta, depth) {
        if (this.endedEarly) {
            return;
        }

        if (this.timeDiff() >= this.timePerMove) {
            this.endedEarly = true;
            return;
        }

        if (depth === 0) {
            return this.qsearch(board, alpha, beta);
        }

        var score;
        var searchedMoves = 0;
        var move, moves = board.generateMoves();

        // Add MVV/LVA
        for (var i = 0; i < moves.length; i++) {
            moves[i] = utils.moveAddOrder(moves[i], board.mvvLva(moves[i]));
        }
        moves = utils.quickSort(moves);

        board.addHistory();

        // Put last best PV move first
        if (this.pv[this.ply].length) {
            var movesIndex = moves.indexOf(this.pv[this.ply - 1][this.ply - 1]);

            if (movesIndex > 0) {
                var swap = moves[0]
                moves[0] = moves[movesIndex];
                moves[movesIndex] = swap;
            }
        }

        // PVS search
        var alphaMove;

        for (var i = 0; i < moves.length; i++) {
            move = moves[i];

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

                if (score >= beta) {
                    board.subtractHistory();
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
        }

        board.subtractHistory();

        if (searchedMoves === 0) {
            if (board.isInCheck()) {
                return -1 * (constants.MATE_VALUE + depth);
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

        // include alpha beta in search key
        const loHash = board.loHash ^ alpha;
        const hiHash = board.hiHash ^ beta;

        const hashLookup = this.searchTable.get(loHash, hiHash);
        if (hashLookup) {
            return hashLookup[0];
        }

        var standPat = this._evaluate.evaluate(board);

        if (standPat >= beta) {
            this.searchTable.set(loHash, hiHash, beta);
            return beta;
        }

        if (alpha < standPat) {
            alpha = standPat;
        }

        var score;
        var move, moves = board.generateCapturesAndPromotions();

        // Add MVV/LVA
        for (var i = 0; i < moves.length; i++) {
            moves[i] = utils.moveAddOrder(moves[i], board.mvvLva(moves[i]));
        }
        moves = utils.quickSort(moves);

        board.addHistory();

        for (var i = 0; i < moves.length; i++) {
            move = moves[i];

            if (board.addMove(move)) {
                score = -this.qsearch(board, -beta, -alpha);
                board.subtractMove(move);

                if (score >= beta) {
                    board.subtractHistory();
                    this.searchTable.set(loHash, hiHash, beta);
                    return beta;
                }

                if (score > alpha) {
                    alpha = score;
                }
            }
        }

        board.subtractHistory();
        this.searchTable.set(loHash, hiHash, alpha);
        return alpha;
    }

    iterativeDeepening(board, timePerMove, maxDepth, hideDisplay) {
        this.startTime = performance.now();
        this.timePerMove = timePerMove - 1.0; // go under by just a MS
        this.ply = 1;
        this.endedEarly = false;
        this.pv = [];
        var moveStrings, score;

        for (var depth = 1; depth <= maxDepth; depth++) {
            this.ply = depth;
            this.pv[this.ply] = [];
            this._evaluate.resetEvalCount();
            score = this.search(board, -Infinity, +Infinity, depth);

            if (utils.isNumeric(score)) {
                moveStrings = [];
                for (var i = depth; i > 0; i--) {
                    moveStrings.push(utils.moveToString(this.pv[this.ply][i]));
                }

                if (!this.endedEarly && !hideDisplay) {
                    console.log(`${depth} ${score} ${Math.round(this.timeDiff() / 10)} ${this._evaluate.evalCount} ${moveStrings.join(' ')}`);
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
        return performance.now() - this.startTime;
    }
};