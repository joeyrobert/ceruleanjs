'use strict';

const { HashTable } = require('./hash_table');
const utils = require('./utils');

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

        var move, moves = board.generateMoves();
        var total = 0;

        board.addHistory();

        for (var i = 0; i < moves.length; i++) {
            move = moves[i];
            if (board.addMove(move)) {
                total += this.perft(board, depth - 1);
                board.subtractMove(move);
            }
        }

        board.subtractHistory();

        if (this.perftTable) {
            var value = this.perftTable.get(board.loHash, board.hiHash) || [];
            value[depth] = total;
            this.perftTable.set(board.loHash, board.hiHash, value);
        }

        return total;
    }

    divide(board, depth, display) {
        var move, moves = board.generateMoves();
        var movePerft, movePerfts = [];

        board.addHistory();


        for (var i = 0; i < moves.length; i++) {
            move = moves[i];
            if (board.addMove(move)) {
                movePerft = [utils.moveToString(move), this.perft(board, depth - 1)]
                if (display) {
                    console.log(movePerft.join(' '));
                }
                movePerfts.push(movePerft);
                board.subtractMove(move);
            }
        }

        board.subtractHistory();

        return movePerfts;
    }
};