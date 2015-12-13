'use strict';

const stdio = require('stdio');
const colors = require('colors');
const constants = require('./constants');
const Board = require('./board');
const evaluate = require('./evaluate');
const iterativeDeepening = require('./iterative_deepening');
const perft = require('./perft');
const utils = require('./utils');
const packageInfo = require('../package.json');

class Xboard {
    constructor() {
        this.board = new Board();
        this.engineTime = 60*100;
        this.opponentTime = 60*100;
        this.xboard = false;

        console.log('CeruleanJS', packageInfo.version, 'by', packageInfo.author);

        stdio.readByLines(line => {
            var parts = line.split(' ');
            var action = parts[0];

            if (constants.MOVE_REGEX.test(action)) {
                this.move(action);
            } else if (this[action]) {
                this[action].call(this, parts.slice(1).join(' '));
            } else {
                console.log('Error (invalid command):', line);
            }
        });
    }

    result() {
        var perftScore = perft.perft(this.board, 1);
        var result = false;

        if (perftScore === 0) {
            if (this.board.isInCheck(this.board.turn)) {
                result = this.board.turn ? '1-0' : '0-1';
            } else {
                result = '1/2-1/2';
            }
        }

        if (result) {
            console.log(`result ${result}`);
        }

        return result;
    }

    display() {
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

        display += '\n\n' + this.board.fen;
        display += '\n\n' + this.board.hash;

        console.log(display);
    }

    divide(depth) {
        if (!depth) {
            console.log('Error (divide [INT] parameter not provided):', line);
            return;
        }

        var division = perft.divide(this.board, parseInt(depth, 10));
        console.log(division.map(entry => `${entry[0]} ${entry[1]}`).join('\n'));
    }

    evaluate() {
        console.log(evaluate.evaluate(this.board));
    }

    perft(depth) {
        if (!depth) {
            console.log('Error (perft [INT] parameter not provided):', line);
            return;
        }

        console.log(perft.perftHashed(this.board, parseInt(depth, 10)));
    }

    moves() {
        console.log(this.board.movesString());
    }

    xboard() {
        console.log('');
        this.xboard = true;
    }

    move(moveString) {
        var move = this.board.moveStringToMove(moveString);
        var moves = this.board.generateMoves();
        var legalMove = false;

        if (moves.indexOf(moves) < 0) {
            legalMove = this.board.addMove(move);
            this.result();
        }

        if (!legalMove) {
            console.log('Illegal move:', moveString);
        } else if (!this.force) {
            this.go();
        }
    }

    force() {
        this.force = true;
    }

    go() {
        this.force = false;
        var move = iterativeDeepening(this.board, this.engineTime);
        this.board.addMove(move);
        console.log(`move ${this.board.moveToString(move)}`);
        this.result();
    }

    undo() {
        this.board.subtractMove();
    }

    new() {
        this.force = false;
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
--------
display         Draws the board
perft [INT]     Perfts the current board to specified depth
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