// eras/era2_map.js — era 2 dungeon layout. PURE DATA: no DOM, no imports; loadable in
// plain node so the BFS validator and any future tooling can read it headless.
// Coordinates: x = column 0..15 (west→east), y = row 0..15 (north→south).
// Layout (4 rooms + corridors, full wall border, everything BFS-reachable from ENTRY):
//   A entry room   x1-5  y11-14   (ENTRY at 3,13 facing N — the bottom of the stairs)
//   B west room    x1-4  y1-4     (empty — most of the dungeon is; bible §4: mostly empty)
//   C central hall x7-9  y6-9     (the crossroads)
//   D treasure room x11-14 y1-3   (DEAD END — single doorway at 11,4; the main hoard)
//   east corridor  y7 x10-14 then x14 y7-13 — the ONLY way to EXIT (14,13);
//   ENEMIES[0] squats at 14,10: the choke point, EXIT on its far side. Two lesser
//   beasts live deeper in (west room, central hall) — off the exit corridor, so the
//   chokepoint property is theirs alone to the big one.
// Item weights sum to 16.1kg against an 18kg pack; the choosing-what-to-keep beat
// (ledger: inventory/weight) re-stages as the loot grows heavier.

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
  {id:'coins', x:14,y:1,kg:0.5,count:30}, // the treasure room earns its name
  {id:'coins', x:1, y:2,kg:0.2,count:12}, // a small stash beside the west-room beast
  {id:'arrows',x:2, y:4,kg:0.6,count:6},  // west room doorway — resupply on a natural route
  {id:'arrows',x:7, y:8,kg:0.6,count:6},  // central hall, on the way through
];

export const ENEMIES=[
  {x:14,y:10,hp:3,big:true}, // the choke point — EXIT on its far side
  {x:2, y:2, hp:2},          // west room — calm until entered (short leash)
  {x:9, y:9, hp:2},          // central hall's south corner
];
export const ENEMY=ENEMIES[0]; // compat alias — the chokepoint beast

export const EXIT={x:14,y:13};
