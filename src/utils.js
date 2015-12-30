'use strict';

const constants = require('./constants');

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function rankFileToIndex(rankIndex, fileIndex) {
    return (rankIndex + 1) * 15 + fileIndex + 18;
}

function indexToRank(index) {
    return ((index / 15) >> 0) - 2;
}

function indexToFile(index) {
    return (index - 3) % 15;
}

function algebraicToIndex(algebraic) {
    var splitted = algebraic.split('');
    var fileIndex = splitted[0].charCodeAt(0) - 97;
    var rankIndex = parseInt(splitted[1], 10) - 1;
    return rankFileToIndex(rankIndex, fileIndex);
}

function indexToAlgebraic(index) {
    var fileIndex = indexToFile(index) + 1;
    var rankIndex = indexToRank(index) + 1;
    return String.fromCharCode(96 + fileIndex) + rankIndex;
}

function index64ToIndex180(index64) {
    var rank = index64ToRank(index64);
    var file = index64ToFile(index64);
    var index180 = rankFileToIndex(rank, file);
    return index180;
}

function index64ToRank(index64) {
    return (index64 / 8) >> 0;
}

function index64ToFile(index64) {
    return index64 % 8;
}

function moveToString(move) {
    return indexToAlgebraic(moveFrom(move)) + indexToAlgebraic(moveTo(move)) +
        (movePromotion(move) ? constants.INVERSE_PIECE_MAP[movePromotion(move)] : '');
}

function moveToShortString(board, move) {
    // Needs to have unique IDENTIFIER + TO
    // If not unique, add FILE
    // If still not unique, remove FILE add RANK
    var from = moveFrom(move);
    var to = moveTo(move);
    var bits = moveBits(move);
    var captured = moveCaptured(move) !== constants.PIECE_EMPTY ? 'x' : '';
    var piece = (board.board[from] & constants.JUST_PIECE);
    var identifier = piece === constants.PIECE_P ? '' : constants.INVERSE_PIECE_MAP[piece].toUpperCase();
    return identifier + indexToAlgebraic(from) + captured + indexToAlgebraic(to);
}

function createMove(from, to, bits, captured, promotion, order) {
    var move = (from - constants.MOVE_INDEX_OFFSET) +
               ((to - constants.MOVE_INDEX_OFFSET) << constants.MOVE_TO_SHIFT) +
               (bits >> 1 << 1);

    if (promotion) {
        move += constants.PIECE_TO_LOG[promotion] << constants.MOVE_PROMOTION_SHIFT;
    }

    if (captured) {
        move += constants.PIECE_TO_LOG[captured & constants.JUST_PIECE] << constants.MOVE_CAPTURED_SHIFT;
    }

    if (order) {
        move += order << constants.MOVE_ORDER_SHIFT;
    }

    return move;
}

function moveFrom(move) {
    return (move & constants.MOVE_FROM_MASK) + constants.MOVE_INDEX_OFFSET;
}

function moveTo(move) {
    return ((move & constants.MOVE_TO_MASK) >> constants.MOVE_TO_SHIFT) + constants.MOVE_INDEX_OFFSET;
}

function movePromotion(move) {
    var power = ((move & constants.MOVE_PROMOTION_MASK) >> constants.MOVE_PROMOTION_SHIFT);
    return power && (1 << power);
}

function moveCaptured(move) {
    var power = ((move & constants.MOVE_CAPTURED_MASK) >> constants.MOVE_CAPTURED_SHIFT);
    return power ? (1 << power) : constants.PIECE_EMPTY;
}

function moveBits(move) {
    return move & constants.MOVE_BITS_MASK;
}

function moveOrder(move) {
    return (move & constants.MOVE_ORDER_MASK) >> constants.MOVE_ORDER_SHIFT;
}

function moveAddOrder(move, order) {
    return move + (order << constants.MOVE_ORDER_SHIFT);
}

// Recursive quicksort, apparently faster than Array.prototype.sort()
// See https://jsperf.com/javascript-sort/103
function quickSort(arr) {
    if (arr.length <= 1) {
        return arr;
    }

    var pivot = arr.splice(((arr.length / 2) >> 0), 1)[0];
    var left = [];
    var right = [];

    for (var i = 0; i < arr.length; i++) {
        if (arr[i] > pivot) {
            left.push(arr[i]);
        } else {
            right.push(arr[i]);
        }
    }

    return quickSort(left).concat([pivot], quickSort(right));
}

function padIndices(pieceSquareTable) {
    var paddedPieceSquareTables = [
        new Int32Array(constants.WIDTH * constants.HEIGHT),
        new Int32Array(constants.WIDTH * constants.HEIGHT)
    ];

    paddedPieceSquareTables[0].fill(0);
    paddedPieceSquareTables[1].fill(0);

    for (var index64 = 0; index64 < 64; index64++) {
        var rank = index64ToRank(index64);
        var file = index64ToFile(index64);
        var index180 = rankFileToIndex(rank, file);
        var invertedIndex180 = rankFileToIndex(7 - rank, file);

        paddedPieceSquareTables[0][index180] = pieceSquareTable[index64];
        paddedPieceSquareTables[1][invertedIndex180] = pieceSquareTable[index64];
    }

    return paddedPieceSquareTables;
}


module.exports = {
    isNumeric,
    rankFileToIndex,
    indexToRank,
    indexToFile,
    algebraicToIndex,
    indexToAlgebraic,
    index64ToIndex180,
    index64ToRank,
    index64ToFile,
    moveToString,
    moveToShortString,
    createMove,
    moveFrom,
    moveTo,
    movePromotion,
    moveCaptured,
    moveBits,
    moveAddOrder,
    quickSort,
    padIndices
};