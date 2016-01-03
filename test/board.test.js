'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const Board = require('../src/board');
const utils = require('../src/utils');

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

    it('should rank moves correctly by MVV/LVA', () => {
        board.fen = '7k/8/6r1/q2p4/1P2Q3/6R1/8/7K w - - 0 1';
        var moves = board.generateCapturesAndPromotions();

        for (var i = 0; i < moves.length; i++) {
            moves[i] = utils.moveAddOrder(moves[i], board.mvvLva(moves[i]));
            expect(utils.moveOrder(moves[i])).to.equal(board.mvvLva(moves[i]));
        }

        moves = utils.quickSort(moves);

        expect(utils.moveToString(moves[0])).to.equal('b4a5');
        expect(utils.moveToString(moves[1])).to.equal('g3g6');
        expect(utils.moveToString(moves[2])).to.equal('e4g6');
        expect(utils.moveToString(moves[3])).to.equal('e4d5');
    });

    it('should count max repetitions correctly', () => {
        var cycleOfMoves = [
            'g1f3',
            'g8f6',
            'f3g1',
            'f6g8'
        ];

        for (var i = 0; i < 5; i++) {
            cycleOfMoves.forEach(moveString => {
                board.addMoveString(moveString);
            });

            expect(board.maxRepetitions()).to.equal(i + 1);
        }
    });
});