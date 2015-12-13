'use strict';

const evaluate = require('./evaluate');
const search = require('./search');
const utils = require('./utils');

function iterativeDeepening(board, totalTime) {
    var startTime = new Date();
    var timeThreshold = totalTime / 4; // time threshold in ms
    var timeDiff, moveHistory, moveStrings, score;
    search.setTimes(startTime, totalTime);

    for (var depth = 1; ; depth++) {
        moveHistory = [];
        evaluate.resetEvalCount();
        score = search.search(board, -Infinity, +Infinity, depth, moveHistory);

        if (utils.isNumeric(score)) {
            moveStrings = [];
            for (var i = depth; i >= 1; i--) {
                moveStrings.push(board.moveToString(moveHistory[i]));
            }

            console.log(`${depth} ${score} ${Math.round(timeDiff / 10)} ${evaluate.getEvalCount()} ${moveStrings.join(' ')}`);
        }

        timeDiff = new Date() - startTime;
        if (timeDiff >= timeThreshold) {
            break;
        }
    }

    return moveHistory[depth];
}

module.exports = iterativeDeepening;