'use strict';

const readline = require('readline');
const constants = require('./constants');
const Board = require('./board');
const Opening = require('./opening');
const Perft = require('./perft');
const Search = require('./search');
const sts = require('./sts');
const utils = require('./utils');
const pkg = require('../package.json');

module.exports = class Xboard {
    constructor() {
        this._board = new Board();
        this._opening = new Opening();
        this._perft = new Perft();
        this._search = new Search();

        // 40/4
        this._movesPerTimeControl = 40;
        this._base = 4 * 60 * 1000; // to ms
        this._increment = 0;
        this._engineTime = this._base;
        this._opponentTime = this._base;
        this._updateTimePerMove();
        this._gameOver = false;
        this._maxDepth = 64;
        this._xboardSet = false;
        this._moveHistory = [];
        this._useBook = true;
        this._features = {
            myname: `CeruleanJS ${pkg.version} by Joey Robert`,
            setboard: 1,
            memory: 1,
            time: 1,
            usermove: 1
        };

        this.memory('100'); // use 100mb for tables by default

        if (process.browser) {
            onmessage = evt => this.sendLine(evt.data);

            console.log = function () {
                var args = Array.prototype.slice.call(arguments);
                postMessage(args.join(' '));
            };
        } else {
            var rl = readline.createInterface({
                input: process.stdin
            });

            rl.on('line', line => this.sendLine(line));
        }
    }

    sendLine(line) {
        var parts = line.split(' ');
        var action = parts[0];

        if (constants.MOVE_REGEX.test(action)) {
            this.usermove(action);
        } else if (this[action]) {
            this[action].call(this, parts.slice(1).join(' '));
        } else if (action === '?') {
            console.log('');
        } else {
            console.log('Error (invalid command):', line);
        }
    }

    result(hideDisplay) {
        var perftScore = this._perft.perft(this._board, 1);
        var result = false;
        var comment = '';

        if (perftScore === 0) {
            if (this._board.isInCheck()) {
                if (this._board.turn === constants.WHITE) {
                    result = '0-1';
                    comment = 'Black mates';
                } else {
                    result = '1-0';
                    comment = 'White mates';
                }

            } else {
                result = '1/2-1/2';
                comment = 'Stalemate';
            }
        }

        // Disabling draws for now, these should become `offer draw` statements
        // if (this._board.halfMoveClock >= 100) {
        //     result = '1/2-1/2';
        //     comment = 'Draw by 50 move rule';
        // } else if (this._board.maxRepetitions() >= 3) {
        //     result = '1/2-1/2';
        //     comment = 'Draw by repetition';
        // }

        if (result) {
            this._gameOver = true;
        }

        if (result && !hideDisplay) {
            console.log(`${result} {${comment}}`);
        }

        return result;
    }

    book(status) {
        var cleanedUpStatus = status.trim().toLowerCase();

        if (!this._opening.bookLoaded) {
            console.log('Book not loaded, remains off');
            this._useBook = false;
            return false;
        }

        if (cleanedUpStatus === 'on') {
            console.log('Book set to on');
            this._useBook = true;
        } else if (cleanedUpStatus === 'off') {
            console.log('Book set to off');
            this._useBook = false;
        } else {
            console.log('Book command not understood, remains', this._useBook ? 'on' : 'off');
            console.log('Usage: book [on|off] Toggles whether engine uses opening book');
        }

        return this._useBook;
    }

    display() {
        // Build string buffer
        var display = '\n';

        for (var rankIndex = 7; rankIndex >= 0; rankIndex--) {
            display += ` ${rankIndex + 1} `;

            for (var fileIndex = 0; fileIndex <= 7; fileIndex++) {
                var index = utils.rankFileToIndex(rankIndex, fileIndex);
                var turn = this._board.board[index] % 2;
                var square = index % 2 === 0;
                var value = ` ${constants.PIECE_DISPLAY_MAP[this._board.board[index] - turn]} `;
                value = utils.colors(square, turn, value);
                display += value;
            }
            display += '\n';
        }

        display += '   ';

        for (fileIndex = 0; fileIndex <= 7; fileIndex++) {
            display += ` ${String.fromCharCode(96 + fileIndex + 1)} `;
        }

        display += '\n';
        display += `\nFEN:  ${this._board.fen}`;
        display += `\nHash: ${this._board.hashString}`;

        console.log(display);
    }

    divide(depth) {
        if (!depth || !utils.isNumeric(depth)) {
            console.log('Error (divide depth not provided): divide', depth);
            return;
        }

        var startTime = new Date();
        var division = this._perft.divide(this._board, parseInt(depth, 10), true);
        var total = division.reduce((memo, entry) => memo + entry[1], 0);
        var timeDiff = new Date() - startTime;

        console.log(`\ntotal ${total}\ntime ${timeDiff} ms\nfreq ${Math.floor(total / timeDiff * 1000)} Hz`);
    }

    evaluate() {
        this._search.evaluate.evaluate(this._board, true);
        // console.log(this._search.evaluate);
    }

    perft(depth) {
        if (!depth || !utils.isNumeric(depth)) {
            console.log('Error (perft depth not provided): perft', depth);
            return;
        }

        var startTime = new Date();
        var total = this._perft.perft(this._board, parseInt(depth, 10));
        var timeDiff = new Date() - startTime;

        console.log(`${total}\ntime ${timeDiff} ms\nfreq ${Math.floor(total / timeDiff * 1000)} Hz`);
    }

    perfthash(exponent) {
        exponent = parseInt(exponent, 10) || 0;
        this._perft.hashSize = exponent;
        console.log(exponent ? `Perft hash size set to 2^${exponent} = ${(1 << exponent)}` : 'Perft hash table removed');
    }

    moves() {
        console.log(this._board.generateLegalMoves().map(move => utils.moveToShortString(this._board, move)).join('\n'));
    }

    usermove(moveString) {
        if (this._gameOver) {
            return;
        }

        var legalMove = this._board.addMoveString(moveString);

        if (legalMove) {
            this._moveHistory.push(legalMove);
            var result = this.result();

            if (result) {
                console.log(result);
            } else if (!this._forceSet) {
                this.go();
            }
        } else {
            console.log('Illegal move:', moveString);
        }
    }

    force() {
        this._forceSet = true;
    }

    go() {
        if (this._gameOver) {
            return;
        }

        this._forceSet = false;
        var moveString, move, polyglotMove;

        if (this._useBook) {
            polyglotMove = this._opening.lookupRandom(this._board);
        }

        if (polyglotMove) {
            moveString = this._board.polyglotMoveToMoveString(polyglotMove);
            move = this._board.addMoveString(moveString);
        } else {
            this._updateTimePerMove();
            move = this._search.iterativeDeepening(this._board, this._timePerMove, this._maxDepth);
            this._board.addMove(move);
            moveString = utils.moveToString(move);
        }

        this._moveHistory.push(move);

        console.log(`move ${moveString}`);
        this.result();
    }

    undo() {
        this._gameOver = false;

        var move = this._moveHistory.pop();
        if (move) {
            this._board.subtractMove(move);
            this._board.subtractHistory();
        }
    }

    remove() {
        this.undo();
        this.undo();
    }

    new() {
        this._forceSet = false;
        this._maxDepth = 64;
        this._gameOver = false;
        this._board = new Board();
    }

    setboard(fen) {
        this._board.fen = fen;
    }

    white() {
        this._board.turn = constants.WHITE;
    }

    black() {
        this._board.turn = constants.BLACK;
    }

    time(time) {
        this._engineTime = parseInt(time, 10) * 10; // cs => ms
        this._updateTimePerMove();
    }

    otim(otim) {
        this._opponentTime = parseInt(otim, 10) * 10; // cs => ms
    }

    level(line) {
        if (!constants.LEVEL_REGEX.test(line)) {
            console.log('Error (Invalid level): level', line);
            return;
        }

        var args = line.split(' ');
        var baseTimes = args[1].split(':');

        this._movesPerTimeControl = parseInt(args[0]);
        this._base = (parseInt(baseTimes[0], 10) * 60 + (parseInt(baseTimes[1], 10) || 0)) * 1000; // to ms
        this._increment = (parseInt(args[2], 10) || 0) * 1000;
        this._engineTime = this._base;
        this._opponentTime = this._base;
        this._updateTimePerMove();
    }

    _updateTimePerMove() {
        const ideal = this._base / (this._movesPerTimeControl || 50) + this._increment;
        const remaining = this._engineTime / 3; // only use up to 33% of time remaining
        this._timePerMove = Math.min(remaining, ideal);
    }

    st(timePerMove) {
        this._timePerMove = timePerMove * 1000; // ms
    }

    sd(depth) {
        this._maxDepth = depth;
    }

    xboard() {
        console.log('');
        this._xboardSet = true;
    }

    protover() {
        console.log(Object.keys(this._features).map(name => {
            return typeof this._features[name] === 'string' ?
                `feature ${name}="${this._features[name]}"` :
                `feature ${name}=${this._features[name]}`;
        }).join('\n'));
    }

    sts() {
        sts();
    }

    version() {
        console.log(this._features.myname);
    }

    quit() {
        this.exit();
    }

    exit() {
        console.log('Goodbye.');
        process.exit(0);
    }

    memory(mb) {
        const mbInt = parseInt(mb, 10) || 0;
        const bInt = mbInt * 1024 * 1024;
        const bytesPerEntry = 4;

        // Search table (50%)
        const searchEntriesPerHash = 4; // lohash, hihash, move, depth+type+score
        const searchBInt = bInt * 0.5;
        const searchExponent = Math.floor(Math.log2(searchBInt / (searchEntriesPerHash * bytesPerEntry)));
        // const searchEntries = Math.pow(2, searchExponent);
        // const searchSize = searchEntries * searchEntriesPerHash * bytesPerEntry;

        // Eval table (25%)
        const evalEntriesPerHash = 3;
        const evalBEvalInt = bInt * 0.25;
        const evalExponent = Math.floor(Math.log2(evalBEvalInt / (evalEntriesPerHash * bytesPerEntry)));
        // const evalEntries = Math.pow(2, evalExponent);
        // const evalSize = evalEntries * evalEntriesPerHash * bytesPerEntry;

        // Pawn table (25%)
        const pawnEntriesPerHash = 3;
        const pawnBEvalInt = bInt * 0.25;
        const pawnExponent = Math.floor(Math.log2(pawnBEvalInt / (pawnEntriesPerHash * bytesPerEntry)));
        // const pawnEntries = Math.pow(2, pawnExponent);
        // const pawnSize = evalEntries * evalEntriesPerHash * bytesPerEntry;

        this._search.hashSize = searchExponent;
        this._search.evaluate.hashSize = evalExponent;
        this._search.evaluate.pawnHashSize = pawnExponent;
    }

    cachestat() {
        const { searchTable } = this._search;
        const { evalTable, pawnTable } = this._search.evaluate;
        console.log(`SEARCH: Entries: ${searchTable.size} Size: ${searchTable.bytes} bytes Hits: ${searchTable.cacheHit} Misses: ${searchTable.cacheMiss} Hit rate: ${(searchTable.cacheHit * 100.0 / (searchTable.cacheHit + searchTable.cacheMiss)).toFixed(2)}%`);
        console.log(`EVAL:   Entries: ${evalTable.size} Size: ${evalTable.bytes} bytes Hits: ${evalTable.cacheHit} Misses: ${evalTable.cacheMiss} Hit rate: ${(evalTable.cacheHit * 100.0 / (evalTable.cacheHit + evalTable.cacheMiss)).toFixed(2)}%`);
        console.log(`PAWN:   Entries: ${pawnTable.size} Size: ${pawnTable.bytes} bytes Hits: ${pawnTable.cacheHit} Misses: ${pawnTable.cacheMiss} Hit rate: ${(pawnTable.cacheHit * 100.0 / (pawnTable.cacheHit + pawnTable.cacheMiss)).toFixed(2)}%`);
    }

    ping(n) {
        console.log(`pong ${n}`);
    }

    option(arg) {
        const [name, value] = arg.split('=');

        if (this._search.evaluate[name] !== undefined) {
            this._search.evaluate[name] = parseInt(value, 10);
        }
    }

    // Noop commands
    nps() {

    }

    random() {

    }

    post() {

    }

    hard() {

    }

    easy() {

    }

    accepted() {

    }

    help() {
        var helpMenu = `
CeruleanJS ${pkg.version}, Javascript Chess Engine by Joey Robert
More info at https://ceruleanjs.joeyrobert.org/

Command                     Description

display                     Draws the board
perft [INT]                 Perfts the current board to specified depth
perfthash [INT]             Sets perft hashtable exponent (size 2^exponent)
memory [INT]                Sets the memory used by the engine in megabytes
divide [INT]                Divides the current board to specified depth
moves                       Lists valid moves for this position
e2e4                        Moves from the current position and thinks
go                          Forces the engine to think
undo                        Subtracts the previous move
new                         Sets up the default board position
setboard [FEN]              Sets the board using Forsyth-Edwards Notation
evaluate                    Performs a static evaluation of the board
result                      Displays game result (checkmate or stalemate)
book [on|off]               Toggles whether engine uses opening book
white                       Sets the active colour to WHITE
black                       Sets the active colour to BLACK
time [INT]                  Sets engine's time (in centiseconds)
otim [INT]                  Sets opponent's time (in centiseconds)
sd [INT]                    Sets maximum depth
st [INT]                    Sets maximum time
level [MPT] [BASE] [INC]    Sets Winboard level timing
sts                         Run Strategic Test Suite (1s per move)
version                     Outputs the version number
exit                        Exits the menu
quit                        See exit
help                        Gets you this magical menu
        `;
        console.log(helpMenu);
    }
};