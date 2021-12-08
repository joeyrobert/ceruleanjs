'use strict';

const {
    DELTA_MAP,
    DELTA_KING,
    DELTA_KNIGHT,
    DELTA_PAWN,
    HEIGHT,
    OUT_OF_BOUNDS,
    WIDTH,
    ATTACK_NONE,
    ATTACK_DIAGONAL,
    ATTACK_HORIZONTAL,
    ATTACK_VERTICAL,
    ATTACK_KNIGHT,
    ATTACK_KING,
    ATTACK_PAWN,
} = require('./constants');
const {
    rankFileToIndex,
    getEmptyBoardArray
} = require('./utils');

// Attack lookup
// See "delta truth table" in board.ods
function generateAttackLookup() {
    const attackLookup = [ATTACK_NONE];
    const deltaLookup = [ATTACK_NONE];

    for (var i = 1; i <= 122; i++) {
        let attack = ATTACK_NONE;
        let delta = ATTACK_NONE;

        if (i % 14 === 0) {
            attack = attack | ATTACK_DIAGONAL;
            delta = 14;
        }

        if (i % 15 === 0) {
            attack = attack | ATTACK_VERTICAL;
            delta = 15;
        }

        if (i % 16 === 0) {
            attack = attack | ATTACK_DIAGONAL;
            delta = 16;
        }

        if (i < 8) {
            attack = attack | ATTACK_HORIZONTAL;
            delta = 1;
        }

        if (DELTA_KING.includes(i)) {
            attack = attack | ATTACK_KING;
        }

        if (DELTA_KNIGHT.includes(i)) {
            attack = attack | ATTACK_KNIGHT;
        }

        if (DELTA_PAWN.includes(i)) {
            attack = attack | ATTACK_PAWN;
        }

        attackLookup.push(attack);
        deltaLookup.push(delta)
    }

    return {
        ATTACK_LOOKUP: new Uint32Array(attackLookup),
        DELTA_LOOKUP: new Uint32Array(deltaLookup)
    };
}

function createNewLookup() {
    var lookup = Array(WIDTH * HEIGHT).fill();

    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            lookup[rankFileToIndex(i, j)] = Array(WIDTH * HEIGHT).fill(false);
        }
    }

    return lookup;
}

function generateRayLookup() {
    var toIndex, deltas;
    var rayLookups = [];
    var board = getEmptyBoardArray();

    for (var k = 0; k < 2; k++) {
        deltas = DELTA_MAP[k][0];
        var lookup = createNewLookup();

        for (var rankIndex = 0; rankIndex < 8; rankIndex++) {
            for (var fileIndex = 0; fileIndex < 8; fileIndex++) {
                var fromIndex = rankFileToIndex(rankIndex, fileIndex);

                for (var j = 0; j < 4; j++) {
                    toIndex = fromIndex + deltas[j];

                    while (board[toIndex] !== OUT_OF_BOUNDS) {
                        lookup[fromIndex][toIndex] = true;
                        toIndex += deltas[j];
                    }
                }
            }
        }

        rayLookups.push(lookup);
    }

    return rayLookups;
}

const {
    ATTACK_LOOKUP,
    DELTA_LOOKUP,
} = generateAttackLookup();

// const RAY_LOOKUP = generateRayLookup();

module.exports = {
    ATTACK_LOOKUP,
    DELTA_LOOKUP,
    // RAY_LOOKUP,
    generateRayLookup,
};