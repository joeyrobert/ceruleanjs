'use strict';

const expect = require('chai').expect;
const Xboard = require('../src/xboard');

describe('xboard', () => {
    var xb = new Xboard();

    describe('result', () => {
        it(`determines white checkmate ('8/8/5K1k/8/8/8/8/7R b - - 0 1')`, () => {
            xb.setboard('8/8/5K1k/8/8/8/8/7R b - - 0 1');
            expect(xb.result(true)).to.equal('1-0');
        });

        it(`determines black checkmate ('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1')`, () => {
            xb.setboard('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1');
            expect(xb.result(true)).to.equal('0-1');
        });

        it(`determines stalemate ('5k2/5P2/5K2/8/8/8/8/8 b - - 0 1')`, () => {
            xb.setboard('5k2/5P2/5K2/8/8/8/8/8 b - - 0 1');
            expect(xb.result(true)).to.equal('1/2-1/2');
        });

        it(`determines no checkmate ('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')`, () => {
            xb.setboard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            expect(xb.result(true)).to.equal(false);
        });
    });
});