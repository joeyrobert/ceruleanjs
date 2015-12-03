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

Moves are represented as an array with a maximum length of 4. The entries in the array are:

	[
		FROM_INDEX,
		TO_INDEX,
		PROMOTION_PIECE,
		CASTLING
	]

Fields [2] and [3] are optional and only used for those specific piece types.