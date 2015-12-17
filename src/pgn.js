'use strict';

module.exports = class PGN {
    constructor(pgn) {
        if (pgn) {
            this.parse(pgn);
        }
    }

    parse(pgn) {
        var lines = pgn.split('\n');
        var games = [];
        var game = {};
        var moves = [];
        var moveMode = false;

        lines.forEach(line => {
            if (line[0] === '%') {
                // PGN comment
                return;
            } else if (line[0] === '[') {
                var matches = /\[(.*?) \"(.*?)\"\]/.exec(line);
                game[matches[1].toLowerCase()] = matches[2];
            } else if (/\d+./.test(line)) {
                moveMode = true;
                var lineWithoutNumbers = line
                    .replace(/{.*?}/g, '')
                    .replace(/\d+\./g, '')
                    .replace(/  +/g, ' ')
                    .trim();

                lineWithoutNumbers.split(' ').forEach(move => moves.push(move));
            } else if (moveMode) {
                // Going out of move mode;
                moves.pop(); // remove last move (result)
                game.moves = moves;
                games.push(game);
                game = {};
                moves = [];
                moveMode = false;
            }
        });

        if (moves.length > 0) {
            game.moves = moves;
            games.push(game);
        }

        this.games = games;

        return games;
    }
};