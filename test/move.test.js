'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const Board = require('../src/board');
const utils = require('../src/utils');

describe('move', () => {
    let board;
    let epd = fs.readFileSync('suites/epd/perftsuite.epd', 'utf8');
    let fens = epd.split('\n').map(line => line.split(';')[0].trim());

    beforeEach(() => {
        board = new Board();
    });

    fens.forEach(fen => {
        it(`can verify createMove moves (${fen})`, () => {
            board.fen = fen;
            let moves = board.generateLegalMoves();

            moves.forEach(move => {
                let from = utils.moveFrom(move);
                let to = utils.moveTo(move);
                let bits = utils.moveBits(move);
                let captured = utils.moveCaptured(move);
                let promotion = utils.movePromotion(move);
                let newMove = utils.createMove(from, to, bits, captured, promotion);
                expect(newMove.toString(2)).to.equal(move.toString(2));
            });
        });
    });
});