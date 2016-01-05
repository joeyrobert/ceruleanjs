'use strict';

const Board = require('./board');
const Search = require('./search');
const utils = require('./utils');

function sts() {
    console.log('Running Strategic Test Suite\n');
    var board = new Board();
    var search = new Search();
    var timePerMove = 1 * 1000;
    var pointTotal = 0;
    var maxDepth = 64;
    var limit = 10;
    var count = 0;
    var epds = [];

    // Load them ahead of time
    for (var i = 1; i <= limit; i++) {
        var epd = utils.readFile(`suites/epd/STS${i}.epd`);

        if (epd) {
            epds.push(epd);
        } else {
            console.log(`STS file not found at ./suites/epd/STS${i}.epd`);
            return;
        }
    }

    // Run em
    for (var i = 0; i < epds.length; i++) {
        var lines = epds[i].split('\n');
        var fens = lines.map(line => line.split('bm')[0].trim() + ' 0 1');
        var ids = lines.map(line => /id "(.*?)"/.exec(line)[1]);
        var points = lines.map(line => {
            var movesByPoints = /c0 \"(.*?)\"/.exec(line)[1].split(', ');
            var movePoints = {};
            movesByPoints.forEach(movesAndPoints => {
                var moves = movesAndPoints.split('=');
                movePoints[moves[0]] = parseInt(moves[1], 10);
            });
            return movePoints;
        });

        fens.forEach((fen, index) => {
            board.fen = fen;
            var move = search.iterativeDeepening(board, timePerMove, maxDepth, true);
            var moveString = utils.moveToShortString(board, move);
            var point = points[index][moveString] || 0;
            pointTotal += point;
            count++;
            console.log(ids[index]);
            console.log(`${count}/${limit * 100}: ${fen}`);
            console.log('Move:', moveString, 'Points Added:', point, 'Total Points:', pointTotal, points[index], '\n');
        });
    }

    console.log(`STS Total Points: ${pointTotal} / ${limit * 100 * 10}`);

    return pointTotal;
}

module.exports = sts;