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

function createMove(from, to, bits, captured, promotion) {
    var move =  (from - 33) +
                ((to - 33) << 7) +
                (bits >> 1 << 1);

    if (promotion) {
        move += constants.PIECE_TO_LOG[promotion] << 14;
    }

    if (captured) {
        move += constants.PIECE_TO_LOG[(captured & constants.JUST_PIECE) || constants.PIECE_EMPTY] << 17;
    }

    return move;
}

function moveFrom(move) {
    return       (move & 0b00000000000000000000000001111111) + 33;
}

function moveTo(move) {
    return      ((move & 0b00000000000000000011111110000000) >> 7) + 33;
}

function movePromotion(move) {
    var power = ((move & 0b00000000000000011100000000000000) >> 14);
    return power && (1 << power);
}

function moveCaptured(move) {
    var power = ((move & 0b00000000000011100000000000000000) >> 17);
    return power ? (1 << power) : constants.PIECE_EMPTY;
}

function moveBits(move) {
    return        move & 0b00000011111100000000000000000000;
}

function moveOrder(move) {
    return        move & 0b11111100000000000000000000000000;
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
    createMove,
    moveFrom,
    moveTo,
    movePromotion,
    moveCaptured,
    moveBits
};