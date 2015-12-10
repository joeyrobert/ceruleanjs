'use strict';

const MersenneTwister = require('mersennetwister');

let rankFileToIndex = (rankIndex, fileIndex) => rankIndex * 15 + fileIndex + 17;

let generateZobristKeys = () => {
    let mt = new MersenneTwister(3141592654);
    let fortyEightBitFloat = number => Math.floor(mt.rndHiRes() * Math.pow(2, 48));
    let zobristSquares = [];
    let zobristEnPassant = [];
    let zobristCastling = []
    let zobristTurn = fortyEightBitFloat();

    for (let rankIndex = 1; rankIndex <= 8; rankIndex++) {
        for (let fileIndex = 1; fileIndex <= 8; fileIndex++) {
            let index = rankFileToIndex(fileIndex, rankIndex);

            for (let turn = 0; turn < 2; turn++) {
                for (let pieceIndex = 0; pieceIndex < 6; pieceIndex++) {
                    if (!zobristSquares[turn]) {
                        zobristSquares[turn] = [];
                    }

                    if (!zobristSquares[turn][index]) {
                        zobristSquares[turn][index] = [];
                    }

                    zobristSquares[turn][index][pieceIndex] = fortyEightBitFloat();
                }
            }

            zobristEnPassant[index] = fortyEightBitFloat();
        }
    }

    for (let castling = 0; castling < 4; castling++) {
        zobristCastling.push(fortyEightBitFloat());
    }

    return {
        zobristSquares,
        zobristEnPassant,
        zobristCastling,
        zobristTurn
    };
};

module.exports = generateZobristKeys();