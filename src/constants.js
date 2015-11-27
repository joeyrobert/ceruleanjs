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
    'p': 2,
    'n': 4,
    'b': 8,
    'r': 16,
    'q': 32,
    'k': 64
};

const INVERSE_PIECE_MAP = {
    2: 'p',
    4: 'n',
    8: 'b',
    16: 'r',
    32: 'q',
    64: 'k'
};

const PIECE_DISPLAY_MAP = [
    {
        2: '♙',
        4: '♘',
        8: '♗',
        16: '♖',
        32: '♕',
        64: '♔'
    },
    {
        2: '♟',
        4: '♞',
        8: '♝',
        16: '♜',
        32: '♛',
        64: '♚'
    }
];

const CASTLING = {
    K: 0,
    Q: 1,
    k: 2,
    q: 3
};

module.exports = {
    WHITE,
    BLACK,
    WIDTH,
    HEIGHT,
    FEN_BOARD_REGEX,
    FILE_DISTANCE,
    SQUARE_DISTANCE,
    QUEEN_INCREMENT,
    KNIGHT_INCREMENT,
    PIECE_MAP,
    INVERSE_PIECE_MAP,
    PIECE_DISPLAY_MAP,
    CASTLING
};