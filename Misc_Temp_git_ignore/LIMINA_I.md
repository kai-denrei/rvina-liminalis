# LIMINA I — Era 1 Design Doc

> The first proper world. A search for a person who knows, in a land you have to hold in your head.
> Companion to `SEED_HANDOVER.md`. Scope: era 1 only. Reference build: the `topdown` mode in `seed_console.html`, now to be expanded.

**Working title of the era:** *Limina I.* The eras are *Limina* I, II, III… — diegetically the games she plays (and later, makes). The numbering is the staircase; the name is the threshold (限/閾/limen) she crosses at each one.

**Place in the ladder:** the raster tile-world rung (Ultima IV grammar). New primitives: **others, the world's own clock, a world you must remember.** Artifice still fully present (HUD, menu, power button, the corner command-line). UNDO still cheap — death retries. The Portal at the end is the first *Exit-goes-inward*.

---

## 1. Stakes & spine (one sentence each)

- **The lack:** the Wizard knows a Portal *can* be opened, but not *how* — the knowing left with someone.
- **The rumor:** of a person who kept the old ways. And, separately, **rumors of her name** — heard in fragments before you ever find her.
- **The search:** parse the land to locate her — *"north of where the river meets the tallest tree."*
- **The rescue:** she is beset; your arrows save her; she joins.
- **The teaching:** she half-remembers the ritual — **mandrake root, pulled at the full moon** — and roughly *where*. She grows as she travels with you.
- **The hunt:** armed with a **place and a time**, you seek; at full moon the mandrake reveals itself.
- **The ritual:** back at the start, **Cardea + Wizard together** open the Portal.
- **The descent:** *Exit Game?* → you brace to leave → you fall *inward*, into the dungeon. Cardea comes with you.

---

## 2. The world (legible, small, unmapped)

**No mini-map. Memory is the mechanic.** The player builds a mental map the way you did on graph paper in 1985. This is authentic to the era, and it is the era's theme: a game about remembering, that asks you to remember. Do not add a map UI, a waypoint, or a quest arrow. The world must be *readable* instead — few landmarks, strong silhouettes, each unmistakable.

**Design rule:** the world must be small enough to hold in your head and distinct enough to navigate by description. If a location can't be given as a sentence ("the marsh past the forest's east edge"), it's too generic — sharpen its surroundings until it can.

**Biomes (variety you can feel, not a continent):**
- **Plains** — the start; open, safe-ish, the Wizard's ground. Sparse foes.
- **The River** — a single, traceable waterway. It *meets* two things the riddles use: the **Tallest Tree** (inland landmark) and the **Sea** (the world's edge). One river, so "the river" is unambiguous.
- **The Tallest Tree** — a singular, oversized silhouette visible from a distance. The world's primary landmark and the anchor of the first riddle. Make it impossible to confuse with the forest.
- **Forest** — denser, slower, hides things; more foes; the marsh sits at/past its edge.
- **The Sea** — the visible edge of the world. You can walk its shore but not cross it. (The era-0 "the world has an edge. for now." line lives here. The Portal, not the sea, is the way out — and it goes *down*, not across.)

**Camera:** follows the figure; world larger than one screen so exploration is real, but compact enough to memorize in a session. Keep the same amber ground + scanlines (accretion); let **teal** enter here as the second colour — water and the Tallest Tree are natural places for it to first appear (the world learning a new colour as she grows).

---

## 3. The verb, the XP, the wait

### 3A. Arrows (the persisting verb, grown a conscience)
The fire-verb — dot → ship-shot → top-down bolt — becomes a **bow** here. Same code path (reuse the projectile system), era-appropriate skin. Two notes that matter:

- Keep it **abstract and non-gory.** Enemies are shapes; arrows are the dot evolved. This is still a child's world.
- The bow's first *meaningful* use is **saving Cardea**, not hunting. The verb that has only ever struck targets and rocks is, for the first time, aimed at something threatening *a person you've never met*. The verb gains a conscience. Stage the rescue so this lands — she's cornered, you arrive, the arrows are *for her*.

### 3B. "Life gives XP" (the era's quiet thesis)
XP is not the combat-grind here. **Living accrues growth.** The number going up is the first felt instance of the whole project's engine — she is *aging*, and the game rewards being alive in the world, not just fighting in it. Sources, weighted toward life:

| XP source | why it fits |
|----|----|
| First entry into a new biome | discovery is growth |
| Meeting an NPC / hearing a rumor | the world widening |
| Reaching a named landmark | reading the world rightly |
| Learning a lore fragment (a flag flips) | knowing is leveling |
| Surviving an encounter | endurance, not just kills |
| **Waiting through a full-moon cycle** | patience as growth — turns the dead timer into XP |
| Felling a foe | least-weighted; combat is the crude path |

**Design lever (decide early):** weight discovery/encounter XP **≥** combat XP, so the economy teaches that growth comes from living broadly, not from violence. This is a values statement embedded in numbers; it suits the gentle tone and the child protagonist. Keep level-ups light in era 1 (a little more health, a steadier bow) — the *feeling* of the number rising is the point, not a build system.

### 3C. The moon, now spoken (the texture fix)
The full-moon requirement must come from **Cardea's mouth**, not the HUD. Once she teaches it, the wait stops being a timer and becomes *honoring what she told you*. Give the wait texture: Cardea murmurs while you stand at the marsh, the marsh visibly changes as the moon fills, the corner log breathes a line. Patience should feel like presence. (And per 3B, surviving the wait pays XP — waiting is living.)

---

## 4. The riddle of place (adventure, not errand)

The hint is **a riddle parsed by looking**, never a marker. *"North of where the river meets the tallest tree."* To solve it you must have *found* the river, *traced* it, *recognized* the Tallest Tree, and only then go north. The adventure is the reading.

**Fragment the hints** so exploration earns the location piece by piece, rather than one NPC handing you the whole sentence:
- A **fisher by the sea**: saw someone cross upriver — *follow the water inland.*
- A **marker stone** in the plains: half-worn, names "the tree that out-tops the forest."
- A **traveler at the forest edge**: "north of the old tree — but there were rough folk about her."

Each fragment is a flag and a dose of XP. Together they assemble the riddle and the danger waiting at its end. The **rumors of her name** thread the same way: you hear "the one who kept the thresholds… Car—" before you ever meet her, so her name *arrives* the way the くぎり ruby fades onto 閾 — knowledge surfacing in pieces.

---

## 5. Cardea (awakening companion, engine-level)

She does **not** know everything. She is the keeper of thresholds who has *forgotten she is*, recovering fragments as she travels. Her arc inside Limina I:

- **Rescue:** disoriented, beset. Knows scraps of old ritual without knowing *why* she knows them.
- **Traveling together:** her memory returns **as the world reveals itself** — tie her recall beats to discovery progress (flags/XP), so her remembering and your mental-mapping fill in together. This is the spine rhyme: memory returning piece by piece.
- **The teaching:** she gives the ritual *incompletely* — "mandrake, at the full moon… and a place I half-see." More place-hints for the marsh come from her as she remembers more.
- **The ritual:** completing it with the Wizard **stirs** something — a flicker of her hinge-nature. One unsettled line, no more: *"doors. I know doors. why do I know doors?"* The full awakening is later-era work; here you only seed it.

**Implementation, non-negotiable:** Cardea lives in **shared/engine-level state**, not in `era1_tiles.js`. She persists across every seam. Define her there from line one; the other companions (Iolo, etc.) can be era-local. Bake this in before she's load-bearing.

---

## 6. Beat sheet (buildable order)

1. **Arrive** in Limina I (post-seam from era 0). Wizard on the plains at the start tile.
2. **Wizard dialogue:** the Portal can be opened; the *how* is lost; seek the one who kept the old ways. (Flag: `wizard_explained_portal`.) Mission 1: find her.
3. **World opens.** Explore biomes, no map. Sparse foes; arrows; XP from discovery + encounter + survival. Collect **name-rumors** and **location-fragments** from minor NPCs/markers (each a flag + XP).
4. **Solve the riddle:** river → trace inland → Tallest Tree → go north. (Flag: `knows_cardea_region` once fragments assembled.)
5. **The rescue:** north of the landmark, Cardea is beset by a few foes. Arrows save her (the verb's moral turn). She joins. (Flags: `found_cardea`, `cardea_joined`.)
6. **Cardea teaches the ritual:** mandrake + full moon + a half-seen place; more marsh-hints as she remembers. (Flags: `learned_mandrake_when`, `learned_mandrake_where`.)
7. **The hunt:** travel to the marsh (place) and meet the **full moon** (time). Textured wait. Mandrake reveals itself; harvest. (Flag: `has_mandrake`.)
8. **Return** to the start. **Cardea + Wizard** perform the ritual together. Portal opens. (Flags: `ritual_done`, `portal_open`.) Cardea's awakening flicker fires here.
9. **The descent:** *Exit Game?* prompt → the inversion → fall *inward* into the dungeon (era 2). Cardea carries through. Iolo awaits below.

---

## 7. Emotional ledger (new rows for §5 of the bible)

| Mechanic | Developmental beat | Existential payload | The line / image |
|----|----|----|----|
| Bow replaces dot/bolt | the verb matures with her | the same act, new stakes | the arrow that was once a shot at a rock |
| Arrows save Cardea | the verb turned prosocial | you fight *for* someone now | arrows aimed for a stranger, not a target |
| XP from living | growing up is just being alive | every lived moment is growth | the number rising while you only walked |
| No mini-map | holding the world in your head | memory as survival; remembering as love | a land you can lose if you forget it |
| Riddle of place | reading the world, not obeying it | the world is legible if you look | "north of where the river meets the tallest tree" |
| Full moon, taught not shown | the world's clock outranks yours | patience as presence | waiting at the marsh because *she* said so |
| Cardea awakening | a companion who grows beside you | memory returning in pieces | "why do I know doors?" |
| Ritual: Cardea + Wizard | the threshold opens through others' knowledge | you cannot open the door alone | two who remember, finishing what one began |
| Exit → inward | exits stop meaning escape | *where do they go? → deeper* | bracing to leave, and falling down instead |

If a mechanic added during the build can't get a row here, cut it.

---

## 8. Technical notes (for the repo)

- **Flag/state bag, not scattered distance-checks.** Build a small `flags` object now (`wizard_explained_portal`, `knows_cardea_region`, `found_cardea`, `cardea_joined`, `learned_mandrake_when`, `learned_mandrake_where`, `has_mandrake`, `ritual_done`, `portal_open`). Dialogue, gating, and XP awards key off flags. This is era 1's reusable spine — era 2's inventory and every later era reuse it. The sibling of `crt.js`.
- **Cardea in shared state** (see §5). Engine-level. Survives seams.
- **Bow = the era-0 projectile system, reskinned.** Do not fork a new bullet implementation; the *persisting verb* should be visibly the same code path. Accretion in code.
- **XP system:** one counter + a sources table (§3B) + light level effects. Award via flag-flip hooks so discovery XP is automatic, not bolted on per-NPC.
- **Overworld:** tile map, camera-follow, world > screen. Biomes as tile-types; landmarks (Tallest Tree, river-sea confluence) as singular hand-placed features, not procedural — they must be *memorable*, which means *authored*.
- **No map UI.** Resist it during playtesting fatigue; the absence is the design.
- **Moon mechanic:** reuse the current cycle; gate the marsh behind `learned_mandrake_when` so it only matters once Cardea has taught it (diegetic, not a HUD timer).
- **Portal as a shared object** — the *Exit-goes-inward* mechanism that hands state one layer down. Sibling of `crt.js`; every future "Exit Game?" routes through it. The Portal *is* the recursion; one home.
- **Teal introduction:** first real use of the second colour (water, the Tallest Tree). Keep amber primary.
- **Quality floor (unchanged):** reduced-motion, keyboard focus, legible type, full-res canvas + CSS CRT overlay.

---

## 9. Open questions

- **XP weighting** (§3B): pacifist-leaning (discovery > combat) or balanced? Recommend pacifist-leaning.
- **World scale:** how many screens? Small enough to memorize in one session is the constraint, not a number — tune by playtest.
- **Does Cardea fight?** A companion who also looses arrows, or a non-combatant you protect? Non-combatant deepens the "fight *for* her" beat; a fighting Cardea is more useful mechanically. Lean non-combatant in era 1, arming later as she awakens.
- **The rescue's antagonists:** who are the "rough folk"? Keep abstract for now, but they're your first hint that the world has *people who take*, not just wandering shapes — a thread for later eras.
- **Does the Wizard come through the Portal?** Cardea does (through-line). The Wizard finishing the ritual and *staying behind* is a quiet first taste of leaving someone at a threshold. Worth considering.
