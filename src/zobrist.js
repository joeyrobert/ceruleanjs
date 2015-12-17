'use strict';

const MersenneTwister = require('mersennetwister');
const constants = require('./constants');

var rankFileToIndex = (rankIndex, fileIndex) => rankIndex * 15 + fileIndex + 17;

var generateZobristKeys = () => {
    var mt = new MersenneTwister(3141592654);
    var randomZobrist = () => mt.int31();
    var SQUARES = [];
    var EN_PASSANT = [];
    var CASTLING = []
    var TURN = [randomZobrist(), randomZobrist()];
    var pieceKeys = ['p', 'n', 'b', 'r', 'q', 'k'];
    var rankIndex, fileIndex, index, turn, pieceIndex, pieceValue, castling;

    for (rankIndex = 1; rankIndex <= 8; rankIndex++) {
        for (fileIndex = 1; fileIndex <= 8; fileIndex++) {
            index = rankFileToIndex(fileIndex, rankIndex);

            for (turn = 0; turn < 2; turn++) {
                for (pieceIndex = 0; pieceIndex < pieceKeys.length; pieceIndex++) {
                    pieceValue = constants.PIECE_MAP[pieceKeys[pieceIndex]];

                    if (!SQUARES[index]) {
                        SQUARES[index] = [];
                    }

                    SQUARES[index][pieceValue | turn] = [randomZobrist(), randomZobrist()];
                }
            }

            EN_PASSANT[index] = [randomZobrist(), randomZobrist()];
        }
    }

    for (castling = 0; castling < 4; castling++) {
        CASTLING.push([randomZobrist(), randomZobrist()]);
    }

    return {
        SQUARES,
        EN_PASSANT,
        CASTLING,
        TURN
    };
};

module.exports = generateZobristKeys();