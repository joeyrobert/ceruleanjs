'use strict';

const constants = require('./constants');
const evaluate = require('./evaluate');
const HashTable = require('./hash_table');
const utils = require('./utils');

module.exports = class Search {
    constructor() {
        this.hashSize = 22; // default size 2^22 ~ 32M entries
    }

    set hashSize(exponent) {
        this.searchTable = exponent ? new HashTable(exponent) : undefined;
    }

    search(board, alpha, beta, depth) {
        if (evaluate.getEvalCount() % constants.SEARCH_LIMIT_CHECK === 0) {
            var timeDiff = new Date() - this.startTime;

            if (timeDiff >= this.timeThreshold) {
                return;
            }
        }

        if (depth === 0) {
            return this.qsearch(board, alpha, beta);
        }

        var score, alphaMove, searchResult;
        var move, moves = board.generateMoves();
        board.addHistory();

        // Put last best PV move first
        if (this.moveHistory.length) {
            var movesIndex = moves.indexOf(this.moveHistory[this.moveHistory.length - 1]);

            if (movesIndex > 0) {
                var swap = moves[0]
                moves[0] = moves[movesIndex];
                moves[movesIndex] = swap;
            }
        }

        for (var i = 0; i < moves.length; i++) {
            move = moves[i];
            if (board.addMove(move)) {
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
                    alphaMove = move;
                }
            }
        }

        if (alphaMove) {
            this.moveHistory[depth] = alphaMove;
        }

        board.subtractHistory();

        return alpha;
    }

    qsearch(board, alpha, beta) {
        if (evaluate.getEvalCount() % constants.SEARCH_LIMIT_CHECK === 0) {
            var timeDiff = new Date() - this.startTime;

            if (timeDiff >= this.timeThreshold) {
                return;
            }
        }

        var standPat = evaluate.evaluate(board);
        var score;

        if (standPat >= beta) {
            return beta;
        }

        if (alpha < standPat) {
            alpha = standPat;
        }

        var move, moves = board.generateCaptures();
        board.addHistory();

        for (var i = 0; i < moves.length; i++) {
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

    iterativeDeepening(board, total) {
        this.startTime = new Date();
        this.totalTime = total;
        this.timeThreshold = this.totalTime / 4; // time threshold in ms
        var timeDiff, moveStrings, score;

        for (var depth = 1; ; depth++) {
            this.moveHistory = [];
            evaluate.resetEvalCount();
            score = this.search(board, -Infinity, +Infinity, depth);
            timeDiff = new Date() - this.startTime;

            if (utils.isNumeric(score)) {
                moveStrings = [];
                for (var i = depth; i >= 1; i--) {
                    moveStrings.push(utils.moveToString(this.moveHistory[i]));
                }

                console.log(`${depth} ${score} ${Math.round(timeDiff / 10)} ${evaluate.getEvalCount()} ${moveStrings.join(' ')}`);
            }

            if (timeDiff >= this.timeThreshold) {
                break;
            }
        }

        return this.moveHistory[depth];
    }
};