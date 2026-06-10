# state.js — the engine spine (how & why)

> Reference module + wiring guide. Build Limina I on this from the start.
> Companion to `SEED_HANDOVER.md` and `LIMINA_I.md`. Vanilla ES, no build.

## The one-line law (promote this to the top of the bible)

**Every era = the previous verbs + one.** The eras are a *verb stack*, not a tech tour:

```
FIRE                       (era 0a — ballistic)
  + MOVE                   (era 0b — asteroid)
  + a foe that hunts YOU   (era 0c — tank attack)   ← enemy gains intent = first fear
  + quests/party/riddles   (era 1  — Limina I)
  + inventory/persistence  (era 2  — dungeon)
  + ...                    (later eras)
```

Capabilities, once enabled, never turn off. That is *accretion, not anthology* expressed as gameplay grammar. `verb.caps` in `state.js` is this law made data.

## What lives in state.js (and why it's engine-level, not per-era)

| Concern | Why it can't live in an era module |
|----|----|
| **flags** | dialogue, gating, and XP all key off them; they must outlive any single era and survive seams |
| **xp** | "life gives XP" — accrued growth *is* her aging; it carries through every Portal |
| **party** | Cardea is the through-line companion; she must persist while era-local companions reset |
| **verb** | the verb stack only ever grows; it's the literal accretion layer |
| **save/load + portal** | the Exit-goes-inward handoff hands state one layer down; one home for the recursion |

## Wiring Limina I (do these in order)

**1. Boot once — register lore→XP and Cardea's recall hooks.**
```js
import { flags, FLAG, xp, XP_SOURCE, xpOnLore,
         recruitCardea, cardeaRecall, verb, CAP } from './state.js';

verb.enable(CAP.MOVE, CAP.HOSTILE_AI, CAP.QUEST, CAP.PARTY, CAP.RIDDLE); // era-1 verbs

// lore flags pay LEARN_LORE automatically the first time they flip
xpOnLore(FLAG.WIZARD_EXPLAINED_PORTAL, 'the portal can be opened');
xpOnLore(FLAG.LEARNED_MANDRAKE_WHEN,   'mandrake wakes at the full moon');
xpOnLore(FLAG.LEARNED_MANDRAKE_WHERE,  'a marsh past the forest');

// Cardea remembers more as the world reveals itself: tie recall to discovery
flags.onFirst(FLAG.KNOWS_CARDEA_REGION, () => cardeaRecall('she half-knows this land'));
```

**2. Award XP from LIVING, not just kills.** Use `once` for one-time sources.
```js
// entering a biome the first time
xp.award(XP_SOURCE.DISCOVER_BIOME, { once: 'biome:forest', note: 'the forest' });
// reaching a landmark
xp.award(XP_SOURCE.REACH_LANDMARK, { once: 'lm:tallest_tree', note: 'the Tallest Tree' });
// meeting someone
xp.award(XP_SOURCE.MEET_NPC, { once: 'npc:fisher', note: 'a fisher by the sea' });
// surviving an encounter / felling a foe
xp.award(XP_SOURCE.SURVIVE_FIGHT);
xp.award(XP_SOURCE.FELL_FOE);              // least-weighted on purpose
// the textured wait pays off
xp.award(XP_SOURCE.WAIT_FULL_MOON, { once: 'moon:1', note: 'you waited for the moon' });
```

**3. Gate the world on flags — never on scattered distance-checks.**
```js
// the riddle is "solved" only once fragments are assembled
if (flags.gateAll(FLAG.HEARD_HER_NAME, 'lm:tallest_tree', 'npc:fisher'))
  flags.set(FLAG.KNOWS_CARDEA_REGION);     // first-set returns true -> react once

// the marsh only matters once Cardea has TAUGHT the timing (diegetic, not HUD)
const marshActive = flags.gateAll(FLAG.LEARNED_MANDRAKE_WHEN, FLAG.LEARNED_MANDRAKE_WHERE);

// the ritual needs Cardea + the root
if (flags.gateAll(FLAG.CARDEA_JOINED, FLAG.HAS_MANDRAKE) /* && near wizard */)
  if (flags.set(FLAG.RITUAL_DONE)) { /* fire Cardea's awakening flicker, open portal */ }
```

**4. Recruit Cardea into shared state (she survives the seam).**
```js
// after the arrows save her
recruitCardea();   // persistent:true — carried through every Portal
```

**5. HUD reacts to XP without knowing where it came from.**
```js
xp.onChange(({ total, level, leveledUp, note }) => {
  drawXpBar(total, level);
  if (note) log('> ' + note);                 // the corner command-line
  if (leveledUp) flourish('you grew');         // light in era 1
});
```

**6. The descent — Exit goes inward.** The seam calls this; it hands state down.
```js
// when the player chooses "Exit Game?" at the open Portal
const carried = descendThroughPortal({
  enableCaps: ['inventory', 'persistence'],    // era 2's new verbs
  cullCompanions: true,                         // Cardea persists; era-1 NPCs don't
});
seam_1_2(carried);   // -> dungeon init, Cardea intact, Iolo waiting below
```

## Two cautions

- **Artifact vs. repo saving.** In Claude.ai artifacts, `localStorage` fails — leave `_store` null (in-memory only) for any throwaway spike. In the kainode repo, `setStore(window.localStorage)` (or a file). Keep it swappable, because **UNDO is a theme**: later eras will *deliberately* withdraw saving (corrupted save in era 4, permadeath in era 5, no save in era 6). The save layer being one swappable seam makes those reveals trivial to stage.
- **Flag names live in `FLAG`, not as raw strings in eras.** Typo-twins (`found_cardea` vs `cardea_found`) are the classic way a flag system rots. Add a per-era block to `FLAG` as you build; never hand-type a flag string in an era module.

## What to build first
The flag bag + XP hooks, before any world geometry. Limina I's riddles, conditional joins, and taught-not-shown moon all sit on this. Geometry is cheap to iterate; a state layer retrofitted after the fact is not.
