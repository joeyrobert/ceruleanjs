'use strict';

const HashTable = require('./hash_table');
var perftTable = new HashTable(10);

function perft(board, depth) {
    if (depth === 0) {
        return 1;
    }

    var moves = board.generateMoves();
    var total = 0;

    for (var i = 0; i < moves.length; i++) {
        if (board.addMove(moves[i])) {
            total += perft(board, depth - 1);
            board.subtractMove();
        }
    }

    return total;
}

function perftHashed(board, depth) {
    if (depth === 0) {
        return 1;
    }

    var savedPerft = perftTable.get(board.hash);

    if (savedPerft && savedPerft[depth]) {
        return savedPerft[depth];
    }

    var moves = board.generateMoves();
    var total = 0;

    for (var i = 0; i < moves.length; i++) {
        if (board.addMove(moves[i])) {
            total += perftHashed(board, depth - 1);
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