'use strict';

var stdio = require('stdio');
const Board = require('../src/board');

let board = new Board();
console.log(board.moveString());

stdio.readByLines(line => {
    console.log('Line %d:', line);
});