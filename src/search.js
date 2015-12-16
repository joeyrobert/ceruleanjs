'use strict';

const qsearch = require('./qsearch');
const evaluate = require('./evaluate');

var startTime, totalTime;

function setTimes(start, total) {
    startTime = start;
    totalTime = total;
}

function search(board, alpha, beta, depth, moveHistory) {
    if (evaluate.getEvalCount() % 500 === 0) {
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
                score = -search(board, -beta, -alpha, depth - 1, moveHistory);
            } else {
                score = -search(board, -alpha - 1, -alpha, depth - 1, moveHistory);

                if (score > alpha) {
                    score = -search(board, -beta, -alpha, depth - 1, moveHistory);
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

module.exports = {
    setTimes,
    search
};