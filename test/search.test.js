'use strict';

const expect = require('chai').expect;
const Board = require('../src/board');
const Search = require('../src/search');

describe('search', () => {
    var board;
    var search;
    var timePerMove; // ms
    var maxDepth = 64;

    beforeEach(() => {
        board = new Board();
        search = new Search();
    });

    describe('tactics', () => {
        beforeEach(() => {
            timePerMove = 200;
        });

        it('should find white checkmate', () => {
            board.fen = '8/8/8/5K1k/8/8/8/6R1 w - - 0 1';
            var correctMove = board.moveStringToMove('g1h1');
            var move = search.iterativeDeepening(board, timePerMove, maxDepth);
            expect(move).to.equal(correctMove);
        });

        it('should find black checkmate', () => {
            board.fen = '8/8/8/5k1K/8/8/8/6r1 b - - 0 1';
            var correctMove = board.moveStringToMove('g1h1');
            var move = search.iterativeDeepening(board, timePerMove, maxDepth);
            expect(move).to.equal(correctMove);
        });
    });
});