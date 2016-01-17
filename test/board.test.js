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

    // test cases straight out of polyglot opening book
    var polyglotCases = [
        ['', '463B96181691FC9C'],
        ['e2e4', '823C9B50FD114196'],
        ['e2e4 d7d5', '756B94461C50FB0'],
        ['e2e4 d7d5 e4e5', '662FAFB965DB29D4'],
        ['e2e4 d7d5 e4e5 f7f5', '22A48B5A8E47FF78'],
        ['e2e4 d7d5 e4e5 f7f5 e1e2', '652A607CA3F242C1'],
        ['e2e4 d7d5 e4e5 f7f5 e1e2 e8f7', 'FDD303C946BDD9'],
        ['a2a4 b7b5 h2h4 b5b4 c2c4', '3C8123EA7B067637'],
        ['a2a4 b7b5 h2h4 b5b4 c2c4 b4c3 a1a3', '5C3F9B829B279560']
    ];

    polyglotCases.forEach(polyglotCase => {
        it(`should compute polyglot zobrist (${polyglotCase[0]} => ${polyglotCase[1]})`, () => {
            polyglotCase[0].split(' ').forEach(moveString => board.addMoveString(moveString));
            expect(board.hashString).to.equal(polyglotCase[1]);
        });
    });
});