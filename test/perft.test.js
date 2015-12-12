'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const Board = require('../src/board');
const perft = require('../src/perft').perft;

describe('perft', () => {
    let board;
    let epd = fs.readFileSync('suites/epd/perftsuite.epd', 'utf8');
    let perftTests = epd.split('\n').map(line => line.split(';'));

    beforeEach(() => {
        board = new Board();
    });

    perftTests.forEach(perftTest => {
        let fen = perftTest[0].trim();

        for (let i = 1; i < perftTest.length; i++) {
            let parts = perftTest[i].split(' ');
            let depth = parseInt(parts[0].slice(1), 10);
            let count = parseInt(parts[1], 10);
            it(`verify perft('${fen}', ${depth}) equals ${count}`, () => {
                board.fen = fen;
                expect(perft(board, depth)).to.equal(count);
            });
        }
    });
});