'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const Board = require('../src/board');

describe('board', () => {
    let board;
    let epd = fs.readFileSync('suites/epd/perftsuite.epd', 'utf8');
    let fens = epd.split('\n').map(line => line.split(';')[0].trim());

    beforeEach(() => {
        board = new Board();
    });

    fens.forEach(fen => {
        it(`can set and get fen ('${fen}')`, () => {
            board.fen = fen;
            expect(board.fen).to.equal(fen);
        });
    });
});