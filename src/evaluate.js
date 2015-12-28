'use strict';

const constants = require('./constants');
const utils = require('./utils');

/*
 * Piece values
 */
var PIECE_VALUES = [];
PIECE_VALUES[constants.PIECE_P] = 100;
PIECE_VALUES[constants.PIECE_N] = 320;
PIECE_VALUES[constants.PIECE_B] = 330;
PIECE_VALUES[constants.PIECE_R] = 500;
PIECE_VALUES[constants.PIECE_Q] = 900;
PIECE_VALUES[constants.PIECE_K] = 20000;

/*
 * Piece square tables
 */
var PIECE_SQUARE_TABLES = [];

PIECE_SQUARE_TABLES[constants.PIECE_P] = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
];

PIECE_SQUARE_TABLES[constants.PIECE_N] = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
];

PIECE_SQUARE_TABLES[constants.PIECE_B] = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
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
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
];

PIECE_SQUARE_TABLES[constants.PIECE_K] = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
];

// Map 64 arrays to 180 arrays
var PADDED_PIECE_SQUARE_TABLES = [];
Object.keys(PIECE_SQUARE_TABLES).forEach(piece => {
    piece = parseInt(piece, 10);
    PADDED_PIECE_SQUARE_TABLES[piece] = padIndices(PIECE_SQUARE_TABLES[piece]);
});

/*
 * Penalties and rewards
 */


// Internal eval count
var evalCount = 0;

function padIndices(pieceSquareTable) {
    var paddedPieceSquareTable = [],
        paddedInvertedPieceSquareTable = [];

    for (var index64 = 0; index64 < 64; index64++) {
        var rank = utils.index64ToRank(index64);
        var file = utils.index64ToFile(index64);
        var index180 = utils.rankFileToIndex(rank, file);
        var invertedIndex180 = utils.rankFileToIndex(9 - rank, file);

        paddedPieceSquareTable[index180] = pieceSquareTable[index64];
        paddedInvertedPieceSquareTable[invertedIndex180] = pieceSquareTable[index64];
    }

    return [paddedPieceSquareTable, paddedInvertedPieceSquareTable];
}

function evaluate(board) {
    evalCount++;
    var i, index, pieces, piece, turn, turnCoefficient;
    var material = 0, pst = 0;

    for (turn = 0; turn < 2; turn++) {
        turnCoefficient = turn ? -1 : 1;
        pieces = board.pieces[turn];
        for (i = 0; i < pieces.length; i++) {
            index = pieces.indices[i];
            piece = board.board[index] & constants.JUST_PIECE;
            material += turnCoefficient * PIECE_VALUES[piece];
            pst += turnCoefficient * PADDED_PIECE_SQUARE_TABLES[piece][turn][index];


        }
    }

    return (board.turn ? -1 : 1) * (material);
}

// Produce gameStage coefficient
function gameStage(board) {
    // 0.0 for opening
    // 1.0 for end
}

function castling(board) {

}

function kingSafety(board) {
    // Pawn shield

    // King tropism
}

function pawnStructure(board) {
    // Doubled pawn

    // Isolated pawn

    // Backward pawn

    // Passed pawn

    // Edge pawn

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