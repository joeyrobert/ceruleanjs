'use strict';

const { parentPort } = require('worker_threads');
const Board = require('./board');
const Perft = require('./perft');

const board = new Board();
const perft = new Perft();

parentPort.on('message', (msg) => {
    if (msg.type === 'work') {
        var c = msg.case;
        board.fen = c.fen;
        var moves = board.generateMoves();
        var count = 0;
        var nodeCount = 0;
        if (c.moveIndex < moves.length) {
            perft.nodeCounter = { count: 0 };
            board.addHistory();
            if (board.addMove(moves[c.moveIndex])) {
                count = perft.perft(board, c.depth - 1);
                nodeCount = perft.nodeCounter.count;
                board.subtractMove(moves[c.moveIndex]);
            }
            board.subtractHistory();
        }
        parentPort.postMessage({
            type: 'result',
            result: {
                positionIndex: c.positionIndex,
                moveIndex: c.moveIndex,
                count: count,
                nodeCount: nodeCount
            }
        });
    } else if (msg.type === 'done') {
        process.exit(0);
    }
});

parentPort.postMessage({ type: 'ready' });
