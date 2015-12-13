'use strict';

const expect = require('chai').expect;
const xboard = require('../src/xboard');

describe('xboard', () => {
    it(`determines white checkmate ('8/8/5K1k/8/8/8/8/7R b - - 0 1')`, () => {
        xboard.board.fen = '8/8/5K1k/8/8/8/8/7R b - - 0 1';
        expect(xboard.result(true)).to.equal('1-0');
    });

    it(`determines black checkmate ('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1')`, () => {
        xboard.board.fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1';
        expect(xboard.result(true)).to.equal('0-1');
    });

    it(`determines stalemate ('5k2/5P2/5K2/8/8/8/8/8 b - - 0 1')`, () => {
        xboard.board.fen = '5k2/5P2/5K2/8/8/8/8/8 b - - 0 1';
        expect(xboard.result(true)).to.equal('1/2-1/2');
    });

    it(`determines no checkmate ('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')`, () => {
        xboard.board.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        expect(xboard.result(true)).to.equal(false);
    });
});