'use strict';

const constants = require('./constants');
const HashTable = require('./hash_table');
const utils = require('./utils');

/*
 * Coefficients
 */
const MATERIAL_COEFF = 100;
const PST_COEFF = 50;
const MOBILITY_COEFF = 0;
const PIECE_BONUSES_COEFF = 30;
const PAWN_STRUCT_COEFF = 30;
const KING_SAFETY_COEFF = 0;
const TOTAL_COEFFICIENT =
    MATERIAL_COEFF +
    PST_COEFF +
    MOBILITY_COEFF +
    PIECE_BONUSES_COEFF +
    PAWN_STRUCT_COEFF +
    KING_SAFETY_COEFF;

/*
 * Piece values
 */
var PIECE_VALUES = [];
PIECE_VALUES[constants.PIECE_P] = 100;
PIECE_VALUES[constants.PIECE_N] = 300;
PIECE_VALUES[constants.PIECE_B] = 310;
PIECE_VALUES[constants.PIECE_R] = 500;
PIECE_VALUES[constants.PIECE_Q] = 975;
PIECE_VALUES[constants.PIECE_K] = 20000;

/*
 * Eval hash
 */
var evalTable = new HashTable(22);

/*
 * Piece square tables
 */
var PIECE_SQUARE_TABLES = [];

PIECE_SQUARE_TABLES[constants.PIECE_P] = [
    0,   0,   0,   0,   0,   0,   0,   0,
    5,  10,  15,  20,  20,  15,  10,   5,
    4,   8,  12,  16,  16,  12,   8,   4,
    3,   6,   9,  12,  12,   9,   6,   3,
    2,   4,   6,   8,   8,   6,   4,   2,
    1,   2,   3, -10, -10,   3,   2,   1,
    0,   0,   0, -40, -40,   0,   0,   0,
    0,   0,   0,   0,   0,   0,   0,   0
];

PIECE_SQUARE_TABLES[constants.PIECE_N] = [
    -10, -10, -10, -10, -10, -10, -10, -10,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -10,   0,   5,   5,   5,   5,   0, -10,
    -10,   0,   5,  10,  10,   5,   0, -10,
    -10,   0,   5,  10,  10,   5,   0, -10,
    -10,   0,   5,   5,   5,   5,   0, -10,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -10, -30, -10, -10, -10, -10, -30, -10
];

PIECE_SQUARE_TABLES[constants.PIECE_B] = [
    -10, -10, -10, -10, -10, -10, -10, -10,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -10,   0,   5,   5,   5,   5,   0, -10,
    -10,   0,   5,  10,  10,   5,   0, -10,
    -10,   0,   5,  10,  10,   5,   0, -10,
    -10,   0,   5,   5,   5,   5,   0, -10,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -10, -10, -20, -10, -10, -20, -10, -10
];

PIECE_SQUARE_TABLES[constants.PIECE_R] = [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0
];

PIECE_SQUARE_TABLES[constants.PIECE_Q] = [
    -10, -5, -5, -1, -1, -5, -5,-10,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  1,  1,  1,  1,  0, -5,
     -1,  0,  1,  1,  1,  1,  0, -1,
      0,  0,  1,  1,  1,  1,  0, -1,
     -5,  1,  1,  1,  1,  1,  0, -5,
     -5,  0,  1,  0,  0,  0,  0, -5,
    -10, -5, -5, -1, -1, -5, -5,-10
];

// Two piece square tables for king, interpolate between them based on game phase
PIECE_SQUARE_TABLES[constants.PIECE_K] = [
[
    -40, -40, -40, -40, -40, -40, -40, -40,
    -40, -40, -40, -40, -40, -40, -40, -40,
    -40, -40, -40, -40, -40, -40, -40, -40,
    -40, -40, -40, -40, -40, -40, -40, -40,
    -40, -40, -40, -40, -40, -40, -40, -40,
    -40, -40, -40, -40, -40, -40, -40, -40,
    -20, -20, -20, -20, -20, -20, -20, -20,
      0,  20,  40, -20,   0, -20,  40,  20
],
[
      0,  10,  20,  30,  30,  20,  10,   0,
     10,  20,  30,  40,  40,  30,  20,  10,
     20,  30,  40,  50,  50,  40,  30,  20,
     30,  40,  50,  60,  60,  50,  40,  30,
     30,  40,  50,  60,  60,  50,  40,  30,
     20,  30,  40,  50,  50,  40,  30,  20,
     10,  20,  30,  40,  40,  30,  20,  10,
      0,  10,  20,  30,  30,  20,  10,   0
]];

// Map 64 arrays to 180 arrays
var PADDED_PIECE_SQUARE_TABLES = [];
for (var piece = constants.PIECE_P; piece <= constants.PIECE_K; piece = piece << 1) {
    if (piece === constants.PIECE_K) {
        PADDED_PIECE_SQUARE_TABLES[piece] = [
            utils.padIndices(PIECE_SQUARE_TABLES[piece][0]),
            utils.padIndices(PIECE_SQUARE_TABLES[piece][1])
        ];
    } else {
        PADDED_PIECE_SQUARE_TABLES[piece] = utils.padIndices(PIECE_SQUARE_TABLES[piece]);
    }
}

// Internal eval count
var evalCount = 0;

function evaluate(board, display) {
    evalCount++;

    var savedEval = evalTable.get(board.loHash, board.hiHash);

    if (savedEval) {
        return savedEval;
    }

    // "Losing the game penalty"
    // var legalMoves = board.generateLegalMoves();
    // var isInCheck = board.isInCheck(board.turn);

    // if (legalMoves.length === 0 && isInCheck) {
    //     return -1 * PIECE_VALUES[constants.PIECE_K];
    // }

    // Summed values
    var material        = [0, 0];
    var pst             = [0, 0];
    var mobility        = [0, 0];
    var pawnStructure   = [0, 0];
    var kingSafety      = [0, 0];
    var pieceBonuses    = [0, 0];

    // Mobility
    //mobility[board.turn] = legalMoves.length;

    // Game phase and close
    var gamePhase = phase(board);
    var gameClosed = closedGame(board);

    // Evaluation variables
    var i;
    var index;
    var pieces;
    var piece;
    var pawns;
    var rank;
    var file;
    var turn;
    var pieceSquareTable;
    var pawnRankOffset;

    var pawnsByFile = [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ];

    // High rank of pawn on file, positive for both turns
    var pawnRank = [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ];

    // Pawn pairity in terms of even or odd squares
    // Number of odd squares
    // Number of even squares = pawns.length - number of odd squares
    var pawnNumber = [[0, 0], [0, 0]];

    // Pawn preprocessing
    for (turn = 0; turn < 2; turn++) {
        pawns = board.pieces[turn].pieces[constants.PIECE_P];

        for (i = 0; i < pawns.length; i++) {
            index = pawns.indices[i];
            rank = utils.indexToRank(index);
            file = utils.indexToFile(index);
            pawnRankOffset = turn ? rank : 7 - rank;
            pawnsByFile[turn][file] += 1;

            // Pawn rank to be positive
            if (pawnRankOffset > pawnRank[turn][file]) {
                pawnRank[turn][file] = pawnRankOffset;
            }

            pawnNumber[turn][index % 2] += 1;
        }
    }

    // Loop over every piece for piece bonuses, material and PST
    for (turn = 0; turn < 2; turn++) {
        pieces = board.pieces[turn];

        for (i = 0; i < pieces.length; i++) {
            index = pieces.indices[i];
            piece = board.board[index] & constants.JUST_PIECE;
            material[turn] += PIECE_VALUES[piece];

            switch (piece) {
                case constants.PIECE_P:
                    pst[turn] += PADDED_PIECE_SQUARE_TABLES[piece][turn][index];
                    pawnStructure[turn] += pawn(board, index, turn, pawnsByFile, pawnRank);
                    break;
                case constants.PIECE_N:
                    pst[turn] += PADDED_PIECE_SQUARE_TABLES[piece][turn][index];
                    pieceBonuses[turn] += knight(board, index, turn, gameClosed, pawnRank);
                    break;
                case constants.PIECE_B:
                    pst[turn] += PADDED_PIECE_SQUARE_TABLES[piece][turn][index];
                    pieceBonuses[turn] += bishop(board, index, turn, pawnNumber);
                    break;
                case constants.PIECE_R:
                    pst[turn] += PADDED_PIECE_SQUARE_TABLES[piece][turn][index];
                    pieceBonuses[turn] += rook(board, index, turn, pawnRank);
                    break;
                case constants.PIECE_Q:
                    pst[turn] += PADDED_PIECE_SQUARE_TABLES[piece][turn][index];
                    pieceBonuses[turn] += queen(board, index, turn);
                    break;
                case constants.PIECE_K:
                    pst[turn] += interpolate(PADDED_PIECE_SQUARE_TABLES[piece][0][turn][index], PADDED_PIECE_SQUARE_TABLES[piece][1][turn][index], gamePhase);
                    kingSafety[turn] += king(board, index, turn);
                    break;
            }
        }
    }

    var turnCoefficient = board.turn === 0 ? 1 : -1;

    var total =
        MATERIAL_COEFF      * (material[0] - material[1]) +
        PST_COEFF           * (pst[1] - pst[0]) +
        PAWN_STRUCT_COEFF   * (pawnStructure[0] - pawnStructure[1]) +
        MOBILITY_COEFF      * (mobility[0] - mobility[1]) +
        KING_SAFETY_COEFF   * (kingSafety[0] - kingSafety[1]) +
        PIECE_BONUSES_COEFF * (pieceBonuses[0] - pieceBonuses[1]);

    total = Math.round(turnCoefficient * total / TOTAL_COEFFICIENT);

    if (display) {
        console.log('Material:      ', MATERIAL_COEFF,      '* (' + material[0]      + ' - ' + material[1]       + ') =', MATERIAL_COEFF * (material[0] - material[1]));
        console.log('PST:           ', PST_COEFF,           '* (' + pst[0]           + ' - ' + pst[1]            + ') =', PST_COEFF * (pst[0] - pst[1]));
        console.log('Pawn structure:', PAWN_STRUCT_COEFF,   '* (' + pawnStructure[0] + ' - ' + pawnStructure[1]  + ') =', PAWN_STRUCT_COEFF * (pawnStructure[0] - pawnStructure[1]));
        console.log('Mobility:      ', MOBILITY_COEFF,      '* (' + mobility[0]      + ' - ' + mobility[1]       + ') =', MOBILITY_COEFF * (mobility[0] - mobility[1]));
        console.log('King safety:   ', KING_SAFETY_COEFF,   '* (' + kingSafety[0]    + ' - ' + kingSafety[1]     + ') =', KING_SAFETY_COEFF * (kingSafety[0] - kingSafety[1]));
        console.log('Piece Bonuses: ', PIECE_BONUSES_COEFF, '* (' + pieceBonuses[0]  + ' - ' + pieceBonuses[1]   + ') =', PIECE_BONUSES_COEFF * (pieceBonuses[0] - pieceBonuses[0]));
        console.log('Total:         ', total);
    }

    // Set in hash table
    evalTable.set(board.loHash, board.hiHash, total);

    return total;
}

const DOUBLED_PAWN_PENALTY = 20;
const ISOLATED_PAWN_PENALTY = 10;
const BACKWARD_PAWN_PENALTY = 8;
const PASSED_PAWN_BONUS = 30;
const PROTECTED_PAWN_BONUS = 10;

function pawn(board, index, turn, pawnsByFile, pawnRank) {
    var bonus = 0;
    var behindCoefficient = turn ? -1 : 1;
    var file = utils.indexToFile(index);
    var rank = utils.indexToRank(index);
    var pawnRankOffset = turn ? rank : 7 - rank;
    var inversePawnRankOffset = 7 - pawnRankOffset;
    var behind = index + behindCoefficient * constants.WIDTH;
    var left = index + behindCoefficient * (constants.WIDTH - 1);
    var right = index + behindCoefficient * (constants.WIDTH + 1);

    // Doubled pawn
    if (board.board[behind] === constants.PIECE_P && board.board[behind] & 1 === board.turn) {
        bonus -= DOUBLED_PAWN_PENALTY;
    }

    // Isolated pawn
    if (pawnsByFile[turn][file - 1] === 0 && pawnsByFile[turn][file + 1] === 0) {
        bonus -= ISOLATED_PAWN_PENALTY;
    }

    // Backward pawn
    if (pawnRank[turn][file - 1] > pawnRankOffset && pawnRank[turn][file + 1] > pawnRankOffset) {
        bonus -= BACKWARD_PAWN_PENALTY;
    }

    // Passed pawn
    if ((file - 1 < 0 || pawnRank[turn ^ 1][file - 1] <= inversePawnRankOffset) &&
       (pawnRank[turn ^ 1][file] <= inversePawnRankOffset) &&
       (file + 1 > 7 || pawnRank[turn ^ 1][file + 1] <= inversePawnRankOffset)) {
        bonus += PASSED_PAWN_BONUS;
    }

    // Protected pawn
    if ((board.board[left] === constants.PIECE_P && board.board[left] & 1 === turn) ||
        (board.board[right] === constants.PIECE_P && board.board[right] & 1 === turn)) {
        bonus += PROTECTED_PAWN_BONUS;
    }

    return bonus;
}

const KNIGHT_CLOSED_GAME_BONUS = 5;
const KNIGHT_OUTPOST_BONUS = 10;

function knight(board, index, turn, gameClosed, pawnRank) {
    var bonus = 0;
    var behindCoefficient = turn ? -1 : 1;
    var left = index + behindCoefficient * (constants.WIDTH - 1);
    var right = index + behindCoefficient * (constants.WIDTH + 1);

    // Closed game bonus
    if (gameClosed >= 0.5) {
        bonus += KNIGHT_CLOSED_GAME_BONUS;
    }

    // Outpost bonus
    var rank = utils.indexToRank(index);
    var pawnRankOffset = turn ? rank : 7 - rank;

    if (pawnRankOffset > 3 &&
        // Protected
        ((board.board[left] === constants.PIECE_P && board.board[left] & 1 === board.turn) ||
        (board.board[right] === constants.PIECE_P && board.board[right] & 1 === board.turn))) {
        bonus += KNIGHT_OUTPOST_BONUS;
    }

    return bonus;
}

const BISHOP_DOUBLE_BONUS = 5;
const BISHOP_PAIR_BONUS = 10;
const BISHOP_PAIRITY_PENALTY = 10;

function bishop(board, index, turn, pawnNumber) {
    var bonus = 0;
    var bishops = board.pieces[turn].pieces[constants.PIECE_B];

    // Bishop pair
    // TODO: Extend this to up to 10 bishops
    if (bishops.length === 2) {
        bonus += BISHOP_DOUBLE_BONUS;

        if (bishops[0] % 2 !== bishops[1] % 2) {
            bonus += BISHOP_PAIR_BONUS;
        }
    }

    // Close if they have many pawns on that diagonal
    bonus -= BISHOP_PAIRITY_PENALTY * pawnNumber[turn ^ 1][index % 2];

    return bonus;
}

const ROOK_SEMI_OPEN_FILE_BONUS = 10;
const ROOK_OPEN_FILE_BONUS = 15;
const ROOK_ON_SEVENTH_BONUS = 20;
const ROOK_CONNECTED_BONUS = 20;

function rook(board, index, turn, pawnRank) {
    var bonus = 0;
    var rank = utils.indexToRank(index);
    var file = utils.indexToRank(index);
    var pawnRankOffset = turn ? rank : 7 - rank;

    // Open file
    if (pawnRank[turn][file] === 0) {
        if (pawnRank[turn ^ 1][file] === 0) {
            bonus += ROOK_OPEN_FILE_BONUS;
        } else {
            bonus += ROOK_SEMI_OPEN_FILE_BONUS;
        }
    }

    if (pawnRankOffset === 6) {
        bonus += ROOK_ON_SEVENTH_BONUS;
    }

    return bonus;
}

function queen(board, index, turn) {


    return 0;
}

function king(board, index, turn) {
    // Pawn shield


    // King tropism

    return 0;
}

// Produce phase coefficient
// Inspired by Mediocre's implementaton of gamePhase()
function phase(board) {
    // 0.0 for end
    // 1.0 for opening
    var phaseCheck = 24;

    for (var turn = 0; turn < 2; turn++) {
        phaseCheck -= board.pieces[turn].pieces[constants.PIECE_N].length;
        phaseCheck -= board.pieces[turn].pieces[constants.PIECE_B].length;
        phaseCheck -= board.pieces[turn].pieces[constants.PIECE_R].length * 2;
        phaseCheck -= board.pieces[turn].pieces[constants.PIECE_Q].length * 4;
    }

    return phaseCheck / 24;
}

function closedGame(board) {
    // 0.0 for open game (minimal pawns)
    // 1.0 for closed game (maximal pawns)
    return (16 - (board.pieces[0].pieces[constants.PIECE_P].length + board.pieces[1].pieces[constants.PIECE_P].length)) / 16;
}

// Linear interpolation between two values based on phase.
function interpolate(a, b, aPhase) {
    return (aPhase * a + (1 - aPhase) * b) >> 0;
}

function resetEvalCount() {
    evalCount = 0;
}

function getEvalCount() {
    return evalCount;
}

module.exports = {
    evaluate,
    resetEvalCount,
    getEvalCount
};