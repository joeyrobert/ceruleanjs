'use strict';

const evaluate = require('./evaluate');

function qsearch(board, alpha, beta) {
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

module.exports = qsearch;