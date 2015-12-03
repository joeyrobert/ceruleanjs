'use strict';

const stdio = require('stdio');
const colors = require('colors');
const constants = require('./constants');
const Board = require('./board');
const perft = require('./perft');
const packageInfo = require('../package.json');

class Interface {
    constructor() {
        this.board = new Board();
        this.xboard = false;

        console.log('CeruleanJS', packageInfo.version, 'by', packageInfo.author);

        stdio.readByLines(line => {
            let parts = line.split(' ');
            let action = parts[0];

            if (constants.MOVE_REGEX.test(action)) {
                this.move(action);
            } else if (this[action]) {
                this[action].apply(this, parts.slice(1));
            } else if (!this.xboard) {
                console.log('Invalid command:', line);
            }
        });
    }

    display() {
        let display = '\n';

        for (let rankIndex = 8; rankIndex >= 1; rankIndex--) {
            display += ` ${colors.bold(rankIndex)} `;

            for (let fileIndex = 1; fileIndex <= 8; fileIndex++) {
                let index = this.board.rankFileToIndex(rankIndex, fileIndex);
                let turn = this.board.board[index] % 2;
                let square = index % 2 === 0;
                let value = ` ${constants.PIECE_DISPLAY_MAP[this.board.board[index] - turn]} `;
                value = colors[square ? 'bgGreen' : 'bgYellow'](value);
                value = colors[turn === constants.WHITE ? 'white' : 'black'](value);
                display += value;
            }
            display += '\n';
        }

        display += '   ';

        for (let fileIndex = 1; fileIndex <= 8; fileIndex++) {
            display += ` ${colors.bold(String.fromCharCode(96 + fileIndex))} `;
        }

        display += '\n\n' + this.board.fen;

        console.log(display);
    }

    divide(depth) {

    }

    perft(depth) {
        console.log(depth);
        debugger;
        console.log(perft(this.board, parseInt(depth, 10)));
    }

    moves() {
        console.log(this.board.moveString());
    }

    xboard() {
        console.log('');
        this.xboard = true;
    }

    move(move) {
        this.board
    }

    force() {

    }

    go() {

    }

    undo() {
        this.board.subtractMove(0);
    }

    new() {
        this.board = new Board();
    }

    setboard(fen) {
        this.board.fen = fen;
    }

    eval() {

    }

    white() {
        this.board.turn = constants.WHITE;
    }

    black() {
        this.board.turn = constants.BLACK;
    }

    time(time) {

    }

    otim(otim) {

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
        let helpMenu = `
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
eval            Performs a static evaluation of the board and prints info
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

new Interface();

let board = new Board();

