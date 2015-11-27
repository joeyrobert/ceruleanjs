'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const Board = require('../src/board');

describe('board', () => {
    it('passes the example test', () => {
        expect(3).to.eql(3);
    });

    it('can create a new board', () => {
        let board = new Board();
    });

    it('can set fen and get back the same fen', () => {
        let board = new Board();
        let epd = fs.readFileSync('suites/epd/perftsuite.epd', 'utf8');
        let fens = epd.split('\n')
            .map(line => line.split(';')[0].trim());

        fens.forEach(fen => {
            board.fen = fen;
            expect(board.fen).to.equal(fen);
        });
    });
});