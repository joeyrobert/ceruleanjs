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

    describe('run every command with valid input', () => {
        const commands = [
            'display',
            'perft 4',
            'perfthash 5',
            'memory 10',
            'divide 4',
            'moves',
            'e2e4',
            'undo',
            'new',
            'setboard 8/1B3k2/4Rbp1/3Pp1p1/5p2/5P1P/3r2PK/8 b - - bm g4',
            'evaluate',
            'result',
            'level 40 5 0',
            'book on',
            'go',
            'book off',
            'go',
            'white',
            'black',
            'time 1000',
            'otim 1000',
            'sd 15',
            'st 1000',
            'version',
            'help',
            'cachestat',
            'option DOUBLED_PAWN_PENALTY=10',
            // 'sts',
            // 'exit',
            // 'quit',
        ];

        commands.forEach(command => {
            it(`runs ${command} without error`, () => {
                xb.sendLine(command);
            });
        });
    });
});