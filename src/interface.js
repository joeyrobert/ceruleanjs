'use strict';

var stdio = require('stdio');
const constants = require('./constants');
const Board = require('./board');
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
            } else if (this.xboard) {
                console.log('Invalid command');
            }
        });
    }

    display() {

    }

    divide(depth) {

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
divide n        Divides the current board to a depth of n
e2e4            Moves from the current position, and thinks
go              Forces the engine to think
undo            Subtracts the previous move
new             Sets up the default board position
setboard [FEN]  Sets the board using Forsyth-Edwards Notation
eval            Performs a static evaluation of the board and prints info
white           Sets the active colour to WHITE
black           Sets the active colour to BLACK
time [INT]      Sets engine's time (in centiseconds)
otim [INT]      Sets opponent's time (in centiseconds)
sd
exit            Exits the menu
quit            See exit
help            Gets you this magical menu

        `;
        console.log(helpMenu);
    }
}

new Interface();

let board = new Board();

