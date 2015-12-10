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

Moves are represented as an array with a maximum length of 4. The entries in the
array are:

    [
        FROM_INDEX,
        TO_INDEX,
        PROMOTION_PIECE,
        CASTLING
    ]

Fields [2] and [3] are optional and only used for those specific piece types.

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
collision frequency of one in 2^24 (16,777,216) boards. This architecture was
inspired by [this
paragraph](https://chessprogramming.wikispaces.com/Zobrist+Hashing#Collisions-
When you lack a true integer type) on zobrist keys in the Chess Programming
Wiki.
