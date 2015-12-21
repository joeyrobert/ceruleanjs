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
        timeDiff = new Date() - startTime;

        if (utils.isNumeric(score)) {
            moveStrings = [];
            for (var i = depth; i >= 1; i--) {
                moveStrings.push(utils.moveToString(moveHistory[i]));
            }

            console.log(`${depth} ${score} ${Math.round(timeDiff / 10)} ${evaluate.getEvalCount()} ${moveStrings.join(' ')}`);
        }

        if (timeDiff >= timeThreshold) {
            break;
        }
    }

    return moveHistory[depth];
}

module.exports = iterativeDeepening;