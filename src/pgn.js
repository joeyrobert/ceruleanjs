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
                    .trim()
                    .replace(/  [0-1](\/2)?-[0-1](\/2)?$/, '')
                    .replace(/\d+\./g, '');
                lineWithoutNumbers.split(' ').forEach(move => moves.push(move));
            } else if (moveMode) {
                // Going out of move mode;
                game.moves = moves;
                games.push(game);
                game = {};
                moves = [];
                moveMode = false;
            }
        });

        this.games = games;

        return games;
    }
};