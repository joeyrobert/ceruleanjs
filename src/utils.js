'use strict';

const fs = require('fs');
const {
    ANSI_COLORS,
    BLACK,
    EMPTY,
    HEIGHT,
    INVERSE_PIECE_MAP,
    JUST_PIECE,
    MOVE_BITS_MASK,
    MOVE_CAPTURED_MASK,
    MOVE_CAPTURED_SHIFT,
    MOVE_FROM_MASK,
    MOVE_INDEX_OFFSET,
    MOVE_ORDER_MASK,
    MOVE_ORDER_SHIFT,
    MOVE_PROMOTION_MASK,
    MOVE_PROMOTION_SHIFT,
    MOVE_TO_MASK,
    MOVE_TO_SHIFT,
    OUT_OF_BOUNDS,
    PAWN,
    WHITE,
    WIDTH,
} = require('./constants');

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
    return index % 15 - 3;
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

function getPstIndex(index, turn) {
    return (turn * 7 + (1 + turn * -2) * (((index / 15) >> 0) - 2)) * 8 + (index % 15) - 3;
}

function moveToString(move) {
    return indexToAlgebraic(moveFrom(move)) + indexToAlgebraic(moveTo(move)) +
        (movePromotion(move) ? INVERSE_PIECE_MAP[movePromotion(move)] : '');
}

// Inspired by chess.js implementation
function moveToShortString(board, move) {
    // Needs to have unique IDENTIFIER + TO
    // If not unique, add FILE
    // If still not unique, remove FILE add RANK
    var from = moveFrom(move);
    var to = moveTo(move);
    var captured = moveCaptured(move);
    var capturedString = captured !== EMPTY ? 'x' : '';
    var piece = board.board[from] & JUST_PIECE;
    var pieceString = piece === PAWN ? '' : INVERSE_PIECE_MAP[piece].toUpperCase();
    var fromString = '';
    var checkString = '';
    var promotion = movePromotion(move);
    var promotionString = promotion ? '=' + INVERSE_PIECE_MAP[promotion].toUpperCase() : '';
    var moves = board.generateLegalMoves();
    var toAlgebraic = indexToAlgebraic(to);
    var fromAlgebraic = indexToAlgebraic(from);
    var rank = indexToRank(from);
    var file = indexToFile(from);
    var possibleMove, possibleFrom, possibleTo, possiblePiece, possibleRank, possibleFile;
    // Rank is always ambiguous on pawn captures
    var ambiguousRank = captured !== EMPTY && piece === PAWN;
    var ambiguousFile = false;

    // Test ambiguity against all possible moves
    for (var i = 0; i < moves.length; i++) {
        possibleMove = moves[i];
        possibleFrom = moveFrom(possibleMove);
        possibleTo = moveTo(possibleMove);
        possiblePiece = board.board[possibleFrom] & JUST_PIECE;
        possibleRank = indexToRank(possibleFrom);
        possibleFile = indexToFile(possibleFrom);

        // Remove exact from<->to match
        if (possiblePiece === piece && possibleFrom !== from && possibleTo === to) {
            if (possibleRank === rank) {
                ambiguousRank = true;
            }

            if (possibleFile === file) {
                ambiguousFile = true;
            }
        }
    }

    if (ambiguousRank && ambiguousFile) {
        // Both ambiguous, add full from
        fromString = fromAlgebraic;
    } else if (ambiguousFile) {
        // File ambiguous, add unique rank
        fromString = fromAlgebraic[1];
    } else if (ambiguousRank) {
        // Rank ambiguous, add unique file
        fromString = fromAlgebraic[0];
    }

    // Determine check status
    board.addHistory();
    board.addMove(move);

    if (board.isInCheck()) {
        // Checkmate
        if (board.generateLegalMoves().length === 0) {
            checkString = '#';
        } else {
            checkString = '+';
        }
    }

    board.subtractMove(move);
    board.subtractHistory();

    return pieceString + fromString + capturedString + toAlgebraic + promotionString + checkString;
}

function createMove(from, to, bits, captured, promotion, order) {
    var move = (from - MOVE_INDEX_OFFSET) +
               ((to - MOVE_INDEX_OFFSET) << MOVE_TO_SHIFT) +
               (bits >> 1 << 1);

    if (promotion) {
        move += (promotion >> 1) << MOVE_PROMOTION_SHIFT;
    }

    if (captured === undefined) {
        captured = EMPTY;
    }

    move += (captured >> 1) << MOVE_CAPTURED_SHIFT;

    if (order) {
        move += order << MOVE_ORDER_SHIFT;
    }

    return move;
}

function moveFrom(move) {
    return (move & MOVE_FROM_MASK) + MOVE_INDEX_OFFSET;
}

function moveTo(move) {
    return ((move & MOVE_TO_MASK) >> MOVE_TO_SHIFT) + MOVE_INDEX_OFFSET;
}

function movePromotion(move) {
    return ((move & MOVE_PROMOTION_MASK) >> MOVE_PROMOTION_SHIFT) << 1;
}

function moveCaptured(move) {
    return ((move & MOVE_CAPTURED_MASK) >> MOVE_CAPTURED_SHIFT) << 1;
}

function moveBits(move) {
    return move & MOVE_BITS_MASK;
}

function moveOrder(move) {
    return (move & MOVE_ORDER_MASK) >> MOVE_ORDER_SHIFT;
}

function moveAddOrder(move, order) {
    return (move & (~MOVE_ORDER_MASK)) + (order << MOVE_ORDER_SHIFT);
}

// Recursive quicksort, apparently faster than Array.prototype.sort()
// See https://jsperf.com/javascript-sort/103
// Update Dec 2021: Converting to a typed array and sorting significantly faster
// than either quickSort or Array#sort, e.g. a = Uint32Array.from(arr); a.sort()
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
        new Int32Array(WIDTH * HEIGHT),
        new Int32Array(WIDTH * HEIGHT)
    ];

    paddedPieceSquareTables[BLACK].fill(0);
    paddedPieceSquareTables[WHITE].fill(0);

    for (var index64 = 0; index64 < 64; index64++) {
        var rank = index64ToRank(index64);
        var file = index64ToFile(index64);
        var index180 = rankFileToIndex(rank, file);
        var invertedIndex180 = rankFileToIndex(7 - rank, file);

        paddedPieceSquareTables[BLACK][index180] = pieceSquareTable[index64];
        paddedPieceSquareTables[WHITE][invertedIndex180] = pieceSquareTable[index64];
    }

    return paddedPieceSquareTables;
}

function colors(squareEven, turn, text) {
    var squareColor = squareEven ? 'bgWhite' : 'bgCyan';
    var turnColor = 'black';

    return [
        ANSI_COLORS[squareColor],
        ANSI_COLORS[turnColor],
        text,
        ANSI_COLORS.reset
    ].join('');
}

function syncGET(path) {
    // Synchronous HTTP request
    var request = new XMLHttpRequest();
    request.open('GET', path, false);
    request.send(null);

    if (request.status === 200) {
        return request.responseText;
    }
}

function syncGETBuffer(path) {
    // Synchronous HTTP request
    var request = new XMLHttpRequest();
    request.open('GET', path, false);
    request.responseType = 'arraybuffer';
    request.send(null);

    if (request.status === 200) {
        return request.response;
    }
}

function readFile(path) {
    try {
        return fs.readFileSync(path, 'utf8');
    } catch (err) {
        return undefined;
    }
}

function readFileBuffer(path) {
    try {
        return fs.readFileSync(path);
    } catch (err) {
        return undefined;
    }
}

function writeFile(path, text) {
    try {
        fs.writeFileSync(path, text, 'utf8');
        return true;
    } catch (err) {
        console.error(`Could not write to file ${path}`);
        console.error(err);
    }
}

function unsignedHexString(number) {
    if (number < 0) {
        number = 0xFFFFFFFF + number + 1;
    }

    return number.toString(16).toUpperCase();
}

function bufferToArrayBuffer(buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function getEmptyBoardArray() {
    const board = new Uint32Array(WIDTH * HEIGHT);

    // Set illegal board out of bounds
    board.fill(OUT_OF_BOUNDS);

    // Set legal board empty
    var rankIndex, fileIndex, index;

    for (rankIndex = 0; rankIndex <= 7; rankIndex++) {
        for (fileIndex = 0; fileIndex <= 7; fileIndex++) {
            index = rankFileToIndex(rankIndex, fileIndex);
            board[index] = EMPTY;
        }
    }

    return board;
}

// min inclusive, max exclusive
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function getExponentForMemory(megabytes, bytesPerEntry=24) {
    const entries = megabytes * 1024 * 1024 / bytesPerEntry;
    return Math.floor(Math.log2(entries));
}

function reverseOrder(a, b) { return b - a; }

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
    getPstIndex,
    moveToString,
    moveToShortString,
    createMove,
    moveFrom,
    moveTo,
    movePromotion,
    moveCaptured,
    moveBits,
    moveOrder,
    moveAddOrder,
    quickSort,
    padIndices,
    colors,
    syncGET,
    syncGETBuffer,
    readFile,
    readFileBuffer,
    writeFile,
    unsignedHexString,
    bufferToArrayBuffer,
    getEmptyBoardArray,
    getRandomInt,
    getExponentForMemory,
    reverseOrder,
};