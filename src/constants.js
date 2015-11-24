'use strict';

/*
 * Constant generators
 */
function fileDistance() {

}

function squareDistance() {

}

function knightIncrement() {

}

function queenIncrement() {

}

/*
 * Constants
 */
const WHITE = 0;
const BLACK = 1;
const WIDTH = 15;
const HEIGHT = 12;
const FEN_BOARD_REGEX = /^\s*([rnbqkpRNBQKP1-8]+\/){7}([rnbqkpRNBQKP1-8]+)\s[bw]\s(-|K?Q?k?q?)\s(-|[a-h‌​][36])/;
const FILE_DISTANCE = fileDistance();
const SQUARE_DISTANCE = squareDistance();
const QUEEN_INCREMENT = queenIncrement();
const KNIGHT_INCREMENT = knightIncrement();
const PIECE_MAP = {
    'p': 1,
    'n': 2,
    'b': 3,
    'r': 4,
    'q': 5,
    'k': 6,
};

const PIECE_DISPLAY_MAP = [
    {
        1: '♙',
        2: '♘',
        3: '♗',
        4: '♖',
        5: '♕',
        6: '♔'
    },
    {
        1: '♟',
        2: '♞',
        3: '♝',
        4: '♜',
        5: '♛',
        6: '♚'
    }
];

module.exports = {
    WHITE,
    BLACK,
    WIDTH,
    HEIGHT,
    FEN_BOARD_REGEX,
    FILE_DISTANCE,
    SQUARE_DISTANCE,
    QUEEN_INCREMENT,
    KNIGHT_INCREMENT
};