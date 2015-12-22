'use strict';

const evaluate = require('./evaluate');
const utils = require('./utils');

var startTime, totalTime, moveHistory;

function search(board, alpha, beta, depth) {
    if (evaluate.getEvalCount() % 10000 === 0) {
        var timeDiff = new Date() - startTime;

        if (timeDiff >= totalTime) {
            return;
        }
    }

    if (depth === 0) {
        return qsearch(board, alpha, beta);
    }

    var score, alphaMove, searchResult;
    var move, moves = board.generateMoves();
    board.addHistory();

    // Move ordering
    if (moveHistory.length) {
        var movesIndex = moves.indexOf(moveHistory[moveHistory.length - 1]);

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
                score = -search(board, -beta, -alpha, depth - 1);
            } else {
                score = -search(board, -alpha - 1, -alpha, depth - 1);

                if (score > alpha) {
                    score = -search(board, -beta, -alpha, depth - 1);
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
        moveHistory[depth] = alphaMove;
    }

    board.subtractHistory();
    return alpha;
}

function qsearch(board, alpha, beta) {
    if (evaluate.getEvalCount() % 10000 === 0) {
        var timeDiff = new Date() - startTime;

        if (timeDiff >= totalTime) {
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
            score = -qsearch(board, -beta, -alpha);
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

function iterativeDeepening(board, total) {
    startTime = new Date();
    totalTime = total;
    var timeThreshold = totalTime / 4; // time threshold in ms
    var timeDiff, moveStrings, score;

    for (var depth = 1; ; depth++) {
        moveHistory = [];
        evaluate.resetEvalCount();
        score = search(board, -Infinity, +Infinity, depth);
        timeDiff = new Date() - startTime;

        if (utils.isNumeric(score)) {
            moveStrings = [];
            for (var i = depth; i >= 1; i--) {
                moveStrings.push(utils.moveToString(moveHistory[i]));
            }

            console.log(`${depth} ${score} ${Math.round(timeDiff / 10)} ${evaluate.getEvalCount()} ${moveStrings.join(' ')}`);
        }

        if (timeDiff >= timeThreshold) {
            break;
        }
    }

    return moveHistory[depth];
}

module.exports = {
    iterativeDeepening
};