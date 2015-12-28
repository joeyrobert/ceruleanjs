'use strict';

const colors = require('colors');
const stdio = require('stdio');
const constants = require('./constants');
const Board = require('./board');
const evaluate = require('./evaluate');
const Opening = require('./opening');
const Perft = require('./perft');
const Search = require('./search');
const utils = require('./utils');
const packageInfo = require('../package.json');

class Xboard {
    constructor() {
        this.board = new Board();
        this.opening = new Opening();
        this.perft = new Perft();
        this.search = new Search();
        this.engineTime = 60*100;
        this.opponentTime = 60*100;
        this.xboardSet = false;
        this.moveHistory = [];
        this.features = {
            myname: `"CeruleanJS ${packageInfo.version} by ${packageInfo.author}"`,
            setboard: 1,
            memory: 0,
            time: 1,
            usermove: 1
        };

        if (process.browser) {
            onmessage = evt => this.sendLine(evt.data);

            console.log = function () {
                var args = Array.prototype.slice.call(arguments);
                postMessage(args.join(' '));
            };
        } else {
            stdio.readByLines(line => this.sendLine(line));
        }
    }

    sendLine(line) {
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
        var perftScore = this.perft.perft(this.board, 1);
        var result = false;

        if (perftScore === 0) {
            if (this.board.isInCheck(this.board.turn)) {
                result = this.board.turn ? '1-0' : '0-1';
            } else {
                result = '1/2-1/2';
            }
        }

        if (result && !hideDisplay) {
            console.log(`result ${result}`);
        }

        return result;
    }

    display() {
        // Enable colors
        colors.enabled = true;

        // Build string buffer
        var display = '\n';

        for (var rankIndex = 8; rankIndex >= 1; rankIndex--) {
            display += ` ${colors.bold(rankIndex)} `;

            for (var fileIndex = 1; fileIndex <= 8; fileIndex++) {
                var index = utils.rankFileToIndex(rankIndex, fileIndex);
                var turn = this.board.board[index] % 2;
                var square = index % 2 === 0;
                var value = ` ${constants.PIECE_DISPLAY_MAP[this.board.board[index] - turn]} `;
                value = colors[square ? 'bgGreen' : 'bgYellow'](value);
                value = colors[turn === constants.WHITE ? 'white' : 'black'](value);
                display += value;
            }
            display += '\n';
        }

        display += '   ';

        for (var fileIndex = 1; fileIndex <= 8; fileIndex++) {
            display += ` ${colors.bold(String.fromCharCode(96 + fileIndex))} `;
        }

        display += '\n';
        display += `\nFEN:  ${this.board.fen}`;
        display += `\nHash: ${this.board.loHash.toString(16)} ${this.board.hiHash.toString(16)}`;

        console.log(display);
    }

    divide(depth) {
        if (!depth || !utils.isNumeric(depth)) {
            console.log('Error (divide depth not provided): divide', depth);
            return;
        }

        var startTime = new Date();
        var division = this.perft.divide(this.board, parseInt(depth, 10));
        var total = division.reduce((memo, entry) => memo + entry[1], 0);
        var timeDiff = new Date() - startTime;

        console.log(division.map(entry => `${entry[0]} ${entry[1]}`).join('\n'));
        console.log(`\ntotal ${total}\ntime ${timeDiff} ms\nfreq ${Math.floor(total / timeDiff * 1000)} Hz`);
    }

    evaluate() {
        console.log(evaluate.evaluate(this.board));
    }

    perft(depth) {
        if (!depth || !utils.isNumeric(depth)) {
            console.log('Error (perft depth not provided): perft', depth);
            return;
        }

        var startTime = new Date();
        var total = this.perft.perft(this.board, parseInt(depth, 10));
        var timeDiff = new Date() - startTime;

        console.log(`${total}\ntime ${timeDiff} ms\nfreq ${Math.floor(total / timeDiff * 1000)} Hz`);
    }

    perfthash(exponent) {
        exponent = parseInt(exponent, 10) || 0;
        this.perft.hashSize = exponent;
        console.log(exponent ? `Perft hash size set to 2^${exponent} = ${(1 << exponent)}` : 'Perft hash table removed');
    }

    moves() {
        console.log(this.board.generateLegalMoves().map(move => utils.moveToString(this.board, move)).join('\n'));
    }

    xboard() {
        console.log('');
        this.xboardSet = true;
    }

    usermove(moveString) {
        var legalMove = this.board.addMoveString(moveString);

        if (legalMove) {
            this.moveHistory.push(legalMove);
            var result = this.result();

            if (result) {
                console.log(result);
            } else if (!this.forceSet) {
                this.go();
            }
        } else {
            console.log('Illegal move:', moveString);
        }
    }

    force() {
        this.forceSet = true;
    }

    go() {
        this.forceSet = false;
        var moveString = this.opening.lookupRandom(this.board.loHash, this.board.hiHash);
        var move;

        if (moveString) {
            move = this.board.addMoveString(moveString);
        } else {
            move = this.search.iterativeDeepening(this.board, this.engineTime);
            this.board.addMove(move);
            moveString = utils.moveToString(move);
        }

        this.moveHistory.push(move);

        console.log(`move ${moveString}`);
        this.result();
    }

    undo() {
        var move = this.moveHistory.pop();
        if (move) {
            this.board.subtractMove(move);
            this.board.subtractHistory();
        }
    }

    remove() {
        this.undo();
        this.undo();
    }

    new() {
        this.forceSet = false;
        this.board = new Board();
    }

    setboard(fen) {
        this.board.fen = fen;
    }

    white() {
        this.board.turn = constants.WHITE;
    }

    black() {
        this.board.turn = constants.BLACK;
    }

    time(time) {
        this.engineTime = time;
    }

    otim(otim) {
        this.opponentTime = otim;
    }

    level(mps, base, inc) {

    }

    nps(nodeRate) {

    }

    st(time) {
        this.time = time;
    }

    sd(depth) {

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
        console.log(Object.keys(this.features).map(name => {
            return `feature ${name}=${this.features[name]}`;
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

display         Draws the board
perft [INT]     Perfts the current board to specified depth
perfthash [INT] Sets perft hashtable exponent (size 2^exponent)
divide [INT]    Divides the current board to specified depth
moves           Lists valid moves for this position
e2e4            Moves from the current position and thinks
go              Forces the engine to think
undo            Subtracts the previous move
new             Sets up the default board position
setboard [FEN]  Sets the board using Forsyth-Edwards Notation
evaluate        Performs a static evaluation of the board
white           Sets the active colour to WHITE
black           Sets the active colour to BLACK
time [INT]      Sets engine's time (in centiseconds)
otim [INT]      Sets opponent's time (in centiseconds)
sd [INT]        Sets maximum depth
st [INT]        Sets maximum time
exit            Exits the menu
quit            See exit
help            Gets you this magical menu
        `;
        console.log(helpMenu);
    }
}

module.exports = new Xboard();