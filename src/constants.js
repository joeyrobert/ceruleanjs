'use strict';

const WHITE                         = 0;
const BLACK                         = 1;
const WIDTH                         = 15;
const HEIGHT                        = 12;
const MOVE_BITS_EMPTY               = 0;
const MOVE_BITS_CAPTURE             = 1 << 20;
const MOVE_BITS_CASTLING            = 1 << 21;
const MOVE_BITS_EN_PASSANT          = 1 << 22;
const MOVE_BITS_PAWN                = 1 << 23;
const MOVE_BITS_DOUBLE_PAWN         = 1 << 24;
const MOVE_BITS_PROMOTION           = 1 << 25;
const MOVE_BITS_PROMOTION_CAPTURE   = MOVE_BITS_PROMOTION | MOVE_BITS_CAPTURE;
const MOVE_FROM_MASK                = 0b00000000000000000000000001111111;
const MOVE_TO_MASK                  = 0b00000000000000000011111110000000;
const MOVE_PROMOTION_MASK           = 0b00000000000000011100000000000000;
const MOVE_CAPTURED_MASK            = 0b00000000000011100000000000000000;
const MOVE_BITS_MASK                = 0b00000011111100000000000000000000;
const MOVE_ORDER_MASK               = 0b11111100000000000000000000000000;
const MOVE_TO_SHIFT                 = 7;
const MOVE_PROMOTION_SHIFT          = 14;
const MOVE_CAPTURED_SHIFT           = 17;
const MOVE_ORDER_SHIFT              = 26;
const MOVE_INDEX_OFFSET             = 33;
const JUST_PIECE                    = 0b1111110;
const PIECE_P                       = 0b00000010;
const PIECE_N                       = 0b00000100;
const PIECE_B                       = 0b00001000;
const PIECE_R                       = 0b00010000;
const PIECE_Q                       = 0b00100000;
const PIECE_K                       = 0b01000000;
const PIECE_EMPTY                   = 0b10000000;
const CASTLING_W_K                  = 0b0001;
const CASTLING_W_Q                  = 0b0010;
const CASTLING_B_K                  = 0b0100;
const CASTLING_B_Q                  = 0b1000;

const PIECE_MAP = {
    p:      PIECE_P,
    n:      PIECE_N,
    b:      PIECE_B,
    r:      PIECE_R,
    q:      PIECE_Q,
    k:      PIECE_K,
    empty:  PIECE_EMPTY
};

const INVERSE_PIECE_MAP = {
    [PIECE_P]: 'p',
    [PIECE_N]: 'n',
    [PIECE_B]: 'b',
    [PIECE_R]: 'r',
    [PIECE_Q]: 'q',
    [PIECE_K]: 'k'
};

const PIECE_DISPLAY_MAP = ['win32', 'browser'].indexOf(process.platform) >= 0 ? {
    [PIECE_P]:      '♟',
    [PIECE_N]:      '♞',
    [PIECE_B]:      '♝',
    [PIECE_R]:      '♜',
    [PIECE_Q]:      '♛',
    [PIECE_K]:      '♚',
    [PIECE_EMPTY]:  ' '
} : {
    [PIECE_P]:      'p',
    [PIECE_N]:      'n',
    [PIECE_B]:      'b',
    [PIECE_R]:      'r',
    [PIECE_Q]:      'q',
    [PIECE_K]:      'k',
    [PIECE_EMPTY]:  ' '
};

var PIECE_TO_LOG = [];
PIECE_TO_LOG[PIECE_P]       = 1;
PIECE_TO_LOG[PIECE_N]       = 2;
PIECE_TO_LOG[PIECE_B]       = 3;
PIECE_TO_LOG[PIECE_R]       = 4;
PIECE_TO_LOG[PIECE_Q]       = 5;
PIECE_TO_LOG[PIECE_K]       = 6;
PIECE_TO_LOG[PIECE_EMPTY]   = 7;

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
    [DELTA_BISHOP,  PIECE_MAP.b],
    [DELTA_ROOK,    PIECE_MAP.r],
    [DELTA_KNIGHT,  PIECE_MAP.n],
    [DELTA_KING,    PIECE_MAP.k]
];

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

var CASTLING_MAP    = [];
CASTLING_MAP[39]    = 37;
CASTLING_MAP[35]    = 37;
CASTLING_MAP[144]   = 142;
CASTLING_MAP[140]   = 142;

var CASTLING_ROOK_MOVES     = [];
CASTLING_ROOK_MOVES[35]     = 384; //utils.createMove(33, 36, MOVE_BITS_EMPTY);
CASTLING_ROOK_MOVES[39]     = 647; //utils.createMove(40, 38, MOVE_BITS_EMPTY);
CASTLING_ROOK_MOVES[140]    = 13929; //utils.createMove(138, 141, MOVE_BITS_EMPTY);
CASTLING_ROOK_MOVES[144]    = 14192; //utils.createMove(145, 143, MOVE_BITS_EMPTY);

const PAWN_FIRST_RANK = [
    [48, 55],
    [123, 130]
];

const PAWN_LAST_RANK = [
    [138, 145],
    [33, 40]
];

const SEARCH_LIMIT_CHECK = 20000;

const FEN_BOARD_REGEX = /^\s*([rnbqkpRNBQKP1-8]+\/){7}([rnbqkpRNBQKP1-8]+)\s[bw]\s(-|K?Q?k?q?)\s(-|[a-h‌​][36])/;
const MOVE_REGEX = /^[a-h][1-8][a-h][1-8][bnrq]?$/;

module.exports = {
    WHITE,
    BLACK,
    WIDTH,
    HEIGHT,
    MOVE_BITS_EMPTY,
    MOVE_BITS_CAPTURE,
    MOVE_BITS_CASTLING,
    MOVE_BITS_EN_PASSANT,
    MOVE_BITS_PAWN,
    MOVE_BITS_DOUBLE_PAWN,
    MOVE_BITS_PROMOTION,
    MOVE_BITS_PROMOTION_CAPTURE,
    MOVE_FROM_MASK,
    MOVE_TO_MASK,
    MOVE_PROMOTION_MASK,
    MOVE_CAPTURED_MASK,
    MOVE_BITS_MASK,
    MOVE_ORDER_MASK,
    MOVE_TO_SHIFT,
    MOVE_PROMOTION_SHIFT,
    MOVE_CAPTURED_SHIFT,
    MOVE_ORDER_SHIFT,
    MOVE_INDEX_OFFSET,
    JUST_PIECE,
    PIECE_P,
    PIECE_N,
    PIECE_B,
    PIECE_R,
    PIECE_Q,
    PIECE_K,
    PIECE_EMPTY,
    CASTLING_W_K,
    CASTLING_W_Q,
    CASTLING_B_K,
    CASTLING_B_Q,
    PIECE_MAP,
    INVERSE_PIECE_MAP,
    PIECE_DISPLAY_MAP,
    PIECE_TO_LOG,
    DELTA_KNIGHT,
    DELTA_KING,
    DELTA_BISHOP,
    DELTA_ROOK,
    DELTA_MAP,
    CASTLING,
    CASTLING_INFO,
    CASTLING_MAP,
    CASTLING_ROOK_MOVES,
    PAWN_FIRST_RANK,
    PAWN_LAST_RANK,
    SEARCH_LIMIT_CHECK,
    FEN_BOARD_REGEX,
    MOVE_REGEX
};