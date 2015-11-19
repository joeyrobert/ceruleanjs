'use strict';

const expect = require('chai').expect;
const Board = require('../src/board');

describe('board', () => {
    it('passes the example test', () => {
        expect(3).to.eql(3);
    });

    it('can create a new board', () => {
        var board = new Board();
    });
});