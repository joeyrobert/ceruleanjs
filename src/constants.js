'use strict';

const WHITE                         = 1;
const BLACK                         = 0;
const WIDTH                         = 15;
const HEIGHT                        = 12;
const MOVE_BITS_EMPTY               = 0;
const MOVE_BITS_CAPTURE             = 1 << 20;
const MOVE_BITS_CASTLING            = 2 << 20;
const MOVE_BITS_EN_PASSANT          = 3 << 20;
const MOVE_BITS_PAWN                = 4 << 20;
const MOVE_BITS_DOUBLE_PAWN         = 5 << 20;
const MOVE_BITS_PROMOTION           = 6 << 20;
const MOVE_BITS_PROMOTION_CAPTURE   = 7 << 20;
const MOVE_FROM_MASK                = 0b00000000000000000000000001111111;
const MOVE_TO_MASK                  = 0b00000000000000000011111110000000;
const MOVE_PROMOTION_MASK           = 0b00000000000000011100000000000000;
const MOVE_CAPTURED_MASK            = 0b00000000000011100000000000000000;
const MOVE_BITS_MASK                = 0b00000000011100000000000000000000;
const MOVE_ORDER_MASK               = 0b11111111100000000000000000000000;
const MOVE_TO_SHIFT                 = 7;
const MOVE_PROMOTION_SHIFT          = 14;
const MOVE_CAPTURED_SHIFT           = 17;
const MOVE_ORDER_SHIFT              = 26;
const MOVE_INDEX_OFFSET             = 33;
const JUST_PIECE                    = 0b1110;
const PAWN                          = 0;
const KNIGHT                        = 2;
const BISHOP                        = 4;
const ROOK                          = 6;
const QUEEN                         = 8;
const KING                          = 10;
const EMPTY                         = 12;
const OUT_OF_BOUNDS                 = 16;
const CASTLING_W_K                  = 0b0001;
const CASTLING_W_Q                  = 0b0010;
const CASTLING_B_K                  = 0b0100;
const CASTLING_B_Q                  = 0b1000;

const PIECE_MAP = {
    p:      PAWN,
    n:      KNIGHT,
    b:      BISHOP,
    r:      ROOK,
    q:      QUEEN,
    k:      KING,
    empty:  EMPTY
};

const INVERSE_PIECE_MAP = {
    [PAWN]:     'p',
    [KNIGHT]:   'n',
    [BISHOP]:   'b',
    [ROOK]:     'r',
    [QUEEN]:    'q',
    [KING]:     'k'
};

const PIECE_DISPLAY_MAP = process.platform !== 'win32' && !process.browser ? {
    [PAWN]:     '\u265f',
    [KNIGHT]:   '\u265e',
    [BISHOP]:   '\u265d',
    [ROOK]:     '\u265c',
    [QUEEN]:    '\u265b',
    [KING]:     '\u265a',
    [EMPTY]:    ' '
} : {
    [PAWN]:     'p',
    [KNIGHT]:   'n',
    [BISHOP]:   'b',
    [ROOK]:     'r',
    [QUEEN]:    'q',
    [KING]:     'k',
    [EMPTY]:    ' '
};

var PIECE_VALUES        = [];
PIECE_VALUES[PAWN]      = 100;
PIECE_VALUES[KNIGHT]    = 300;
PIECE_VALUES[BISHOP]    = 310;
PIECE_VALUES[ROOK]      = 500;
PIECE_VALUES[QUEEN]     = 975;
PIECE_VALUES[KING]      = 20000;

var MVV_LVA_PIECE_VALUES        = [];
MVV_LVA_PIECE_VALUES[PAWN]      = 1;
MVV_LVA_PIECE_VALUES[KNIGHT]    = 2;
MVV_LVA_PIECE_VALUES[BISHOP]    = 2;
MVV_LVA_PIECE_VALUES[ROOK]      = 3;
MVV_LVA_PIECE_VALUES[QUEEN]     = 4;
MVV_LVA_PIECE_VALUES[KING]      = 5;
MVV_LVA_PIECE_VALUES[EMPTY]     = 0;

var SEE_PIECE_VALUES        = [];
SEE_PIECE_VALUES[PAWN]      = 1;
SEE_PIECE_VALUES[KNIGHT]    = 3;
SEE_PIECE_VALUES[BISHOP]    = 3;
SEE_PIECE_VALUES[ROOK]      = 5;
SEE_PIECE_VALUES[QUEEN]     = 9;
SEE_PIECE_VALUES[KING]      = 31;
SEE_PIECE_VALUES[EMPTY]     = 0;

const MATE_VALUE = 100000;

const DELTA_KNIGHT = new Int32Array([
    -31,
    -29,
    -17,
    -13,
    13,
    17,
    29,
    31
]);

const DELTA_KING = new Int32Array([
    -16,
    -15,
    -14,
    -1,
    1,
    14,
    15,
    16
]);

const DELTA_BISHOP = new Int32Array([
    -16,
    -14,
    14,
    16
]);

const DELTA_ROOK = new Int32Array([
    -15,
    -1,
    1,
    15
]);

// Pawns have a directional component, this doesn't consider that
const DELTA_PAWN = new Int32Array([
    -16,
    -14,
    14,
    16
]);

const DELTA_MAP = [
    [DELTA_BISHOP,  BISHOP],
    [DELTA_ROOK,    ROOK],
    [DELTA_KNIGHT,  KNIGHT],
    [DELTA_KING,    KING]
];

const CASTLING = {
    K: CASTLING_W_K,
    Q: CASTLING_W_Q,
    k: CASTLING_B_K,
    q: CASTLING_B_Q
};

// Refactor/remove this, getting unweildy
const CASTLING_INFO = [
    [CASTLING_B_K, 142, 144, 145, 143, 'k', 2],
    [CASTLING_B_Q, 142, 140, 138, 141, 'q', 3],
    [CASTLING_W_K, 37, 39, 40, 38, 'K', 0],
    [CASTLING_W_Q, 37, 35, 33, 36, 'Q', 1]
];

var CASTLING_MAP    = [];
CASTLING_MAP[35]    = 37;
CASTLING_MAP[39]    = 37;
CASTLING_MAP[140]   = 142;
CASTLING_MAP[144]   = 142;

var CASTLING_ROOK_FROM  = new Uint32Array(145);
CASTLING_ROOK_FROM[35]  = 33;
CASTLING_ROOK_FROM[39]  = 40;
CASTLING_ROOK_FROM[140] = 138;
CASTLING_ROOK_FROM[144] = 145;

var CASTLING_ROOK_TO  = new Uint32Array(145);
CASTLING_ROOK_TO[35]  = 36;
CASTLING_ROOK_TO[39]  = 38;
CASTLING_ROOK_TO[140] = 141;
CASTLING_ROOK_TO[144] = 143;

const PAWN_FIRST_RANK = [
    [123, 130],
    [48, 55]
];

const PAWN_LAST_RANK = [
    [33, 40],
    [138, 145]
];

const SEARCH_LIMIT_CHECK = 10000;

const FEN_BOARD_REGEX = /^\s*([rnbqkpRNBQKP1-8]+\/){7}([rnbqkpRNBQKP1-8]+)\s[bw]\s(-|K?Q?k?q?)\s(-|[a-h‌​][36])/;
const MOVE_REGEX = /^[a-h][1-8][a-h][1-8][bnrq]?$/;
const LEVEL_REGEX = /^\d+ \d+(:\d{2})? \d+$/;

const ANSI_COLORS = {
    white:      '\u001b[39m',
    black:      '\u001b[30m',
    bgWhite:    '\u001b[47m',
    bgBlack:    '\u001b[40m',
    bgGreen:    '\u001b[42m',
    bgYellow:   '\u001b[43m',
    reset:      '\u001b[0m'
};

const POLYGLOT_PROMOTION_STRINGS = [
    '',
    'N',
    'B',
    'R',
    'Q'
];

// Attack lookup table entries
const ATTACK_NONE        = 0b000000; // 0
const ATTACK_DIAGONAL    = 0b000001; // 1
const ATTACK_HORIZONTAL  = 0b000010; // 2
const ATTACK_VERTICAL    = 0b000100; // 4
const ATTACK_KNIGHT      = 0b001000; // 8
const ATTACK_KING        = 0b010000; // 16
const ATTACK_PAWN        = 0b100000; // 32
const ATTACK_PIECE_ORDER = new Uint32Array([
    PAWN,
    KNIGHT,
    KING,
    BISHOP,
    ROOK,
    QUEEN,
]);

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
    PAWN,
    KNIGHT,
    BISHOP,
    ROOK,
    QUEEN,
    KING,
    EMPTY,
    OUT_OF_BOUNDS,
    CASTLING_W_K,
    CASTLING_W_Q,
    CASTLING_B_K,
    CASTLING_B_Q,
    PIECE_MAP,
    INVERSE_PIECE_MAP,
    PIECE_DISPLAY_MAP,
    PIECE_VALUES,
    MVV_LVA_PIECE_VALUES,
    SEE_PIECE_VALUES,
    MATE_VALUE,
    DELTA_KNIGHT,
    DELTA_KING,
    DELTA_BISHOP,
    DELTA_ROOK,
    DELTA_PAWN,
    DELTA_MAP,
    CASTLING,
    CASTLING_INFO,
    CASTLING_MAP,
    CASTLING_ROOK_FROM,
    CASTLING_ROOK_TO,
    PAWN_FIRST_RANK,
    PAWN_LAST_RANK,
    SEARCH_LIMIT_CHECK,
    FEN_BOARD_REGEX,
    MOVE_REGEX,
    LEVEL_REGEX,
    ANSI_COLORS,
    POLYGLOT_PROMOTION_STRINGS,
    ATTACK_NONE,
    ATTACK_DIAGONAL,
    ATTACK_HORIZONTAL,
    ATTACK_VERTICAL,
    ATTACK_KNIGHT,
    ATTACK_KING,
    ATTACK_PAWN,
    ATTACK_PIECE_ORDER,
};