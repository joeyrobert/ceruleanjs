'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');
const Board = require('./board');

function perftParallel(epdPath, numWorkers, lastPerLineOnly) {
    epdPath = epdPath || 'suites/epd/perftsuite.epd';
    numWorkers = numWorkers || process.env.PERFT_WORKERS || os.cpus().length;
    lastPerLineOnly = lastPerLineOnly !== false;

    var epd;
    try {
        epd = fs.readFileSync(epdPath, 'utf8');
    } catch (err) {
        console.error('Perft file not found:', epdPath);
        process.exit(1);
    }

    var perftTests = epd.split('\n').map(line => line.split(';'));
    var board = new Board();
    var cases = [];
    var positionMeta = [];
    var taskIndex = 0;

    for (var i = 0; i < perftTests.length; i++) {
        var fen = perftTests[i][0].trim();
        var depthEntries = [];

        for (var j = 1; j < perftTests[i].length; j++) {
            var parts = perftTests[i][j].trim().split(' ');
            if (parts.length >= 2) {
                var depth = parseInt(parts[0].slice(1), 10);
                var expected = parseInt(parts[1], 10);
                depthEntries.push({ depth, expected });
            }
        }

        var toRun = lastPerLineOnly && depthEntries.length > 0
            ? [depthEntries[depthEntries.length - 1]]
            : depthEntries;

        for (var k = 0; k < toRun.length; k++) {
            var d = toRun[k];
            board.fen = fen;
            var moves = board.generateMoves();
            var positionIndex = positionMeta.length;
            positionMeta.push({
                fen: fen,
                depth: d.depth,
                expected: d.expected,
                totalMoves: moves.length,
                sum: 0,
                receivedCount: 0
            });
            for (var m = 0; m < moves.length; m++) {
                cases.push({
                    fen: fen,
                    depth: d.depth,
                    moveIndex: m,
                    positionIndex: positionIndex
                });
            }
        }
    }

    var caseIndex = 0;
    var totalNodes = 0;
    var resultsReceived = 0;
    var workersActive = numWorkers;
    var workerPath = path.join(__dirname, 'perft-worker.js');
    var startTime = performance.now();
    var totalTasks = cases.length;

    return new Promise((resolve, reject) => {
        var progressInterval = setInterval(function () {
            var elapsed = (performance.now() - startTime) / 1000;
            var pct = totalTasks ? Math.round(100 * resultsReceived / totalTasks) : 0;
            var nodesPerSec = elapsed > 0 ? Math.round(totalNodes / elapsed).toLocaleString() : '0';
            var remaining = resultsReceived > 0 && resultsReceived < totalTasks
                ? Math.round((totalTasks - resultsReceived) * elapsed / resultsReceived)
                : null;
            var msg = 'Progress: ' + resultsReceived + '/' + totalTasks + ' (' + pct + '%) | elapsed: ' + elapsed.toFixed(1) + 's | ' + nodesPerSec + ' nodes/s';
            if (remaining !== null) {
                msg += ' | remaining: ~' + remaining + 's';
            }
            console.log(msg);
        }, 2000);

        function sendNext(worker) {
            if (caseIndex < cases.length) {
                worker.postMessage({ type: 'work', case: cases[caseIndex++] });
            } else {
                worker.postMessage({ type: 'done' });
                workersActive--;
                if (workersActive === 0) {
                    finish();
                }
            }
        }

        function finish() {
            clearInterval(progressInterval);
            var failures = [];
            for (var p = 0; p < positionMeta.length; p++) {
                var meta = positionMeta[p];
                if (meta.sum !== meta.expected) {
                    failures.push({
                        fen: meta.fen,
                        depth: meta.depth,
                        expected: meta.expected,
                        actual: meta.sum,
                        description: "perft('" + meta.fen + "', " + meta.depth + ") === " + meta.expected
                    });
                }
            }
            var duration = performance.now() - startTime;

            if (failures.length > 0) {
                console.error('\nPerft failures:\n');
                failures.forEach(function (f) {
                    console.error('  FAIL: ' + f.description);
                    console.error('    expected ' + f.expected + ', got ' + f.actual);
                });
                console.error('\n' + failures.length + ' failed, ' + (positionMeta.length - failures.length) + ' passed');
                console.error('Duration: ' + (duration / 1000.0).toFixed(3) + 's');
                console.error('Nodes/sec: ' + Math.round(totalNodes / (duration / 1000)).toLocaleString());
                console.error('Parallel: ' + numWorkers + ' workers (task queue, split by root moves)');
                process.exit(1);
            }

            var nodesPerSec = Math.round(totalNodes / (duration / 1000));
            console.log('Perft: ' + positionMeta.length + ' cases passed');
            console.log('Duration: ' + (duration / 1000.0).toFixed(3) + 's');
            console.log('Nodes/sec: ' + nodesPerSec.toLocaleString());
            console.log('Parallel: ' + numWorkers + ' workers (task queue, split by root moves)');
            resolve(positionMeta.length);
        }

        function onResult(result) {
            var meta = positionMeta[result.positionIndex];
            meta.sum += result.count;
            meta.receivedCount++;
            totalNodes += result.nodeCount || 0;
            resultsReceived++;
        }

        for (var w = 0; w < numWorkers; w++) {
            var worker = new Worker(workerPath);
            (function (wkr) {
                wkr.on('message', function (msg) {
                    if (msg.type === 'ready') {
                        sendNext(wkr);
                    } else if (msg.type === 'result') {
                        onResult(msg.result);
                        sendNext(wkr);
                    }
                });
                wkr.on('error', reject);
                wkr.on('exit', function (code) {
                    if (code !== 0 && workersActive > 0) {
                        reject(new Error('Worker stopped with exit code ' + code));
                    }
                });
            })(worker);
        }
    });
}

if (typeof require !== 'undefined' && require.main === module) {
    var epdPath = process.argv[2] || 'suites/epd/perftsuite.epd';
    var numWorkers = parseInt(process.argv[3] || 0, 10) || undefined;
    var allDepths = process.argv.includes('--all');
    perftParallel(epdPath, numWorkers, !allDepths).catch(function (err) {
        console.error(err);
        process.exit(1);
    });
}

module.exports = perftParallel;
