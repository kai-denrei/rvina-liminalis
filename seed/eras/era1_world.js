// eras/era1_world.js — Limina I overworld. PURE DATA: no DOM, no imports; loadable in
// plain node so the BFS validator and any future tooling can read it headless
// (the era2_map.js pattern). Coordinates: x = column 0..59 (west→east),
// y = row 0..44 (north→south). TILE=40 → world 2400x1800 px = 3x3 screens.
//
// Tile legend: '.' plains · 'f' forest · '~' water (impassable) · 'm' marsh ·
//              'T' the Tallest Tree (impassable, 1 cell, drawn 3 tiles tall) ·
//              'r' rock (impassable).
//
// THE GEOGRAPHY IN SENTENCES (LIMINA_I.md §2 design rule — every site must be
// describable in one sentence; if it can't be, the geography is too generic):
//   start    — the figure wakes on the open plains, a few steps east of the wizard.
//   wizard   — the wizard keeps to the west plains, the collapsed portal beside him.
//   portal   — the dark portal frame stands two steps east of the wizard, on the plain.
//   marker   — the half-worn marker stone stands alone in the northern plains,
//              halfway between the wizard and the river.
//   fisher   — the fisher waits on the south bank where the one river meets the sea.
//   ford     — the ford is the only shallow in the river, where it jogs west on its
//              north run, upstream of the bend.
//   tree     — the Tallest Tree stands on the far bank where the river runs north,
//              out-topping any forest.
//   rescue   — the rescue clearing lies north of the Tallest Tree, across the ford.
//   traveler — the traveler rests at the forest's north-east edge, where the land
//              opens toward the river bend.
//   marsh    — the marsh lies just past the forest's east edge, reeds against the
//              open plain.
//   the sea  — the whole east edge of the world; the shore is walkable, the water
//              is not, and the world's edge lives here now.
//   the river— one river only: in at the north edge, south past the Tallest Tree,
//              a westward jog at the ford, then the bend, and east to the sea at
//              the fisher's mouth.
//
// Validated by BFS (scripts kept in /tmp during authoring; proof in the build log):
// start reaches every site; all 2362 walkable tiles are one region; water is never
// entered; blocking the two ford cells splits the land into exactly two components
// (1774 start-side + 586 rescue-side + 2 ford cells = 2362) — the ford is the only
// crossing, and the rescue, the rough folk, and the tree's far bank all lie beyond it.

export const TILE=40, COLS=60, ROWS=45;   // world 2400x1800 = 3x3 screens

export const GRID=[
  '..................................~~...................~~~~~',
  '..................................~~...................~~~~~',
  '..................................~~...................~~~~~',
  '..................................~~...................~~~~~',
  '..................................~~...................~~~~~',
  '..................................~~...................~~~~~',
  '........rr........................~~........rr.........~~~~~',
  '........r.........................~~.........r.........~~~~~',
  '..................................~~..................~~~~~~',
  '..................................~~T.................~~~~~~',
  '..................................~~..................~~~~~~',
  '..................................~~..................~~~~~~',
  '..................................~~..................~~~~~~',
  '..................................~~..................~~~~~~',
  '.................................~~....................~~~~~',
  '.................................~~....................~~~~~',
  '.......................................................~~~~~',
  '.................................~~....................~~~~~',
  '.................................~~....................~~~~~',
  '.................................~~....................~~~~~',
  '.................................~~.....................~~~~',
  '.................................~~.....................~~~~',
  '..................................~~....................~~~~',
  '..................................~~....................~~~~',
  '..................................~~....................~~~~',
  '..................................~~....................~~~~',
  '..................................~~....................~~~~',
  '..................................~~....................~~~~',
  '......fffffffffff.................~~...................~~~~~',
  '....fffffffffffffffff.............~~...................~~~~~',
  '...ffffffffffffffffffffff.........~~~~~~~~~~~..........~~~~~',
  '..fffffffffffffffffffffffff.......~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '..ffffffffffffffffffffffffff.................~~~~~~~~~~~~~~~',
  '..ffffffffffffffffffffffffff...........................~~~~~',
  '..fffffffffffffffffffffffffmmmm.......................~~~~~~',
  '...ffffffffffffffffffffffffmmmmm......................~~~~~~',
  '...fffffffffffffffffffffff.mmmmmm.....................~~~~~~',
  '....ffffffffffffffffffffff.mmmmmm.....................~~~~~~',
  '....fffffffffffffffffffff...mmmm................rr....~~~~~~',
  '.....fffffffffffffffffff....mmm.......................~~~~~~',
  '......ffffffffffffffff.................................~~~~~',
  '........fffffffffff....................................~~~~~',
  '..........ffffff.......................................~~~~~',
  '.......................................................~~~~~',
  '.......................................................~~~~~',
];

// Hand-placed sites (tile coords). The ford spans {x,y} and {x+1,y}.
export const SITES={
  wizard:  {x:10,y:18},
  fisher:  {x:53,y:33},
  marker:  {x:24,y:12},
  traveler:{x:27,y:30},
  tree:    {x:36,y:9},
  ford:    {x:33,y:16},
  rescue:  {x:37,y:4},
  marsh:   {x:30,y:36},
  portal:  {x:12,y:18},
  start:   {x:14,y:20},
};

// Sparse wandering foes: 5 plains, 8 forest, none within 8 tiles of start.
export const FOES=[
  {x:24,y:24,biome:'plains'},
  {x:6, y:10,biome:'plains'},
  {x:28,y:6, biome:'plains'},
  {x:44,y:16,biome:'plains'},   // across the ford — the far bank is not safe
  {x:47,y:25,biome:'plains'},
  {x:8, y:32,biome:'forest'},
  {x:14,y:34,biome:'forest'},
  {x:20,y:32,biome:'forest'},
  {x:6, y:38,biome:'forest'},
  {x:12,y:40,biome:'forest'},
  {x:18,y:38,biome:'forest'},
  {x:23,y:35,biome:'forest'},
  {x:10,y:36,biome:'forest'},
];

// The three rough folk who beset Cardea at the rescue clearing (north of the tree).
export const ROUGH=[{x:36,y:3},{x:39,y:4},{x:37,y:6}];
