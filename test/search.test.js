'use strict';

const expect = require('chai').expect;
const Board = require('../src/board');
const Search = require('../src/search');
const Evaluate = require('../src/evaluate');
const utils = require('../src/utils');

describe('search', () => {
    var board;
    var search;
    var evaluate;
    var maxDepth = 64;
    board = new Board();
    search = new Search();
    evaluate = new Evaluate();
    search.evaluate = evaluate;

    describe('tactics', () => {
        const timePerMove = 200;
        it('should find white checkmate', () => {
            board.fen = '8/8/8/5K1k/8/8/8/6R1 w - - 0 1';
            var correctMove = board.moveStringToMove('g1h1');
            var move = search.iterativeDeepening(board, timePerMove, maxDepth, true);
            expect(move).to.equal(correctMove);
        });

        it('should find black checkmate', () => {
            board.fen = '8/8/8/5k1K/8/8/8/6r1 b - - 0 1';
            var correctMove = board.moveStringToMove('g1h1');
            var move = search.iterativeDeepening(board, timePerMove, maxDepth, true);
            expect(move).to.equal(correctMove);
        });
    });

    describe('iterative deepening', () => {
        board.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const timePerMoves = [500, 1000, 2500, 5000];

        timePerMoves.forEach((timePerMove) => {
            it(`should complete within ${timePerMove}ms`, () => {
                const start = performance.now();
                search.iterativeDeepening(board, timePerMove, maxDepth, true);
                const duration = performance.now() - start;
                expect(duration).to.be.closeTo(timePerMove, 50);
            });
        });
    });

    it('should rank moves correctly by MVV/LVA', () => {
        board.fen = '7k/8/6r1/q2p4/1P2Q3/6R1/8/7K w - - 0 1';
        var moves = board.generateCapturesAndPromotions();

        for (var i = 0; i < moves.length; i++) {
            moves[i] = utils.moveAddOrder(moves[i], search.mvvLva(board, moves[i]));
            expect(utils.moveOrder(moves[i])).to.equal(search.mvvLva(board, moves[i]));
        }

        moves = moves.sort(utils.reverseOrder);

        expect(utils.moveToString(moves[0])).to.equal('b4a5');
        expect(utils.moveToString(moves[1])).to.equal('g3g6');
        expect(utils.moveToString(moves[2])).to.equal('e4g6');
        expect(utils.moveToString(moves[3])).to.equal('e4d5');
    });
});