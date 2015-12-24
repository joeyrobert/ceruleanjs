'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const Board = require('../src/board');
const see = require('../src/see');
const utils = require('../src/utils');

describe('see', () => {
    var board;

    beforeEach(() => {
        board = new Board();
    });

    it('should pawn exchange (equal capture, 0 difference)', () => {
        // Kings pawn
        board.fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
        var move = board.moveStringToMove('e4d5');
        var score = see(board, move);
        expect(score).to.equal(0);
    });

    it('should pawn exchange (1 difference)', () => {
        // Queen's pawn
        board.fen = 'rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq e6 0 2';
        var move = board.moveStringToMove('d4e5');
        var score = see(board, move);
        expect(score).to.equal(1);
    });

    it('should bishop exchange (-2 difference)', () => {
        board.fen = '1b5B/8/8/4p3/8/8/8/8 w - - 0 1';
        var move = board.moveStringToMove('h8e5');
        var score = see(board, move);
        expect(score).to.equal(-2);
    });

    it('should bishop exchange (1 difference)', () => {
        board.fen = '1b5B/8/8/4P3/8/8/1b6/8 b - - 0 1';
        var move = board.moveStringToMove('b8e5');
        var score = see(board, move);
        expect(score).to.equal(1);
    });

    it('should rook exchange (-2 difference)', () => {
        board.fen = '4r3/8/8/r3b2R/8/8/8/4R3 w - - 0 1';
        var move = board.moveStringToMove('e1e5');
        var score = see(board, move);
        expect(score).to.equal(-2);
    });

    it('should rook exchange (3 difference)', () => {
        board.fen = '4r3/8/8/4b2R/8/8/8/4R3 w - - 0 1';
        var move = board.moveStringToMove('e1e5');
        var score = see(board, move);
        expect(score).to.equal(3);
    });

    it('should queen exchange (3 pawn difference)', () => {
        board.fen = '1q2q3/8/8/4b2Q/8/6Q1/8/4Q3 w - - 0 1';
        var move = board.moveStringToMove('e1e5');
        var score = see(board, move);
        expect(score).to.equal(3);
    });

    it('should knight exchange (-2 pawn difference)', () => {
        board.fen = '8/3n4/8/4P3/8/5N2/8/8 b - - 0 1';
        var move = board.moveStringToMove('d7e5');
        var score = see(board, move);
        expect(score).to.equal(-2);
    });

    it('should pinned exchange (3 pawn difference)', () => {
        board.fen = '8/8/8/2R1P3/5b2/6b1/8/8 b - - 0 1';
        var move = board.moveStringToMove('f4e5');
        var score = see(board, move);
        expect(score).to.equal(3);
    });

    it('should take queen outright (9 pawn difference)', () => {
        board.fen = '8/8/8/4q3/5B2/8/8/8 w - - 0 1';
        var move = board.moveStringToMove('f4e5');
        var score = see(board, move);
        expect(score).to.equal(9);
    });
});