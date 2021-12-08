'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const Board = require('../src/board');
const Evaluate = require('../src/evaluate');

describe('evaluate', () => {
    const board = new Board();
    const epd = fs.readFileSync('suites/epd/perftsuite.epd', 'utf8');
    const fens = epd.split('\n').map(line => line.split(';')[0].trim());
    const evaluate = new Evaluate();

    fens.forEach(fen => {
        board.fen = fen;
        it(`can run eval on ('${fen}' = ${evaluate.evaluate(board)})`, () => {});
    });

    it('can run eval fast enough (1 million evals)', () => {
        var score;
        board.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

        for (var i = 0; i < 1000000; i++) {
            var score = evaluate.evaluate(board);
        }

        expect(score).to.equal(0);
    });
});