'use strict';
const perft = require('./perft');

module.exports = function divide(board, depth) {
    let moves = board.generateMoves();
    let movePerfts = [];

    for (let i = 0; i < moves.length; i++) {
        if (board.addMove(moves[i])) {
            movePerfts.push([board.moveToString(moves[i]), perft(board, depth - 1)]);
            board.subtractMove();
        }
    }

    return movePerfts;
};