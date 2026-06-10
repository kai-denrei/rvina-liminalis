// eras/era2_map.js — era 2 dungeon layout. PURE DATA: no DOM, no imports; loadable in
// plain node so the BFS validator and any future tooling can read it headless.
// Coordinates: x = column 0..15 (west→east), y = row 0..15 (north→south).
// Layout (4 rooms + corridors, full wall border, everything BFS-reachable from ENTRY):
//   A entry room   x1-5  y11-14   (ENTRY at 3,13 facing N — the bottom of the stairs)
//   B west room    x1-4  y1-4     (empty — most of the dungeon is; bible §4: mostly empty)
//   C central hall x7-9  y6-9     (the crossroads)
//   D treasure room x11-14 y1-3   (DEAD END — single doorway at 11,4; holds ALL items)
//   east corridor  y7 x10-14 then x14 y7-13 — the ONLY way to EXIT (14,13);
//   ENEMY squats at 14,10: the choke point, EXIT on its far side.
// Item weights sum to 14.2kg against a 12kg pack: you cannot carry everything.
// Choosing what to keep is the era-2 beat (ledger: inventory/weight).

export const GRID=[
  '################',
  '#....######....#',
  '#....######....#',
  '#....######....#',
  '#....###....####',
  '###.####.#######',
  '###.###...######',
  '###.###........#',
  '###.......####.#',
  '###.###...####.#',
  '###.##########.#',
  '#.....########.#',
  '#.....########.#',
  '#.....########.#',
  '#.....##########',
  '################',
];

export const ENTRY={x:3,y:13,facing:'N'};

export const ITEMS=[
  {id:'bow',   x:11,y:1,kg:2},
  {id:'arrows',x:12,y:1,kg:1.2,count:12},
  {id:'torch', x:13,y:1,kg:1},
  {id:'torch', x:14,y:2,kg:1},
  {id:'idol',  x:12,y:2,kg:6},   // one cell deep — the heaviest thing must be CHOSEN, not tripped over
  {id:'mirror',x:13,y:3,kg:3},
];

export const ENEMY={x:14,y:10,hp:3};

export const EXIT={x:14,y:13};
