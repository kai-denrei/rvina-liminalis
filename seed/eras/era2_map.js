// eras/era2_map.js — era 2 dungeon layout. PURE DATA: no DOM, no imports; loadable in
// plain node so the BFS validator and any future tooling can read it headless.
// Coordinates: x = column 0..15 (west→east), y = row 0..15 (north→south).
// Layout (4 rooms + corridors, full wall border, everything BFS-reachable from ENTRY):
//   A entry room   x1-5  y11-14   (ENTRY at 3,13 facing N — the bottom of the stairs)
//   B west room    x1-4  y1-4     (the kitchen — someone LIVED here once; a beast lives here now)
//   C central hall x7-9  y6-9     (the crossroads; the candle table burns in its NE corner)
//   D treasure room x11-14 y1-3   (DEAD END — single doorway at 11,4; the main hoard)
//   east corridor  y7 x10-14 then x14 y7-13 — the ONLY way to EXIT (14,13);
//   ENEMIES[0] squats at 14,10: the choke point, EXIT on its far side. Two lesser
//   beasts live deeper in (west room, central hall) — off the exit corridor, so the
//   chokepoint property is theirs alone to the big one.
// Item weights sum to 17.5kg against an 18kg pack (she ARRIVES carrying 3.5kg: the
// bow, five arrows and the lit torch — continuity, Gerald 2026-06-11); the
// choosing-what-to-keep beat (ledger: inventory/weight) re-stages as the loot grows.
// Ammo economy (Gerald): every foe takes 3 hits; 5 starting arrows kill one beast,
// never two — bundles of 6 ARE the new-ammo economy, placed before the chokepoint.

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
  // NO bow on the floor: she carried it (and five arrows) through the portal.
  {id:'sword', x:3, y:12,kg:2.5},         // a dead adventurer at the entrance still holds it (dressing agent: skeleton sprite)
  {id:'arrows',x:12,y:1,kg:0.6,count:6},  // treasure room — thinned to a bundle of 6: the economy's unit
  {id:'torch', x:13,y:1,kg:1},
  {id:'torch', x:14,y:2,kg:1},
  {id:'idol',  x:12,y:2,kg:6},   // one cell deep — the heaviest thing must be CHOSEN, not tripped over
  {id:'mirror',x:13,y:3,kg:3},
  {id:'coins', x:14,y:1,kg:0.5,count:30}, // the treasure room earns its name
  {id:'crown', x:13,y:2,kg:1.5},          // beside the idol — one more thing to want against the kg cap (Crown.png billboard)
  {id:'coins', x:1, y:2,kg:0.2,count:12}, // a small stash beside the west-room beast
  {id:'arrows',x:2, y:4,kg:0.6,count:6},  // west room doorway — resupply on a natural route
  {id:'arrows',x:7, y:8,kg:0.6,count:6},  // central hall, on the way through
];

// DECOR — Gerald's pixel-art sprites (2026-06-11; the art is law). Pure dressing:
// decor is NOT pickable and does NOT block movement (you walk over the bones) —
// it adds no walls, so BFS reachability from ENTRY is untouched by this table.
// EXCEPTION: chests are decor you can OPEN (space, once each — the renderer holds
// the opened flag); the loot drops into the pack/cell via the normal pickup idiom.
// sprite names map to public/sprites/era2/ via the renderer's DECOR_DEF table.
export const DECOR=[
  // the dead swordsman at the bottom of the stairs — his sword is the ITEMS row above
  {x:3, y:12,sprite:'skeleton'},
  // chests: the one before the chokepoint carries the ammo economy; the rest, coin
  {x:13,y:7, sprite:'chest',loot:{id:'arrows',kg:0.6,count:6}},  // east corridor, BEFORE the chokepoint at 14,10
  {x:1, y:12,sprite:'chest',loot:{id:'coins',kg:0.25,count:8}},  // entry room — the first reward
  {x:4, y:2, sprite:'chest',loot:{id:'coins',kg:0.3,count:14}},  // kitchen larder
  {x:7, y:6, sprite:'chest',loot:{id:'coins',kg:0.3,count:10}},  // central hall
  // the kitchen (west room): hearth, hanging rack, table, barrel, washing tub, spilt water
  {x:1,y:1,sprite:'kitchen:Kitchen03'},   // the hearth
  {x:2,y:1,sprite:'kitchen:Kitchen01'},   // utensil rack, hung from the ceiling
  {x:3,y:1,sprite:'kitchen:Table02'},
  {x:4,y:1,sprite:'kitchen:Barrel01'},
  {x:1,y:3,sprite:'kitchen:Tub01'},
  {x:2,y:3,sprite:'kitchen:Water01'},     // water, long since gone cold
  // the candle table — central hall, NE corner. ALWAYS lit (Gerald: 'always lit,
  // even if we run out of torches'); the renderer treats it as a 1-cell light source.
  {x:9,y:6,sprite:'candleTable'},
];

export const ENEMIES=[
  // hp 3 across the board: 3 arrow hits (or 3 sword swings) per beast — with 5
  // starting arrows that is one kill and two spare, never two kills (Gerald).
  {x:14,y:10,hp:3,big:true}, // the choke point — EXIT on its far side
  {x:2, y:2, hp:3},          // west room — calm until entered (short leash)
  {x:9, y:9, hp:3},          // central hall's south corner
];
export const ENEMY=ENEMIES[0]; // compat alias — the chokepoint beast

export const EXIT={x:14,y:13};
