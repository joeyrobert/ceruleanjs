'use strict';

const qsearch = require('./qsearch');
const evaluate = require('./evaluate');

var startTime, totalTime;

function setTimes(start, total) {
    startTime = start;
    totalTime = total;
}

function search(board, alpha, beta, depth, moveHistory) {
    if (evaluate.getEvalCount() % 10000) {
        var timeDiff = new Date() - startTime;

        if (timeDiff >= totalTime) {
            return;
        }
    }

    if (depth === 0) {
        return qsearch(board, alpha, beta);
    }

    var score, alphaMove, searchResult, searchPv = true;
    var move, moves = board.generateMoves();

    for (var i = 0; i < moves.length; i++) {
        move = moves[i];
        if (board.addMove(move)) {
            if (searchPv) {
                score = -search(board, -beta, -alpha, depth - 1, moveHistory);
            } else {
                score = -search(board, -alpha - 1, -alpha, depth - 1, moveHistory);

                if (score > alpha) {
                    score = -search(board, -beta, -alpha, depth - 1, moveHistory);
                }
            }

            board.subtractMove();

            if (score >= beta) {
                return beta;
            }

            if (score > alpha) {
                alpha = score;
                alphaMove = move;
                searchPv = false;
            }
        }
    }

    if (alphaMove) {
        moveHistory[depth] = alphaMove;
    }

    return alpha;
}

module.exports = {
    setTimes,
    search
};