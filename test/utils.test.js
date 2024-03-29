'use strict';

const expect = require('chai').expect;
const Board = require('../src/board');
const utils = require('../src/utils');
const {
    HASH_EXACT,
    HASH_ALPHA,
    HASH_BETA,
    KING,
    MATE_VALUE,
    PIECE_VALUES,
} = require('../src/constants');

describe('utils', () => {
    describe('moveToShortString', () => {
        let board;

        beforeEach(() => {
            board = new Board();
        });

        it('prints checkmate correctly', () => {
            board.fen = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 1';
            expect(utils.moveToShortString(board, board.moveStringToMove('d8h4'))).to.equal('Qh4#');
        });

        it('prints check correctly', () => {
            board.fen = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/3P1P2/PPP1P2P/RNBQKBNR b KQkq - 0 1';
            expect(utils.moveToShortString(board, board.moveStringToMove('d8h4'))).to.equal('Qh4+');
        });

        it('prints promotion', () => {
            board.fen = '8/2P3k1/8/8/8/8/8/6K1 w - - 0 1';
            expect(utils.moveToShortString(board, board.moveStringToMove('c7c8n'))).to.equal('c8=N');
            expect(utils.moveToShortString(board, board.moveStringToMove('c7c8b'))).to.equal('c8=B');
            expect(utils.moveToShortString(board, board.moveStringToMove('c7c8r'))).to.equal('c8=R');
            expect(utils.moveToShortString(board, board.moveStringToMove('c7c8q'))).to.equal('c8=Q');
        });

        it('fully disambiguates moves', () => {
            // See http://www.talkchess.com/forum/viewtopic.php?p=341905&t=33764
            board.fen = 'QQ6/Qp5k/8/8/8/8/8/7K w - - 0 1';
            expect(utils.moveToShortString(board, board.moveStringToMove('b8b7'))).to.equal('Qbxb7+');
            expect(utils.moveToShortString(board, board.moveStringToMove('a8b7'))).to.equal('Qa8xb7+');
            expect(utils.moveToShortString(board, board.moveStringToMove('a7b7'))).to.equal('Q7xb7+');
        });
    });

    describe('quicksort benchmark', () => {
        it('runs quicksort fast', () => {
            var a;
            for (var i = 0; i < 100000; i++) {
                a = (new Array(50)).fill(1).map(() => utils.getRandomInt(0, 100));
                utils.quickSort(a);
            }
            console.log(a[0]);
        });

        it('runs Array#sort fast', () => {
            var a;
            for (var i = 0; i < 100000; i++) {
                a = (new Array(50)).fill(1).map(() => utils.getRandomInt(0, 100));
                a.sort(utils.reverseOrder);
            }
            console.log(a[0]);
        });

        it('runs TypedArray#sort fast', () => {
            var a;
            for (var i = 0; i < 100000; i++) {
                a = Uint32Array.from((new Array(50)).fill(1).map(() => utils.getRandomInt(0, 100)));
                a.sort(utils.reverseOrder);
            }
            console.log(a[0]);
        });
    });

    describe('packs search entries', () => {
        it('packs and unpacks successfully', () => {
            const depths = [64, 63, 5, 1, 0];
            const flags = [HASH_ALPHA, HASH_BETA, HASH_EXACT];
            const scores = [-MATE_VALUE - PIECE_VALUES[KING], -PIECE_VALUES[KING], 0, PIECE_VALUES[KING], MATE_VALUE + PIECE_VALUES[KING]];

            depths.forEach(expectedDepth => {
                flags.forEach(expectedFlag => {
                    scores.forEach(expectedScore => {
                        const [depth, flag, score] = utils.unpackSearchEntry(utils.packSearchEntry(expectedDepth, expectedFlag, expectedScore));
                        expect(depth).to.equal(expectedDepth);
                        expect(flag).to.equal(expectedFlag);
                        expect(score).to.equal(expectedScore);
                    });
                });
            });
        });
    });

    describe('index180ToIndex64', () => {
        it('works', () => {
            expect(utils.index180ToIndex64(33)).to.equal(0);
            expect(utils.index180ToIndex64(40)).to.equal(7);
            expect(utils.index180ToIndex64(97)).to.equal(36);
            expect(utils.index180ToIndex64(138)).to.equal(56);
            expect(utils.index180ToIndex64(145)).to.equal(63);
        });
    });
});