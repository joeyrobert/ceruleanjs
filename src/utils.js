'use strict';

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

module.exports = {
    isNumeric,
    rankFileToIndex,
    indexToRank,
    indexToFile,
    algebraicToIndex,
    indexToAlgebraic,
    index64ToIndex180,
    index64ToRank,
    index64ToFile
};