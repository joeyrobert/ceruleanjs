'use strict';

const HashTable = require('./hash_table');

module.exports = class Perft {
    set hashSize(exponent) {
        this.perftTable = exponent ? new HashTable(exponent) : undefined;
    }

    perft(board, depth) {
        if (depth === 0) {
            return 1;
        }

        if (this.perftTable) {
            var savedPerft = this.perftTable.get(board.loHash, board.hiHash);

            if (savedPerft && savedPerft[depth]) {
                return savedPerft[depth];
            }
        }

        var moves = board.generateMoves();
        var total = 0;

        for (var i = 0; i < moves.length; i++) {
            if (board.addMove(moves[i])) {
                total += this.perft(board, depth - 1);
                board.subtractMove();
            }
        }

        if (this.perftTable) {
            this.perftTable.add(board.loHash, board.hiHash, depth, total);
        }

        return total;
    }

    divide(board, depth) {
        var moves = board.generateMoves();
        var movePerfts = [];

        for (var i = 0; i < moves.length; i++) {
            if (board.addMove(moves[i])) {
                movePerfts.push([board.moveToString(moves[i]), this.perft(board, depth - 1)]);
                board.subtractMove();
            }
        }

        return movePerfts;
    }
};