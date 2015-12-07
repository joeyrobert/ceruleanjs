'use strict';

module.exports = function perft(board, depth) {
    if (depth === 0) {
        return 1;
    }

    let moves = board.generateMoves();
    let total = 0;

    for (let i = 0; i < moves.length; i++) {
        if (board.addMove(moves[i])) {
            total += perft(board, depth - 1);
            board.subtractMove();
        }
    }

    return total;
};