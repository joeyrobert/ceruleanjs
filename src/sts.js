'use strict';

const fs = require('fs');
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
    var limit = 15;
    var count = 0;

    for (var i = 1; i <= 15; i++) {
        try {
            var epd = fs.readFileSync(`suites/epd/STS${i}.epd`, 'utf8');
        } catch (err) {
            console.log(`STS file not found at ./suites/epd/STS${i}.epd`);
            return;
        }
        var lines = epd.split('\n');
        var fens = lines.map(line => line.split(';')[0].trim());
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
            console.log(`${count}/${limit * 100}: ${fen}`);
            console.log('move', moveString, 'points added', point, 'total points', pointTotal, points[index], '\n');
        });
    }

    return pointTotal;
}

module.exports = sts;