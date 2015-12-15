'use strict';

const os = require('os');

/*
 * Constants
 */
const WHITE = 0;
const BLACK = 1;
const WIDTH = 15;
const HEIGHT = 12;
const FEN_BOARD_REGEX = /^\s*([rnbqkpRNBQKP1-8]+\/){7}([rnbqkpRNBQKP1-8]+)\s[bw]\s(-|K?Q?k?q?)\s(-|[a-h‌​][36])/;
const MOVE_REGEX = /^[a-h][1-8][a-h][1-8][bnrq]?$/;
const JUST_PIECE = 0b1111110;

const PIECE_MAP = {
    p: 2,
    n: 4,
    b: 8,
    r: 16,
    q: 32,
    k: 64,
    empty: 128
};

const INVERSE_PIECE_MAP = {
    2: 'p',
    4: 'n',
    8: 'b',
    16: 'r',
    32: 'q',
    64: 'k'
};

const PIECE_DISPLAY_MAP = os.platform() !== 'win32' ? {
    2: '♟',
    4: '♞',
    8: '♝',
    16: '♜',
    32: '♛',
    64: '♚',
    128: ' '
} : {
    2: 'p',
    4: 'n',
    8: 'b',
    16: 'r',
    32: 'q',
    64: 'k',
    128: ' '
};

const DELTA_KNIGHT = [
    -31,
    -29,
    -17,
    -13,
    13,
    17,
    29,
    31
];

const DELTA_KING = [
    -16,
    -15,
    -14,
    -1,
    1,
    14,
    15,
    16
];

const DELTA_BISHOP = [
    -16,
    -14,
    14,
    16
];

const DELTA_ROOK = [
    -15,
    -1,
    1,
    15
];

const DELTA_MAP = [
    [DELTA_BISHOP, PIECE_MAP.b],
    [DELTA_ROOK, PIECE_MAP.r],
    [DELTA_KNIGHT, PIECE_MAP.n],
    [DELTA_KING, PIECE_MAP.k]
];

const CASTLING_W_K = 1;
const CASTLING_W_Q = 2;
const CASTLING_B_K = 4;
const CASTLING_B_Q = 8;
const CASTLING = {
    K: CASTLING_W_K,
    Q: CASTLING_W_Q,
    k: CASTLING_B_K,
    q: CASTLING_B_Q
};

const CASTLING_INFO = [
    [CASTLING_W_K, 37, 39, 40, 38, 'K'],
    [CASTLING_W_Q, 37, 35, 33, 36, 'Q'],
    [CASTLING_B_K, 142, 144, 145, 143, 'k'],
    [CASTLING_B_Q, 142, 140, 138, 141, 'q']
];

var CASTLING_MAP = [];
CASTLING_MAP[39] = 37;
CASTLING_MAP[35] = 37;
CASTLING_MAP[144] = 142;
CASTLING_MAP[140] = 142;

var CASTLING_ROOK_MOVES = [];
CASTLING_ROOK_MOVES[39] = 9768;
CASTLING_ROOK_MOVES[35] = 9249;
CASTLING_ROOK_MOVES[144] = 36753;
CASTLING_ROOK_MOVES[140] = 36234;

const PAWN_FIRST_RANK = [
    [48, 55],
    [123, 130]
];

const PAWN_LAST_RANK = [
    [138, 145],
    [33, 40]
];

const MOVE_BITS_EMPTY       = 0;
const MOVE_BITS_CAPTURE     = 1;
const MOVE_BITS_CASTLING    = 2;
const MOVE_BITS_EN_PASSANT  = 4;
const MOVE_BITS_PAWN        = 8;
const MOVE_BITS_DOUBLE_PAWN = 16;
const MOVE_BITS_PROMOTION   = 32;

module.exports = {
    WHITE,
    BLACK,
    WIDTH,
    HEIGHT,
    FEN_BOARD_REGEX,
    MOVE_REGEX,
    JUST_PIECE,
    PIECE_MAP,
    INVERSE_PIECE_MAP,
    PIECE_DISPLAY_MAP,
    DELTA_KNIGHT,
    DELTA_KING,
    DELTA_BISHOP,
    DELTA_ROOK,
    DELTA_MAP,
    CASTLING,
    CASTLING_W_K,
    CASTLING_W_Q,
    CASTLING_B_K,
    CASTLING_B_Q,
    CASTLING_INFO,
    CASTLING_MAP,
    CASTLING_ROOK_MOVES,
    PAWN_FIRST_RANK,
    PAWN_LAST_RANK,
    MOVE_BITS_EMPTY,
    MOVE_BITS_CAPTURE,
    MOVE_BITS_CASTLING,
    MOVE_BITS_EN_PASSANT,
    MOVE_BITS_PAWN,
    MOVE_BITS_DOUBLE_PAWN,
    MOVE_BITS_PROMOTION
};