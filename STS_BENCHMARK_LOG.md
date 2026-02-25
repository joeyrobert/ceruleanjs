# STS Benchmark Log

Records each benchmark run and the changes that produced it.

## Format
- **Score**: STS Total Points / 10000
- **Duration**: seconds
- **Change**: What was modified from previous run

---

## Run 1 (Baseline - from conversation history)
- **Score**: 4483
- **Duration**: ~50s
- **Workers**: 20
- **Change**: Original state before any improvements

---

## Run 2
- **Score**: 4559
- **Duration**: ~84s
- **Workers**: 12
- **Change**: Knight outpost fix, center control, bishop open game, queen on 7th, king safety/activity, rook behind passed pawn, bishop opposite colors, pawn wing advance, knight on rim penalty, improved PSTs, search reverted to original

---

## Run 3
- **Score**: 4493
- **Duration**: ~84s
- **Workers**: 12
- **Change**: Added tempo bonus, connected passed pawns, stronger queen PST; added hashSize 20 to STS worker

---

## Run 4
- **Score**: 4548
- **Duration**: ~84s
- **Workers**: 12
- **Change**: Removed tempo, connected passed pawns; reverted queen PST to moderate values; added killer moves in search; hashSize 18; futility margin 120

---

## Run 5
- **Score**: 4546
- **Duration**: ~84s
- **Workers**: 12
- **Change**: Reverted mobility bonus tweaks (kept 5); reverted aspiration window (kept 50)

---

## Run 6
- **Score**: 4547
- **Duration**: ~84s
- **Workers**: 12
- **Change**: Queen PST - filled in zeros with 2s, smoother center gradient (2,5,6,8)

---

## Run 7 (verified)
- **Score**: 4728
- **Duration**: 84.087s
- **Workers**: 12
- **Change**: None - fresh run to establish current baseline

---

## Run 8
- **Score**: 4701
- **Duration**: 84.097s
- **Workers**: 12
- **Change**: E8 PeSTO-based phase-dependent PSTs (pawn, knight, bishop, rook, queen MG/EG). **Reverted** - score regressed.

---

## Run 9
- **Score**: 4699
- **Duration**: 84.072s
- **Workers**: 12
- **Change**: E2 Candidate passed pawns (CANDIDATE_PASSED_BONUS 12). **Reverted** - score regressed.

---

## Run 10
- **Score**: 4704
- **Duration**: 84.077s
- **Workers**: 12
- **Change**: E3 Bad bishop / trapped bishop (BISHOP_TRAPPED_PENALTY 8). **Reverted** - score regressed.

---

## Run 11
- **Score**: 4587
- **Duration**: 84.076s
- **Workers**: 12
- **Change**: E1 Space control (SPACE_BONUS 3 for pieces in opponent's half). **Reverted** - score regressed.

---

## Run 12
- **Score**: 4751
- **Duration**: 84.059s
- **Workers**: 12
- **Change**: E5 Rook on open file vs king (ROOK_OPEN_FILE_VS_KING_BONUS 8)

---

## Run 13
- **Score**: 4666
- **Duration**: 84.063s
- **Workers**: 12
- **Change**: E4 King tropism (QUEEN_TROPISM_BONUS 2, ROOK_TROPISM_BONUS 1). **Reverted** - score regressed.

---

## Run 14
- **Score**: 4695
- **Duration**: 84.067s
- **Workers**: 12
- **Change**: E6 Phase tuning (BISHOP_ENDGAME_BONUS 3). **Reverted** - score regressed.

---

## Run 15
- **Score**: 4722
- **Duration**: 84.063s
- **Workers**: 12
- **Change**: E7 Inline getPstIndex. **Reverted** - slight score regression (4722 vs 4751).

---

## Run 16
- **Score**: 4748
- **Duration**: 84.066s
- **Workers**: 12
- **Change**: S6 QSearch delta pruning (margin 200). **Reverted** - slight score regression (4748 vs 4751).

---

## Run 17
- **Score**: 4732
- **Duration**: 84.068s
- **Workers**: 12
- **Change**: S3 LMR tuning (i > 3, depth >= 7 → reduction 2). **Reverted** - score regressed.

---

## Run 18
- **Score**: 4580
- **Duration**: 84.075s
- **Workers**: 12
- **Change**: S5 Check extension (extend by 1 when in check). **Reverted** - score regressed.

---

## Run 19
- **Score**: 4701
- **Duration**: 84.076s
- **Workers**: 12
- **Change**: S1 Null move pruning (R=3, disable when totalPieces <= 8). **Reverted** - score regressed.

---

## Run 20
- **Score**: 4679
- **Duration**: 84.070s
- **Workers**: 12
- **Change**: S4 Internal Iterative Deepening (depth-2 when no TT move, depth >= 6). **Reverted** - score regressed.

---

## Run 21
- **Score**: 4425
- **Duration**: 84.085s
- **Workers**: 12
- **Change**: S2 Countermove heuristic (boost moves capturing piece that moved). **Reverted** - score regressed.

---

## Run 22
- **Score**: 4774
- **Duration**: 84.082s
- **Workers**: 12
- **Change**: S7 SEE-based move ordering (downscore losing captures by 100 in capture ordering)

---

## Run 23
- **Score**: 4776
- **Duration**: 84.071s
- **Workers**: 12
- **Change**: E2 Candidate passed pawns (CANDIDATE_PASSED_BONUS 5, conservative)

---

## Run 24
- **Score**: 4788
- **Duration**: 84.078s
- **Workers**: 12
- **Change**: S6 QSearch delta pruning (margin 400, conservative)

---

## Run 25
- **Score**: 4754
- **Duration**: 84.075s
- **Workers**: 12
- **Change**: E3 Bad bishop (BISHOP_TRAPPED_PENALTY 3). **Reverted** - score regressed.

---

## Run 26
- **Score**: 4790
- **Duration**: 84.074s
- **Workers**: 12
- **Change**: Tempo bonus (TEMPO_BONUS 15 for side to move)

---

## Run 27
- **Score**: 4827
- **Duration**: 84.073s
- **Workers**: 12
- **Change**: Connected passed pawns (CONNECTED_PASSED_BONUS 20 when passed pawn has adjacent friendly pawn)

---

## Run 28
- **Score**: 4858
- **Duration**: 84.079s
- **Workers**: 12
- **Change**: CANDIDATE_PASSED_BONUS 5 → 8

---

## Run 29
- **Score**: 4859
- **Duration**: 84.074s
- **Workers**: 12
- **Change**: S6 delta margin 400 → 350 (slightly less conservative)

---

## Run 30
- **Score**: 4862
- **Duration**: 84.079s
- **Workers**: 12
- **Change**: ROOK_OPEN_FILE_VS_KING_BONUS 8 → 10

---

## Run 31
- **Score**: 4871
- **Duration**: 84.083s
- **Workers**: 12
- **Change**: TEMPO_BONUS 15 → 20

---

## Run 32
- **Score**: 4890
- **Duration**: 84.087s
- **Workers**: 12
- **Change**: Use TT move for move ordering even when ttDepth < depth

---

## Run 33
- **Score**: 4896
- **Duration**: 84.076s
- **Workers**: 12
- **Change**: QSearch TT probe (use transposition table in quiescence search)

---

## Run 34
- **Score**: 4949
- **Duration**: 84.079s
- **Workers**: 12
- **Change**: LMR more conservative (i > 5 instead of i > 4)

---

## Run 35
- **Score**: 4988
- **Duration**: 84.081s
- **Workers**: 12
- **Change**: LMR depth threshold 5 → 4 (reduce at depth 4+)

---

## Run 36
- **Score**: 4995
- **Duration**: 84.080s
- **Workers**: 12
- **Change**: Promotion move ordering (boost promotions to MOVE_ORDER_SECOND)

---

## Run 37
- **Score**: 4991
- **Duration**: 84.079s
- **Workers**: 12
- **Change**: Futility margin 120 → 140
- **Result**: Reverted (−4)

---

## Current Best: 4995 (Run 36)

## Current State
- Time per move: 1s (standard)
- Hash size: 18 (STS workers only)
- Killer moves: enabled
- Futility margin: 120
- LMR: i>5, depth>=4, reduction 1
