# CeruleanJS by Joey Robert

JavaScript Chess Engine

                                 ___
                                /\_ \
      ___     __   _ __   __  __\//\ \      __     __      ___
     /'___\ /'__`\/\`'__\/\ \/\ \ \ \ \   /'__`\ /'__`\  /' _ `\
    /\ \__//\  __/\ \ \/ \ \ \_\ \ \_\ \_/\  __//\ \L\.\_/\ \/\ \
    \ \____\ \____\\ \_\  \ \____/ /\____\ \____\ \__/.\_\ \_\ \_\
     \/____/\/____/ \/_/   \/___/  \/____/\/____/\/__/\/_/\/_/\/_/


Official Website: http://ceruleanjs.joeyrobert.org/

## Introduction

CeruleanJS is an XBoard chess engine for NodeJS, written by [Joey Robert](https://joeyrobert.org/).

The goals of CeruleanJS are threefold:

* Correctness
* Performance
* Ease of programming

CeruleanJS aims to be ranked on the CCRL.

## Requirements

* Node >= 16.0

## Setup

To install the binary into your $PATH, install the ceruleanjs package
globally:

    npm install -g ceruleanjs

Run the engine with the command:

    ceruleanjs

If you're installing from sources, check out this git repository and run:

    npm install

To run:

    npm start

To run mocha tests:

    npm test

To generate a Windows binary executable using nexe, run:

    npm run build-windows

This requires Microsoft Visual Studio 2015/2019/2022 to be installed. It will generate
`ceruleanjs.exe` and `book.bin` in `dist`.

To generate a web build, run:

    npm run build-web

This will generate a babelify'd ES5 version of CeruleanJS that is compatible with most
modern day web browsers that support [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers). This build is used in the [CeruleanJS Player](https://bitbucket.org/joeyrobert/ceruleanjs-player).

## Interface

CeruleanJS supports the XBoard/winboard/CECP format for communicating with
interfaces or other chess engines. It's also usable directly through
STDIN/OUT. Here's the list of commands:

    CeruleanJS 0.2.0, Javascript Chess Engine by Joey Robert
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

## Interface GIF

![CeruleanJS Usage GIF](docs/interface.gif)

## Technical

For a more technical breakdown of how CeruleanJS is implemented, [see
docs/TECHNICAL.md](docs/TECHNICAL.md)

## License

CeruleanJS is licensed under the [GNU GPL v3](LICENSE).

## Changelog

* v0.2.0 *(Cobalt)* - 2021-12-19
    * Upgrade to Node 16+ (big speed boost)
    * Improved `isAttacked` function based on piece lists for faster move generation, using generated attack tables
    * Transposition table in search, evaluation and pawn evaluation. Hash move is ordered first in move ordering.
    * Switch to Array#sort and away from custom quicksort for move ordering
    * Use [Relative History Heuristic](https://www.chessprogramming.org/Relative_History_Heuristic) in conjunction with MVV/LVA for move ordering
    * Support memory command in xboard interface, much tighter memory consumption than previous version
    * Improved timing on iterative deepening code to prevent the engine from running out of time
    * Added `bitbucket-pipelines.yml` for unit tests on every commit
    * Added `.eslintrc` for JS linting
    * Improved search timing using `performance.now()`
    * Updated icon and metadata for `ceruleanjs.exe`

* v0.1.1 *(Blizzard)* - 2016-01-20
    * Fixed Polyglot castling bug

* v0.1.0 *(Blizzard)* - 2016-01-20
    * Vastly improved move generation performance (10x)
    * Polyglot opening book (removes Mersenne Twister dependency)
        * Changed piece representation to Polyglot format
        * Implemented Polyglot Zobrist key support
        * Changed turn value (`BLACK = 0, WHITE = 1`)
    * Improved time management (supporting winboard level)
    * Implemented Strategic Test Suite (STS)
    * Support for Standard Algebraic Notation through `moves` command
    * Implemented Static Exchange Evaluation (SEE) -- not used at the moment
    * Implemented MVV/LVA move ordering
    * Improved evaluation function
    * Denser move structure
    * Added ANSI colors function (removes `colors` dependency)
    * Switched to Node's readline (removes `stdio` dependency)
    * Web support through [CeruleanJS Player](https://bitbucket.org/joeyrobert/ceruleanjs-player)
    * Fixed Windows EXE generation bug
    * Improved unit test coverage
    * Changed LICENSE from GPLv2 to GPLv3
    * Rating roughly ~1300 ELO

* v0.0.1 *(Azure)* - 2015-12-13
    * 15x12 board representation
    * Black and White piece lists
    * Move generation passing 100% perft test suite
    * FEN board getter and setter
    * 53-bit zobrist hash
    * Hash table
    * PVS Search with quiescence
    * Iterative deepening with basic move ordering
    * Simplified evaluation function (material + piece square tables)
    * Windows EXE generation
    * XBoard support
