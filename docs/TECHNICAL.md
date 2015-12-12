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

## Move representation

Moves are represented as a 32-bit integer with the following fields:

    [EMPTY]  PROMO    TO       FROM
    00000000 00000000 00000000 00000000
    ^ MSB                         LSB ^

TO/FROM are board indices, and PROMO is the promotion piece type.

## Zobrist hashing

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
