// state.js — engine-level state for SEED / Ruina Liminalis
// The reusable spine: flags, XP (life-gives-XP), persistent companions, the verb.
// Vanilla ES module. No build step. Import once; share across every era and seam.
//
//   import { flags, xp, party, verb, save, load } from './state.js';
//
// Design law this enforces:
//   - Flags drive dialogue/gating/XP. NEVER scatter distance-checks through draw loops.
//   - Cardea (and the verb, and accrued XP) PERSIST across seams. Eras read/write here.
//   - Living accrues growth: XP comes from discovery/meeting/reaching/waiting, not just kills.

/* ------------------------------------------------------------------ *
 * 1. FLAGS — the single source of truth for "what has happened"
 * ------------------------------------------------------------------ */

// A flag is a boolean that, once true, stays true (story is monotonic here).
// Setting a flag the first time can fire hooks (XP, a log line, a recall beat).
const _flags = Object.create(null);
const _flagHooks = Object.create(null); // name -> [fn]

export const flags = {
  has(name) { return _flags[name] === true; },

  // Set a flag. Returns true only on the FIRST set (so callers can react once).
  set(name, value = true) {
    const was = _flags[name] === true;
    _flags[name] = value;
    const firstTime = value === true && !was;
    if (firstTime && _flagHooks[name]) {
      for (const fn of _flagHooks[name]) fn(name);
    }
    return firstTime;
  },

  // Require ALL listed flags (gate helper). gateAll('found_cardea','has_mandrake')
  gateAll(...names) { return names.every((n) => _flags[n] === true); },
  gateAny(...names) { return names.some((n) => _flags[n] === true); },

  // Run fn the first time `name` becomes true (or immediately if already true).
  onFirst(name, fn) {
    if (_flags[name] === true) { fn(name); return; }
    (_flagHooks[name] ||= []).push(fn);
  },

  all() { return { ..._flags }; },     // snapshot (for save / debug overlay)
  _restore(obj) { Object.assign(_flags, obj); },
};

// Canonical flag names live here so eras don't invent typo-twins.
// Add per-era blocks as you build; keep them grouped and commented.
export const FLAG = Object.freeze({
  // --- Limina I ---
  WIZARD_EXPLAINED_PORTAL: 'wizard_explained_portal',
  HEARD_HER_NAME:          'heard_her_name',        // rumor fragments of "Cardea"
  KNOWS_CARDEA_REGION:     'knows_cardea_region',    // riddle assembled
  FOUND_CARDEA:            'found_cardea',
  CARDEA_JOINED:           'cardea_joined',
  LEARNED_MANDRAKE_WHEN:   'learned_mandrake_when',   // full moon (taught, not shown)
  LEARNED_MANDRAKE_WHERE:  'learned_mandrake_where',
  HAS_MANDRAKE:            'has_mandrake',
  RITUAL_DONE:             'ritual_done',
  PORTAL_OPEN:             'portal_open',
  // --- Era 2 (Dungeon) — stubs ---
  FOUND_IOLO:              'found_iolo',
});

/* ------------------------------------------------------------------ *
 * 2. XP — life gives XP (D&D-flavored: many sources, combat is one)
 * ------------------------------------------------------------------ */

// Source weights. TUNE HERE. Recommendation from LIMINA_I.md §3B:
// weight discovery/encounter >= combat, so the economy teaches that
// growth comes from living broadly, not from violence.
export const XP_SOURCE = Object.freeze({
  DISCOVER_BIOME:  12,   // first entry into a new biome
  MEET_NPC:         8,   // meeting someone / hearing a rumor
  REACH_LANDMARK:  10,   // reaching a named place (read the world rightly)
  LEARN_LORE:      10,   // a lore flag flips (knowing is leveling)
  SURVIVE_FIGHT:    9,   // endurance, not just kills
  WAIT_FULL_MOON:  14,   // patience as growth — turns the dead timer into XP
  FELL_FOE:         5,   // least-weighted on purpose: combat is the crude path
});

// Level thresholds (cumulative XP). Keep era-1 effects light.
const LEVELS = [0, 30, 75, 140, 230, 350, 500, 700];

const _xpListeners = []; // fn({total, level, leveledUp, source, amount})

function _levelFor(total) {
  let lv = 0;
  for (let i = 0; i < LEVELS.length; i++) if (total >= LEVELS[i]) lv = i;
  return lv;
}

export const xp = {
  total: 0,
  level: 0,

  // Award XP. `source` is an XP_SOURCE value; `note` is optional log text.
  // `once` (a flag name) makes a source pay only the first time (e.g. per biome).
  award(source, { note = '', once = null } = {}) {
    if (once) {
      const key = `xp:${once}`;
      if (flags.has(key)) return 0;        // already paid for this once-source
      flags.set(key);
    }
    const amount = source | 0;
    const prevLevel = this.level;
    this.total += amount;
    this.level = _levelFor(this.total);
    const leveledUp = this.level > prevLevel;
    for (const fn of _xpListeners) fn({ total: this.total, level: this.level, leveledUp, source: amount, note });
    return amount;
  },

  onChange(fn) { _xpListeners.push(fn); },  // HUD updates, level-up flourish, log line
  toNextLevel() {
    const next = LEVELS[this.level + 1];
    return next === undefined ? null : next - this.total;
  },
  _restore(obj) { this.total = obj.total | 0; this.level = _levelFor(this.total); },
};

// Convenience: award XP automatically when a lore flag first flips.
// Call once at boot for each lore flag you want to pay LEARN_LORE.
export function xpOnLore(flagName, note = '') {
  flags.onFirst(flagName, () => xp.award(XP_SOURCE.LEARN_LORE, { note }));
}

/* ------------------------------------------------------------------ *
 * 3. PARTY — one new companion per era; Cardea is the spine
 * ------------------------------------------------------------------ */

// Companions persist here, NOT inside an era module, so they survive seams.
// `persistent: true` => carried through every Portal (Cardea). Others are era-local
// and can be culled by an era on entry if desired.
const _party = []; // [{id, name, persistent, joinedEra, awakened, data}]

export const party = {
  add(companion) {
    if (_party.find((c) => c.id === companion.id)) return false;
    _party.push({ awakened: false, data: {}, ...companion });
    return true;
  },
  has(id) { return _party.some((c) => c.id === id); },
  get(id) { return _party.find((c) => c.id === id) || null; },
  members() { return _party.slice(); },
  persistent() { return _party.filter((c) => c.persistent); },
  // On entering a new era, drop non-persistent companions (Cardea stays).
  cullToPersistent() {
    for (let i = _party.length - 1; i >= 0; i--) if (!_party[i].persistent) _party.splice(i, 1);
  },
  _restore(arr) { _party.length = 0; arr.forEach((c) => _party.push(c)); },
};

// Cardea is engine-level from line one (see LIMINA_I.md §5).
// Awakening companion: recall returns in fragments as the world reveals itself.
export function recruitCardea() {
  const made = party.add({
    id: 'cardea', name: 'Cardea', persistent: true, joinedEra: 1, awakened: false,
    data: { recall: 0 }, // 0..N fragments remembered; tie increments to discovery flags
  });
  if (made) { flags.set(FLAG.CARDEA_JOINED); }
  return party.get('cardea');
}

// Advance Cardea's remembering. Hook this to discovery flags so her memory
// and the player's mental map fill in together.
export function cardeaRecall(note = '') {
  const c = party.get('cardea'); if (!c) return;
  c.data.recall = (c.data.recall || 0) + 1;
  xp.award(XP_SOURCE.LEARN_LORE, { note: note || 'cardea remembers a little more' });
}

/* ------------------------------------------------------------------ *
 * 4. THE VERB — the through-line: FIRE, accreting MOVE etc. per era
 * ------------------------------------------------------------------ */

// The verb-stack stated as data. Each era ENABLES capabilities; they never turn off.
// (era0 ballistic: fire) -> (asteroid: +move) -> (tank: +moving foe) ->
// (limina1: +quests/companions/riddles) -> (dungeon: +inventory/persistence) ...
export const verb = {
  caps: new Set(['fire']),     // fire is present from the very first screen
  enable(...names) { names.forEach((n) => this.caps.add(n)); },
  can(name) { return this.caps.has(name); },
  _restore(arr) { this.caps = new Set(arr); },
};

export const CAP = Object.freeze({
  FIRE: 'fire', MOVE: 'move', HOSTILE_AI: 'hostile_ai',
  QUEST: 'quest', PARTY: 'party', RIDDLE: 'riddle',
  INVENTORY: 'inventory', PERSISTENCE: 'persistence',
});

/* ------------------------------------------------------------------ *
 * 5. SAVE / LOAD — note: in-artifact builds avoid localStorage.
 *    For Claude.ai artifacts use in-memory only. In the kainode repo,
 *    swap _store for window.localStorage or a file. UNDO is a THEME —
 *    later eras deliberately withdraw saving. Keep this swappable.
 * ------------------------------------------------------------------ */

let _store = null; // set to localStorage in the repo; leave null for artifact/in-memory

export function save(slot = 'seed') {
  const blob = {
    flags: flags.all(),
    xp: { total: xp.total },
    party: party.members(),
    verb: [...verb.caps],
  };
  if (_store) { try { _store.setItem('seed:' + slot, JSON.stringify(blob)); } catch (e) {} }
  return blob; // also returned so a seam can hand it forward in-memory
}

export function load(slot = 'seed', blob = null) {
  let data = blob;
  if (!data && _store) { try { data = JSON.parse(_store.getItem('seed:' + slot)); } catch (e) {} }
  if (!data) return false;
  flags._restore(data.flags || {});
  xp._restore(data.xp || { total: 0 });
  party._restore(data.party || []);
  verb._restore(data.verb || ['fire']);
  return true;
}

export function setStore(store) { _store = store; } // setStore(window.localStorage) in repo

/* ------------------------------------------------------------------ *
 * 6. THE PORTAL HANDOFF — Exit goes inward. State flows one layer down.
 *    The Portal is the recursion; give it one home. A seam calls this.
 * ------------------------------------------------------------------ */

export function descendThroughPortal({ enableCaps = [], cullCompanions = true } = {}) {
  const carried = save();              // snapshot the outgoing layer
  if (cullCompanions) party.cullToPersistent(); // Cardea survives; era-local don't
  if (enableCaps.length) verb.enable(...enableCaps); // accrue the new era's verbs
  return carried;                       // hand to seam_N_M -> incoming era init
}
