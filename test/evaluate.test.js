'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const Board = require('../src/board');
const evaluate = require('../src/evaluate');

describe('evaluate', () => {
    let board = new Board();
    let epd = fs.readFileSync('suites/epd/perftsuite.epd', 'utf8');
    let fens = epd.split('\n').map(line => line.split(';')[0].trim());

    fens.forEach(fen => {
        board.fen = fen;
        it(`can run eval on (${fen} = ${evaluate(board)})`, () => {});
    });
});