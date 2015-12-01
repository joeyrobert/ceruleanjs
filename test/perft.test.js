'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const Board = require('../src/board');
const perft = require('../src/perft');

describe('perft', () => {
    it('can set compute perfts', () => {
        let board = new Board();
        let epd = fs.readFileSync('suites/epd/perftsuite.epd', 'utf8');
        let perftTests = epd.split('\n').map(line => line.split(';'));

        perftTests.forEach(perftTest => {
            let fen = perftTest[0].trim();
            console.log('fen', fen);
            board.fen = fen;

            for (let i = 1; i < perftTest.length; i++) {
                let parts = perftTest[i].split(' ');
                let depth = parseInt(parts[0].slice(1), 10);
                let count = parseInt(parts[1], 10);
                expect(perft(board, depth)).to.equal(count);
            }
        });
    });
});