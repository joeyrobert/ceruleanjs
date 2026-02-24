'use strict';

const { parentPort, workerData } = require('worker_threads');
const Board = require('./board');
const Search = require('./search');
const utils = require('./utils');

const { positions, timePerMove, maxDepth } = workerData;

const board = new Board();
const search = new Search();

const results = [];

for (var i = 0; i < positions.length; i++) {
    var pos = positions[i];
    board.fen = pos.fen;
    var move = search.iterativeDeepening(board, timePerMove, maxDepth, true);
    var moveString = utils.moveToShortString(board, move);
    var point = pos.points[moveString] || 0;
    results.push({ id: pos.id, moveString, point, index: pos.index });
}

parentPort.postMessage({ results });
