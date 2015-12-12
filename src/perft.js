'use strict';

const HashTable = require('./hash_table');
let perftTable = new HashTable(16);

module.exports = function perft(board, depth) {
    if (depth === 0) {
        return 1;
    }

    let savedPerft = perftTable.get(board.hash);

    if (savedPerft && savedPerft[depth]) {
        return savedPerft[depth];
    }

    let moves = board.generateMoves();
    let total = 0;

    for (let i = 0; i < moves.length; i++) {
        if (board.addMove(moves[i])) {
            total += perft(board, depth - 1);
            board.subtractMove();
        }
    }

    perftTable.add(board.hash, depth, total);

    return total;
};