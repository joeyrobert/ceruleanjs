'use strict';

const readline = require('readline');
const constants = require('./constants');
const Board = require('./board');
const evaluate = require('./evaluate');
const Opening = require('./opening');
const Perft = require('./perft');
const Search = require('./search');
const utils = require('./utils');

class Xboard {
    constructor() {
        this._board = new Board();
        this._opening = new Opening();
        this._perft = new Perft();
        this._search = new Search();
        this._engineTime = 0;
        this._opponentTime = 0;

        // 40/4
        this._movesPerTimeControl = 40;
        this._base = 4 * 60 * 1000; // to ms
        this._increment = 0;
        this._updateTimePerMove();
        this._gameOver = false;
        this._maxDepth = 64;
        this._xboardSet = false;
        this._moveHistory = [];
        this._useBook = true;
        this._features = {
            myname: `"CeruleanJS 0.0.1 by Joey Robert"`,
            setboard: 1,
            memory: 0,
            time: 1,
            usermove: 1
        };

        if (process.browser) {
            onmessage = evt => this._sendLine(evt.data);

            console.log = function () {
                var args = Array.prototype.slice.call(arguments);
                postMessage(args.join(' '));
            };
        } else {
            var rl = readline.createInterface({
                input: process.stdin
            });

            rl.on('line', line => this._sendLine(line));
        }
    }

    _sendLine(line) {
        var parts = line.split(' ');
        var action = parts[0];

        if (constants.MOVE_REGEX.test(action)) {
            this.usermove(action);
        } else if (this[action]) {
            this[action].call(this, parts.slice(1).join(' '));
        } else {
            console.log('Error (invalid command):', line);
        }
    }

    result(hideDisplay) {
        var perftScore = this._perft.perft(this._board, 1);
        var result = false;

        if (perftScore === 0) {
            if (this._board.isInCheck()) {
                result = this._board.turn ? '1-0' : '0-1';
            } else {
                result = '1/2-1/2';
            }
        }

        if (result && !hideDisplay) {
            this._gameOver = true;
            console.log(result);
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
        console.log(cleanedUpStatus)

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

        for (var fileIndex = 0; fileIndex <= 7; fileIndex++) {
            display += ` ${String.fromCharCode(96 + fileIndex + 1)} `;
        }

        display += '\n';
        display += `\nFEN:  ${this._board.fen}`;
        display += `\nHash: ${this._board.loHash.toString(16)} ${this._board.hiHash.toString(16)}`;

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
        evaluate.evaluate(this._board, true);
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
        console.log(this._board.generateLegalMoves().map(move => utils.moveToString(move)).join('\n'));
    }

    xboard() {
        console.log('');
        this._xboardSet = true;
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
        var moveString, move;

        if (this._useBook) {
            moveString = this._opening.lookupRandom(this._board.loHash, this._board.hiHash);
        }

        if (moveString) {
            move = this._board.addMoveString(moveString);
        } else {
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
        this._engineTime = time;
    }

    otim(otim) {
        this._opponentTime = otim;
    }

    level(line) {
        if (!constants.LEVEL_REGEX.test(line)) {
            console.log('Error (Invalid level): level', line);
            return;
        }

        var args = line.split(' ');
        var baseTimes = args[1].split(':');

        this._movesPerTimeControl = parseInt(args[0]) || 60; // Assume 60 moves
        this._base = (parseInt(baseTimes[0], 10) * 60 + (parseInt(baseTimes[1], 10) || 0)) * 1000; // to ms
        this._increment = (parseInt(args[2], 10) || 0) * 1000;
        this._updateTimePerMove();
    }

    _updateTimePerMove() {
        var totalTime = this._base + this._movesPerTimeControl * this._increment;
        this._timePerMove =  totalTime / this._movesPerTimeControl;
    }

    nps(nodeRate) {

    }

    st(timePerMove) {
        this._timePerMove = timePerMove * 1000; // ms
    }

    sd(depth) {
        this._maxDepth = depth;
    }

    random() {

    }

    post() {

    }

    hard() {

    }

    easy() {

    }

    protover(number) {
        console.log(Object.keys(this._features).map(name => {
            return `feature ${name}=${this._features[name]}`;
        }).join('\n'));
    }

    accepted() {

    }

    quit() {
        this.exit();
    }

    exit() {
        console.log('Goodbye.');
        process.exit(0);
    }

    help() {
        var helpMenu = `
Commands

display                     Draws the board
perft [INT]                 Perfts the current board to specified depth
perfthash [INT]             Sets perft hashtable exponent (size 2^exponent)
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
exit                        Exits the menu
quit                        See exit
help                        Gets you this magical menu
        `;
        console.log(helpMenu);
    }
}

module.exports = new Xboard();