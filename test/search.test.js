'use strict';

const expect = require('chai').expect;
const Board = require('../src/board');
const Search = require('../src/search');
const Evaluate = require('../src/evaluate');

describe('search', () => {
    var board;
    var search;
    var evaluate;
    var maxDepth = 64;
    var timePerMove = 200;
    board = new Board();
    search = new Search();
    evaluate = new Evaluate();
    search.evaluate = evaluate;

    describe('tactics', () => {
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

    describe('iterative deepening', () => {
        const timePerMoves = [500, 1000, 1500, 5000, 10000];

        timePerMoves.forEach((timePerMove) => {
            board.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            const start = performance.now();
            console.log({search}, 'TIME PER MOVE', {timePerMove});
            search.iterativeDeepening(board, timePerMove, maxDepth);
            const duration = performance.now() - start;
            console.log('DURATION', duration);
            // expect(duration).to.equal(timePerMove);
        });
    });
});