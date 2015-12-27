'use strict';

const constants = require('./constants');

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function rankFileToIndex(rankIndex, fileIndex) {
    return rankIndex * 15 + fileIndex + 17;
}

function indexToRank(index) {
    return Math.floor(index / 15 - 1);
}

function indexToFile(index) {
    return (index - 3) % 15 + 1;
}

function algebraicToIndex(algebraic) {
    var splitted = algebraic.split('');
    var fileIndex = splitted[0].charCodeAt(0) - 96;
    var rankIndex = parseInt(splitted[1], 10);
    return rankFileToIndex(rankIndex, fileIndex);
}

function indexToAlgebraic(index) {
    var fileIndex = indexToFile(index);
    var rankIndex = indexToRank(index);
    return String.fromCharCode(96 + fileIndex) + rankIndex;
}

function index64ToIndex180(index64) {
    var rank = index64ToRank(index64);
    var file = index64ToFile(index64);
    var index180 = rankFileToIndex(rank, file);
    return index180;
}

function index64ToRank(index64) {
    return Math.floor(index64 / 8) + 1;
}

function index64ToFile(index64) {
    return index64 % 8 + 1;
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

    var pivot = arr.splice(Math.floor(arr.length / 2), 1)[0];
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
    quickSort
};