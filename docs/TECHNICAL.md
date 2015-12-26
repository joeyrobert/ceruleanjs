# CeruleanJS Technical Information
                                 ___
                                /\_ \
      ___     __   _ __   __  __\//\ \      __     __      ___
     /'___\ /'__`\/\`'__\/\ \/\ \ \ \ \   /'__`\ /'__`\  /' _ `\
    /\ \__//\  __/\ \ \/ \ \ \_\ \ \_\ \_/\  __//\ \L\.\_/\ \/\ \
    \ \____\ \____\\ \_\  \ \____/ /\____\ \____\ \__/.\_\ \_\ \_\
     \/____/\/____/ \/_/   \/___/  \/____/\/____/\/__/\/_/\/_/\/_/


## Board represention

15x12 board is used for. Piece lists for each side handle board state.
The board representation is visualized below:

![CeruleanJS Board](board.gif)

An interactive form of this visualization is available in board.ods. Every
legal position on the board is _truthy_ in JavaScript. Positions outside the
legal board (8x8) are `undefined`. This is the sentinal value that tells us
when a square is within the bounds of the board, as in the
[Mailbox](http://chessprogramming.wikispaces.com/Mailbox) board representation.

### Conversion

Board indices, rank and file can be converted to one another using the
following functions:

    index = rank * 15 + file + 17
    rank = floor(index / 15 - 1)
    file - (index - 3) % 15 + 1

## Piece representation

Pieces are represented as follows:

    Pawn   00000010 (2^1)
    Knight 00000100 (2^2)
    Bishop 00001000 (2^3)
    Rook   00010000 (2^4)
    Queen  00100000 (2^5)
    King   01000000 (2^6)
    Empty  10000000 (2^7)

The turn of the piece is represented as the least significant bit, 1 for
black, 0 for white.

## Move representation

Moves are represented as a 32-bit integer with the following fields:

    ORDER  BITS   CAP PRO TO      FROM
    000000 000000 000 000 0000000 0000000
    ^ MSB                         LSB ^

This breaksdown to the following distribution:

* 7 bits for FROM index
* 7 bits for TO index
* 3 bits for PROmotion piece (Q/R/B/N)
* 3 bits for CAPtured piece (any or empty)
* 6 bits for BITS (metadata)
* 6 bits for ORDERing

This dense move structure requires less data to be saved on the board's
internal history array.

For captured and promotion pieces, the number represents the base-2 logarithm
of the piece type.

BITS is metadata set by the move generate about what type of move this is. The
BITS property is defined as follows (influenced by TSCP):

    1  capture            (000001)
    2  castling           (000010)
    4  en passant         (000100)
    8  pawn move          (001000)
    16 double pawn move   (010000)
    32 promote            (100000)

## Zobrist hashing

### Version 0.0.1 (Azure)

JavaScript lacks a 64-bit integer type. It does contain a 64 bit floating
point number, of which 53 bits can be used to precisely save an integer.
Bitwise operations in JavaScript only work on 32-bit integers, meaning no XOR
for 53 bits. However using a combination of additions and subtracts, we can
implement zobrist hashing without an exclusive or.

A 53-bit additive zobrist key is generated for each board position through the
sum of all pieces pieces on squares with colours, en passant position,
castling rights and side to move. Each additive value is up to 48 bits. There
are a maximum of 38 values in the zobrist sum:

* 32 pieces by square by color
* 4 castling rights (KQkq)
* 1 en passant position
* 1 side to move

This should be enough to uniquely describe the board position, with a
collision frequency of one in 2^24 (16,777,216) boards. With the chosen random
seed, the max zobrist sum possible in this scheme is 7,827,150,971,215,194
(less than the max JS safe integer size of 9,007,199,254,740,991). This number
does not account for maximum *legal* position, only a sum of the 38 largest
integers generated.

This architecture was inspired by [this
paragraph](https://chessprogramming.wikispaces.com/Zobrist+Hashing#Collisions-
When you lack a true integer type) on zobrist keys in the Chess Programming
Wiki.

### Version 0.0.2 (Blizzard)

CeruleanJS 0.0.2 uses 2 32-bit integers. The reasons for switching from 1
64-bit floating point number are:

* Integer XOR operations prove to be faster than floating point addition/subtraction
* Improved resilience against collisions (One collision every ~2^32 vs. ~2^24 for float)

## Move ordering

Move ordering is done using Static Exchange Evaluation (SEE), inspired by
[Mediocre's guide on the subject](http://mediocrechess.sourceforge.net/guides/see.html).
This is done on the `qsearch()` only to order capture moves. The primary
alpha-beta search uses iterative-deepening to put the best move from the
previous iteration first.
