'use strict';

const fs = require('fs');
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

function moveToString(move) {
    return indexToAlgebraic(moveFrom(move)) + indexToAlgebraic(moveTo(move)) +
        (movePromotion(move) ? constants.INVERSE_PIECE_MAP[movePromotion(move)] : '');
}

// Inspired by chess.js implementation
function moveToShortString(board, move) {
    // Needs to have unique IDENTIFIER + TO
    // If not unique, add FILE
    // If still not unique, remove FILE add RANK
    var from = moveFrom(move);
    var to = moveTo(move);
    var bits = moveBits(move);
    var captured = moveCaptured(move);
    var capturedString = captured !== constants.EMPTY ? 'x' : '';
    var piece = board.board[from] & constants.JUST_PIECE;
    var pieceString = piece === constants.PAWN ? '' : constants.INVERSE_PIECE_MAP[piece].toUpperCase();
    var fromString = '';
    var checkString = '';
    var promotion = movePromotion(move);
    var promotionString = promotion ? '=' + constants.INVERSE_PIECE_MAP[promotion].toUpperCase() : '';
    var moves = board.generateLegalMoves();
    var toAlgebraic = indexToAlgebraic(to);
    var fromAlgebraic = indexToAlgebraic(from);
    var rank = indexToRank(from);
    var file = indexToFile(from);
    var possibleMove, possibleFrom, possibleTo, possiblePiece, possibleRank, possibleFile;
    var ambiguous = false;
    // Rank is always ambiguous on pawn captures
    var ambiguousRank = captured !== constants.EMPTY && piece === constants.PAWN;
    var ambiguousFile = false;

    // Test ambiguity against all possible moves
    for (var i = 0; i < moves.length; i++) {
        possibleMove = moves[i];
        possibleFrom = moveFrom(possibleMove);
        possibleTo = moveTo(possibleMove);
        possiblePiece = board.board[possibleFrom] & constants.JUST_PIECE;
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
    var move = (from - constants.MOVE_INDEX_OFFSET) +
               ((to - constants.MOVE_INDEX_OFFSET) << constants.MOVE_TO_SHIFT) +
               (bits >> 1 << 1);

    if (promotion) {
        move += (promotion >> 1) << constants.MOVE_PROMOTION_SHIFT;
    }

    if (captured === undefined) {
        captured = constants.EMPTY;
    }

    move += (captured >> 1) << constants.MOVE_CAPTURED_SHIFT;

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
    return ((move & constants.MOVE_PROMOTION_MASK) >> constants.MOVE_PROMOTION_SHIFT) << 1;
}

function moveCaptured(move) {
    return ((move & constants.MOVE_CAPTURED_MASK) >> constants.MOVE_CAPTURED_SHIFT) << 1;
}

function moveBits(move) {
    return move & constants.MOVE_BITS_MASK;
}

function moveOrder(move) {
    return (move & constants.MOVE_ORDER_MASK) >> constants.MOVE_ORDER_SHIFT;
}

function moveAddOrder(move, order) {
    return (move & (~constants.MOVE_ORDER_MASK)) + (order << constants.MOVE_ORDER_SHIFT);
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

function colors(squareEven, turn, text) {
    var squareColor = squareEven ? 'bgGreen' : 'bgYellow';
    var turnColor = turn === constants.WHITE ? 'white' : 'black';

    return [
        constants.ANSI_COLORS[squareColor],
        constants.ANSI_COLORS[turnColor],
        text,
        constants.ANSI_COLORS.reset
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
    request.responseType = 'arraybuffer';
    request.open('GET', path, false);
    request.send(null);

    if (request.status === 200) {
        return request.response;
    }
}

function readFile(path) {
    try {
        return fs.readFileSync(path, 'utf8');
    } catch (err) {
    }
}

function readFileBuffer(path) {
    try {
        return fs.readFileSync(path);
    } catch (err) {
    }
}

function writeFile(path, text) {
    try {
        fs.writeFileSync(path, text, 'utf8');
        return true;
    } catch (err) {
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
    bufferToArrayBuffer
};