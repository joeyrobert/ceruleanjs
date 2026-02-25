'use strict';

const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');
const utils = require('./utils');

function stsParallel(timePerMove, numWorkers) {
    timePerMove = timePerMove || 1000;
    numWorkers = numWorkers || process.env.STS_WORKERS || Math.min(12, os.cpus().length);

    console.log('Running Strategic Test Suite (Parallel)\n');

    const startTime = performance.now();
    const maxDepth = 64;
    const limit = 10;
    var epds = [];

    for (var i = 1; i <= limit; i++) {
        var epd = utils.readFile(`suites/epd/STS${i}.epd`);

        if (epd) {
            epds.push(epd);
        } else {
            console.log(`STS file not found at ./suites/epd/STS${i}.epd`);
            return;
        }
    }

    var positions = [];
    for (i = 0; i < epds.length; i++) {
        var lines = epds[i].split('\n');
        var fens = lines.map(line => line.split('bm')[0].trim() + ' 0 1');
        var ids = lines.map(line => /id "(.*?)"/.exec(line)[1]);
        var points = lines.map(line => {
            var movesByPoints = /c0 "(.*?)"/.exec(line)[1].split(', ');
            var movePoints = {};
            movesByPoints.forEach(movesAndPoints => {
                var moves = movesAndPoints.split('=');
                movePoints[moves[0]] = parseInt(moves[1], 10);
            });
            return movePoints;
        });

        for (var j = 0; j < fens.length; j++) {
            positions.push({
                fen: fens[j],
                id: ids[j],
                points: points[j],
                index: positions.length
            });
        }
    }

    var chunkSize = Math.ceil(positions.length / numWorkers);
    var chunks = [];

    for (i = 0; i < numWorkers; i++) {
        var start = i * chunkSize;
        var end = Math.min(start + chunkSize, positions.length);
        if (start < positions.length) {
            chunks.push(positions.slice(start, end));
        }
    }

    var workerPath = path.join(__dirname, 'sts-worker.js');
    var workers = chunks.map(chunk => {
        return new Promise((resolve, reject) => {
            var worker = new Worker(workerPath, {
                workerData: {
                    positions: chunk,
                    timePerMove,
                    maxDepth,
                    hashSize: 18
                }
            });
            worker.on('message', (msg) => resolve(msg));
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error('Worker stopped with exit code ' + code));
                }
            });
        });
    });

    return Promise.all(workers).then((messages) => {
        var allResults = [];
        messages.forEach(msg => {
            allResults = allResults.concat(msg.results);
        });
        allResults.sort((a, b) => a.index - b.index);

        var pointTotal = allResults.reduce((sum, r) => sum + r.point, 0);
        const duration = performance.now() - startTime;

        console.log(`STS Total Points: ${pointTotal} / ${limit * 100 * 10}`);
        console.log(`Duration: ${(duration / 1000.0).toFixed(3)}s`);
        console.log(`Parallel: ${chunks.length} workers`);

        return pointTotal;
    });
}

if (typeof require !== 'undefined' && require.main === module) {
    var timePerMove = parseInt(process.argv[2] || 1000, 10);
    var numWorkers = parseInt(process.argv[3] || 0, 10) || undefined;
    stsParallel(timePerMove, numWorkers).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = stsParallel;
