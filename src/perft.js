'use strict';

const HashTable = require('./hash_table');
var perftTable = new HashTable(12);

function perft(board, depth) {
    var moves = board.generateMoves();
    var total = 0;

    for (var i = 0; i < moves.length; i++) {
        if (board.addMove(moves[i])) {
            total += depth > 1 ? perft(board, depth - 1) : 1;
            board.subtractMove();
        }
    }

    return total;
}

function perftHashed(board, depth) {
    var savedPerft = perftTable.get(board.hash);

    if (savedPerft && savedPerft[depth]) {
        return savedPerft[depth];
    }

    var moves = board.generateMoves();
    var total = 0;

    for (var i = 0; i < moves.length; i++) {
        if (board.addMove(moves[i])) {
            total += depth > 1 ? perftHashed(board, depth - 1) : 1;
            board.subtractMove();
        }
    }

    perftTable.add(board.hash, depth, total);

    return total;
}

function divide(board, depth) {
    var moves = board.generateMoves();
    var movePerfts = [];

    for (var i = 0; i < moves.length; i++) {
        if (board.addMove(moves[i])) {
            movePerfts.push([board.moveToString(moves[i]), perft(board, depth - 1)]);
            board.subtractMove();
        }
    }

    return movePerfts;
}

module.exports = {
    perft,
    perftHashed,
    divide
};