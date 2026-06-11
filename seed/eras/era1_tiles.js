// eras/era1_tiles.js — era 1, LIMINA I (LIMINA_I.md): the Tile World grown into a real
// overworld. Mode name unchanged ('topdown'); everything inside rewritten.
//
// THIS FILE IS THE LIMINA I CORE + QUEST LAYER:
//   camera / tiles / movement / bow / foes / hp / XP / HUD — all LIVE below — and the
//   LIMINA_I.md §6 beat sheet (arrive → fragments → rescue → teaching → hunt → ritual
//   → descent), implemented in the "QUEST INTEGRATION POINT" hooks (grep that phrase).
//   Flags drive every gate (FLAG.* only — story is monotonic); the only other ledger
//   the hooks touch is state.js's documented 'xp:' once-key namespace, whose keys
//   ('npc:fisher' etc.) were reserved by the core's XP comments below.
//
// World data lives in era1_world.js (pure, node-importable); this module is the loop:
// camera-follow over a 60x45 tile world (3x3 screens), biomes rendered procedurally
// and cheaply (seeded per-tile hash only — deterministic speckle), and the state.js
// spine for flags/XP/party (no distance-check spaghetti: proximity collapses into
// once-flags the moment it fires).
// The verbs: arrows step tile-by-tile (grid-snapped, the Ultima-IV grammar — operator's
// call; smoother motions come in later games), SPACE looses a bolt-arrow — the SAME
// projectile idiom as every era before it (bolt objects, white blk dots); the persisting
// verb's first meaningful use here will be saving Cardea (the verb gains a conscience).
// Colour law: amber family ground; TEAL only where LIMINA_I.md §2/§8 bless it — water
// and the Tallest Tree (the world learning a new colour). NO minimap, no waypoints,
// no quest arrows: memory is the mechanic; the absence is the design.
// The corner command-line is sacred (state.logLine/getLog). Scanlines/CRT untouched.
import {registerMode,setMode,keys,reduced} from '../engine.js?v=0b3251d9';
import {ctx,clear,txt,cw,blk,drawFigure,drawMini,W,H} from '../crt.js?v=0b3251d9';
// recruitCardea + descendThroughPortal are imported NOW so the quest phase only fills
// function bodies — it must not need to touch this import line.
import {state,flags,FLAG,xp,XP_SOURCE,xpOnLore,party,recruitCardea,cardeaRecall,verb,CAP,descendThroughPortal,logLine,getLog} from '../state.js?v=0b3251d9';
import {AMBER,DIM,DEEP,WHITE,TEAL} from '../palette.js?v=0b3251d9';
import {TILE,COLS,ROWS,GRID,SITES,FOES,ROUGH} from './era1_world.js?v=0b3251d9';

/* ================= boot-once spine wiring (STATE_MODULE.md §1) ================= */
verb.enable(CAP.MOVE,CAP.HOSTILE_AI,CAP.QUEST,CAP.PARTY,CAP.RIDDLE); // era-1 verbs accrete
// Lore flags pay LEARN_LORE automatically the first time they flip. The flags
// themselves are flipped by the quest phase; the hooks are armed here, once.
xpOnLore(FLAG.WIZARD_EXPLAINED_PORTAL,'the portal can be opened');
xpOnLore(FLAG.LEARNED_MANDRAKE_WHEN,'mandrake wakes at the full moon');
xpOnLore(FLAG.LEARNED_MANDRAKE_WHERE,'a marsh past the forest');
// The assembled riddle rides the FLAG, not the proximity hook: however the flag first
// flips (the three fragments, a loaded save, QA), the line lands exactly once. VERBATIM
// (LIMINA_I.md §4 — sacred). And per STATE_MODULE.md §1, discovery feeds her recall:
// if she is already at your side when the region resolves, she remembers a little more.
xpOnLore(FLAG.KNOWS_CARDEA_REGION,'the riddle, assembled'); // knowing is leveling — pays even before she joins
flags.onFirst(FLAG.KNOWS_CARDEA_REGION,()=>{
  logLine('> north of where the river meets the tallest tree.');
  cardeaRecall('she half-knows this land'); // the extra, for when she is already at your side
});
// HUD reacts to XP without knowing where it came from; level-ups stay light in era 1.
xp.onChange(({leveledUp,note})=>{
  if(note)logLine('> '+note);
  if(leveledUp){logLine('> you grew.');hp=Math.max(hp,3);} // §3B 'a little more health' — growing steadies you
});

/* ================= world helpers ================= */
const WPX=COLS*TILE,HPX=ROWS*TILE;
const tileAt=(tx,ty)=>(tx<0||ty<0||tx>=COLS||ty>=ROWS)?'#':GRID[ty][tx];
const walk=(tx,ty)=>{const c=tileAt(tx,ty);return c==='.'||c==='f'||c==='m';};
const seaAt=(tx,ty)=>tileAt(tx,ty)==='~'&&tx>=50;           // the sea, not the river
const sx=s=>(s.x+0.5)*TILE,sy=s=>(s.y+0.5)*TILE;            // site -> world px center
const near=(s,r)=>Math.hypot(fig.x-sx(s),fig.y-sy(s))<r;    // proximity (quest hooks use it too)
function passBox(px,py,r){ // axis-aligned body vs impassable tiles
  return walk(((px-r)/TILE)|0,((py-r)/TILE)|0)&&walk(((px+r)/TILE)|0,((py-r)/TILE)|0)
       &&walk(((px-r)/TILE)|0,((py+r)/TILE)|0)&&walk(((px+r)/TILE)|0,((py+r)/TILE)|0);
}
// deterministic per-tile hash (seeded LCG family — the ONLY randomness in the texture)
function hash(tx,ty,k){
  let s=(Math.imul(tx,374761393)+Math.imul(ty,668265263)+Math.imul(k,69069))>>>0;
  s=Math.imul(s^(s>>>13),1274126177)>>>0;
  return ((s^(s>>>16))>>>0)/4294967296;
}

/* ================= mode state ================= */
let fig,bolts,trail,hp,invT,edgeNoted,exitPrompt,heldDirs,stepCd;
let foes,rough,moonClock,lastMoon,murmurN,joinT,flickerT,wasAtMarsh;
let trav; // the traveler encounter — SEED's first conversation (state machine below)
// the world's own clock — the era-0 moon cycle kept verbatim (PHASE=150).
// Core ticks it; the quest phase reads it (full-moon gate, murmurs, WAIT_FULL_MOON XP).
const PHASE=150;
function moonIdx(){return Math.floor(moonClock/PHASE)%8;}
function moonIllum(){return 1-Math.abs(moonIdx()-4)/4;}
function moonFull(){return moonIdx()===4;}
const taught=()=>flags.gateAll(FLAG.LEARNED_MANDRAKE_WHEN,FLAG.LEARNED_MANDRAKE_WHERE);

function init(){
  fig={x:sx(SITES.start),y:sy(SITES.start),dir:0};
  trail=[];bolts=[];hp=3;invT=0;edgeNoted=false;exitPrompt=false;heldDirs=[];stepCd=0;
  moonClock=0;lastMoon=0;murmurN=0;joinT=0;flickerT=0;wasAtMarsh=false;
  foes=FOES.map((f,i)=>({x:sx(f),y:sy(f),alive:true,s:(i*7919+101)>>>0,hd:hash(i,7,9)*6.283,hdT:40+i*17}));
  // the rough folk stay down once Cardea is found (flags survive re-entry; geometry re-derives)
  rough=ROUGH.map((r,i)=>({x:sx(r),y:sy(r),hx:sx(r),hy:sy(r),alive:!flags.has(FLAG.FOUND_CARDEA),s:(i*104729+7)>>>0,hd:0,hdT:30}));
  // the traveler: 'done' (silent scenery) if his once-key was ever paid; else the
  // conversation re-arms on era entry. Hostility is per-session, like the foes — on
  // re-entry mid-grudge (once-key unpaid) the modal re-offers; accepted, documented.
  trav={x:sx(SITES.traveler),y:sy(SITES.traveler),hx:sx(SITES.traveler),hy:sy(SITES.traveler),
        state:flags.has('xp:npc:traveler')?'done':'idle',stage:0,sel:0,hp:3,hitT:0,alive:true,
        s:31337,hd:0,hdT:30,dismissed:false};
  logLine('> '+state.year); // arrival: the year, as every era logs it
}

/* ================= movement (grid-snapped tile steps — Ultima-IV grammar) =================
 * The figure lives on tile CENTERS. One tile per cadence tick while a direction is held
 * (first press steps immediately); 4-direction only, most recently pressed wins.
 * Operator's call (bible §6 open question, now closed): blocky now, smoother in later games. */
const STEP_T=9;                                          // frames between held-key steps
const DIRS=[['ArrowLeft',-1,0],['ArrowRight',1,0],['ArrowUp',0,-1],['ArrowDown',0,1]];
function bumpEdge(){if(!edgeNoted){edgeNoted=true;logLine('> the world has an edge. for now.');}}
function snapStep(nx,ny){ // commit one tile step: snap to center, record for followers
  fig.x=(nx+0.5)*TILE;fig.y=(ny+0.5)*TILE;
  trail.push({x:fig.x,y:fig.y});if(trail.length>60)trail.shift();
}
function tryStep(dx,dy){ // one attempted player step; fig.dir turns even when blocked
  fig.dir=Math.atan2(dy,dx);
  const tx=(fig.x/TILE)|0,ty=(fig.y/TILE)|0,nx=tx+dx,ny=ty+dy;
  if(nx<0||ny<0||nx>=COLS||ny>=ROWS){bumpEdge();return;} // the world's true border
  if(!walk(nx,ny)){if(seaAt(nx,ny))bumpEdge();return;}   // the shore IS the edge (bible continuity)
  snapStep(nx,ny);
}

/* ================= the bow (the persisting verb — same bolt idiom) ================= */
function fire(){bolts.push({x:fig.x,y:fig.y,vx:Math.cos(fig.dir)*6,vy:Math.sin(fig.dir)*6,life:120});}
function tickBolts(){
  for(const b of bolts){
    b.x+=b.vx;b.y+=b.vy;b.life--;
    for(const f of foes)if(f.alive&&Math.hypot(b.x-f.x,b.y-f.y)<13){f.alive=false;b.life=0;xp.award(XP_SOURCE.FELL_FOE);break;}
    if(b.life>0)for(const f of rough)if(f.alive&&Math.hypot(b.x-f.x,b.y-f.y)<13){f.alive=false;b.life=0;xp.award(XP_SOURCE.FELL_FOE);break;}
    // the traveler is STRONG: 3 hits — and he is never felled, he yields (no FELL_FOE)
    if(b.life>0&&trav.state==='hostile'&&Math.hypot(b.x-trav.x,b.y-trav.y)<13){
      b.life=0;trav.hitT=14;
      if(--trav.hp<=0)travYield();
    }
  }
  bolts=bolts.filter(b=>b.life>0&&b.x>0&&b.x<WPX&&b.y>0&&b.y<HPX);
}

/* ================= foes (gentle world: wander, chase, 1-arrow kills) ================= */
function rng(a){a.s=(Math.imul(a.s,1664525)+1013904223)>>>0;return a.s/4294967296;}
function actorMove(a,vx,vy){
  const r=8;let m=false;
  if(passBox(a.x+vx,a.y,r)){a.x+=vx;m=true;}
  if(passBox(a.x,a.y+vy,r)){a.y+=vy;m=true;}
  return m;
}
function hitPlayer(src){
  hp--;invT=70;
  if(hp>0){ // knockback: a 1-tile shove away from the hit, nearest cardinal; skipped if unwalkable
    const ang=Math.atan2(fig.y-src.y,fig.x-src.x);
    const kdx=Math.abs(Math.cos(ang))>=Math.abs(Math.sin(ang))?(Math.cos(ang)<0?-1:1):0;
    const kdy=kdx?0:(Math.sin(ang)<0?-1:1);
    const tx=(fig.x/TILE)|0,ty=(fig.y/TILE)|0;
    if(walk(tx+kdx,ty+kdy))snapStep(tx+kdx,ty+kdy);     // facing (fig.dir) is not the shove's to change
    xp.award(XP_SOURCE.SURVIVE_FIGHT,{once:'fight:first',note:'struck, and still standing'});
  }
  else{ // UNDO is cheap in era 1: death is a relocation; flags and XP are KEPT
    fig.x=sx(SITES.start);fig.y=sy(SITES.start);trail.length=0;
    hp=3;invT=90;bolts=[];
    logLine('> you wake where you began.');
  }
}
function tickFoe(f,sight,chaseSp,wanderSp,tether){
  if(!f.alive)return;
  const d=Math.hypot(fig.x-f.x,fig.y-f.y);
  let ang,sp;
  if(d<sight){ang=Math.atan2(fig.y-f.y,fig.x-f.x);sp=chaseSp;}      // chase when player is near
  else if(tether&&Math.hypot(f.hx-f.x,f.hy-f.y)>3*TILE){ang=Math.atan2(f.hy-f.y,f.hx-f.x);sp=wanderSp;}
  else{
    if(--f.hdT<=0){f.hdT=70+(rng(f)*90|0);f.hd=rng(f)*6.283;}        // seeded per-foe drift
    ang=f.hd;sp=wanderSp;
  }
  if(!actorMove(f,Math.cos(ang)*sp,Math.sin(ang)*sp))f.hdT=0;
  if(d<16&&invT<=0)hitPlayer(f);
}

/* ================= life gives XP — the geographic awards (core) ================= */
// Discovery/landmark XP is automatic and flag-keyed (STATE_MODULE.md §2). MEET_NPC,
// WAIT_FULL_MOON and the lore awards fire inside the quest hooks (their once-keys are
// reserved: 'npc:fisher' / 'npc:marker' / 'npc:traveler' / 'moon:1').
function lifeTick(){
  const ch=tileAt((fig.x/TILE)|0,(fig.y/TILE)|0);
  if(ch==='.')xp.award(XP_SOURCE.DISCOVER_BIOME,{once:'biome:plains',note:'the plains'});
  else if(ch==='f')xp.award(XP_SOURCE.DISCOVER_BIOME,{once:'biome:forest',note:'the forest'});
  else if(ch==='m')xp.award(XP_SOURCE.DISCOVER_BIOME,{once:'biome:marsh',note:'the marsh'});
  if(near(SITES.tree,2.5*TILE))xp.award(XP_SOURCE.REACH_LANDMARK,{once:'lm:tallest_tree',note:'the Tallest Tree'});
  if(near(SITES.ford,1.2*TILE))xp.award(XP_SOURCE.REACH_LANDMARK,{once:'lm:ford',note:'the ford'});
  {const tx=(fig.x/TILE)|0,ty=(fig.y/TILE)|0;
   for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)
     if(seaAt(tx+ox,ty+oy)){xp.award(XP_SOURCE.REACH_LANDMARK,{once:'lm:sea',note:'the sea'});oy=2;break;}}
}

/* =====================================================================
 * QUEST INTEGRATION POINTS — the LIMINA_I.md §6 beat sheet, live.
 * Flags drive everything: every gate is a FLAG.* check or state.js's
 * 'xp:' once-key ledger (the keys reserved by the core XP comments
 * above). Proximity collapses into once-flags the moment it fires —
 * no distance-check spaghetti survives past a beat's first frame.
 * ===================================================================== */

// beat 1 — the wizard's opener when approached: the portal can be opened, the how is
// lost, seek the one who kept the old ways. WIZARD_EXPLAINED_PORTAL pays LEARN_LORE
// via the xpOnLore armed at boot; its note ('the portal can be opened') closes the speech.
function questWizardHook(){
  if(flags.has(FLAG.WIZARD_EXPLAINED_PORTAL)||!near(SITES.wizard,2*TILE))return;
  logLine('> wizard: a door stood here once. it can stand again.');
  logLine('> wizard: but the how of it left with someone.');
  logLine('> wizard: seek the one who kept the old ways.');
  flags.set(FLAG.WIZARD_EXPLAINED_PORTAL);
}

// beat 2 — the three fragments (fisher / marker stone / traveler): fisher and marker
// are proximity -> 2 short lines + MEET_NPC, paid once through the reserved once-keys.
// The TRAVELER's fragment is no longer an auto-line: it is SEED's first conversation
// (travHook below), which pays the same 'npc:traveler' once-key by either road.
// The name-rumor threads HEARD_HER_NAME at the fisher; all three keys paid ->
// KNOWS_CARDEA_REGION + the assembled riddle, VERBATIM (LIMINA_I.md §4 — sacred).
function questFragmentsHook(){
  const frag=(site,key,l1,l2)=>{
    if(!near(site,1.5*TILE)||xp.award(XP_SOURCE.MEET_NPC,{once:key})===0)return false;
    logLine(l1);logLine(l2);return true;
  };
  if(frag(SITES.fisher,'npc:fisher',
    '> fisher: someone crossed here, going upriver.',
    '> ...the one who kept the thresholds. Car—something.'))flags.set(FLAG.HEARD_HER_NAME);
  frag(SITES.marker,'npc:marker',
    '> a half-worn stone. you make out:',
    '> "...the tree that out-tops the forest..."');
  // assembled? ('xp:' is the once-key ledger state.js keeps for the awards above;
  // 'xp:npc:traveler' is paid by the conversation, not here).
  // The riddle line itself rides the flag's onFirst hook, armed at boot.
  if(!flags.has(FLAG.KNOWS_CARDEA_REGION)
     &&flags.gateAll('xp:npc:fisher','xp:npc:marker','xp:npc:traveler'))
    flags.set(FLAG.KNOWS_CARDEA_REGION);
}

/* ================= the traveler — SEED's first CONVERSATION =================
 * 'friend or foe!' — a canvas modal (crt txt/blk only, amber family), two roads
 * that converge on the same truth (the illusion-of-choice motif, bible §2D):
 * north of the oldest tree, past the ford. Friend talks his way there; Foe
 * fights a STRONG traveler (3 bolt hits) who YIELDS — and says the same words.
 * Either road pays MEET_NPC once-key 'npc:traveler' (riddle assembly intact).
 * While the modal is open the world's actors and quest hooks pause; moonClock
 * keeps ticking — the world's clock outranks everyone. */
const TRAV_CHOICES=[['foe!','friend, friend.'],
                    ['i seek to open the portal','the wizard spoke of a mystical lady']];
const TRAV_PROMPTS=[['traveler: friend or foe!'],
                    ['traveler: greetings. forgive me —','the woods are full of dangers.']];
function travGeom(){ // one geometry for draw + click hit-testing (engine's 800x600 coords)
  const px=120,pw=560,py=170;
  const prompt=TRAV_PROMPTS[trav.stage],choices=TRAV_CHOICES[trav.stage];
  const cy=py+26+prompt.length*24+16;          // first choice row
  const rh=38;                                  // row height (generous tap target)
  return {px,pw,py,cy,rh,prompt,choices,ph:cy-py+choices.length*rh+14};
}
function travPayload(){ // BOTH roads end here — the same words, the same key
  logLine('> traveler: north of the oldest tree, past the ford —');
  logLine('> traveler: but there were rough folk about her.');
  xp.award(XP_SOURCE.MEET_NPC,{once:'npc:traveler'});
}
function travYield(){ // defeated, not killed: he yields, tells the truth, goes home
  trav.state='done';
  logLine('> traveler: enough — enough.');
  travPayload();
}
function travChoose(){ // the modal lives big on screen; the log records it (sacred console)
  if(trav.stage===0){
    if(trav.sel===0){ // Foe! — combat ensues
      logLine('> traveler: prepare to die!');
      trav.state='hostile';
    }else{            // Friend, friend.
      logLine('> you: greetings, fellow traveler.');
      logLine('> traveler: greetings. forgive me —');
      logLine('> ...the woods are full of dangers.');
      trav.stage=1;trav.sel=0;
    }
    return;
  }
  // second pair — two roads, one truth
  if(trav.sel===0){
    logLine('> you: i seek to open the portal.');
    logLine("> traveler: the portal? that is wizard's business. but the lady —");
  }else{
    logLine('> you: the wizard spoke of a mystical lady.');
    logLine('> traveler: the lady. yes. i saw her.');
  }
  trav.state='done';
  travPayload();
}
function travHook(){ // trigger: approach while unpaid, peaceable, and not freshly dismissed
  if(trav.state!=='idle')return;
  if(flags.has('xp:npc:traveler')){trav.state='done';return;}
  if(Math.hypot(fig.x-trav.x,fig.y-trav.y)>=1.5*TILE){trav.dismissed=false;return;}
  if(trav.dismissed)return;                    // Escape was polite; leaving re-arms
  trav.state='modal';trav.stage=0;trav.sel=0;
  logLine('> traveler: friend or foe!');
}
function travTick(){ // his body, per state (the modal itself freezes him)
  if(trav.hitT>0)trav.hitT--;
  if(trav.state==='hostile')tickFoe(trav,7*TILE,1.8,.5,true);       // STRONG: faster than rough folk
  else if(trav.state==='done'&&Math.hypot(trav.x-trav.hx,trav.y-trav.hy)>4){
    const ang=Math.atan2(trav.hy-trav.y,trav.hx-trav.x);            // hostility over: he walks home
    actorMove(trav,Math.cos(ang)*.8,Math.sin(ang)*.8);
  }
}
function travModalKey(e){ // swallows ALL keys while open (the world is paused)
  if(trav.state!=='modal')return false;
  const n=TRAV_CHOICES[trav.stage].length;
  if(e.key==='ArrowUp')trav.sel=(trav.sel+n-1)%n;
  else if(e.key==='ArrowDown')trav.sel=(trav.sel+1)%n;
  else if(e.key===' '||e.key==='Enter')travChoose();
  else if(e.key==='Escape'){trav.state='idle';trav.dismissed=true;} // polite close
  return true;
}
function travClick(x,y){ // pointer bus: tap a row to choose it (mobile path)
  if(trav.state!=='modal')return false;
  const g=travGeom();
  if(x>=g.px&&x<=g.px+g.pw)
    for(let i=0;i<g.choices.length;i++){
      const yy=g.cy+i*g.rh;
      if(y>=yy-6&&y<yy+g.rh-6){trav.sel=i;travChoose();return true;}
    }
  return true; // taps elsewhere are swallowed too — the modal owns the pointer
}
function travDrawModal(){ // canvas-only: dim backdrop, amber-bordered panel, '>' cursor
  if(trav.state!=='modal')return;
  const g=travGeom();
  ctx.fillStyle='#080604';ctx.globalAlpha=.72;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  ctx.fillStyle='#080604';ctx.globalAlpha=.92;ctx.fillRect(g.px,g.py,g.pw,g.ph);ctx.globalAlpha=1;
  ctx.strokeStyle=AMBER;ctx.lineWidth=2;ctx.globalAlpha=.9;ctx.strokeRect(g.px,g.py,g.pw,g.ph);ctx.globalAlpha=1;
  for(let i=0;i<g.prompt.length;i++)txt(g.prompt[i],g.px+26,g.py+22+i*24,AMBER,.95,16);
  for(let i=0;i<g.choices.length;i++){
    const yy=g.cy+i*g.rh,on=i===trav.sel;
    if(on)txt('>',g.px+26,yy,AMBER,.95,16);
    txt(g.choices[i],g.px+48,yy,on?AMBER:DIM,on?.95:.8,16);
  }
}

// beat 3 — the rescue: all three rough folk down -> recruitCardea() (engine-level —
// she survives every seam; CARDEA_JOINED is set inside it), FOUND_CARDEA, her join
// lines (disoriented, knows scraps). From here she FOLLOWS the recorded trail
// (questDraw) and does NOT fight — the arrows were for her, not from her.
function questRescueHook(){
  if(flags.has(FLAG.FOUND_CARDEA)||rough.some(r=>r.alive))return;
  flags.set(FLAG.FOUND_CARDEA);
  recruitCardea();
  joinT=1800;                                    // ~30s to the teaching (beat 4)
  logLine('> she steadies herself among the fallen.');
  logLine('> cardea: thresholds. i kept... something. i forget what.');
  logLine('> Cardea has joined your party!');    // the join idiom, kept
}

// beat 4 — the teaching (~30s after joining via joinT, or at the wizard, whichever
// first): mandrake, full moon, a half-seen place. LEARNED_MANDRAKE_WHEN +
// LEARNED_MANDRAKE_WHERE (the armed xpOnLore notes follow her words into the log);
// the moon HUD exists only from here — taught, not shown.
function questTeachingHook(){
  if(!flags.has(FLAG.FOUND_CARDEA)||flags.has(FLAG.LEARNED_MANDRAKE_WHEN))return;
  if(joinT<=0)joinT=1800;                        // re-entry with her joined: re-arm the wait
  joinT--;
  if(joinT>0&&!near(SITES.wizard,2*TILE))return;
  logLine('> cardea: mandrake. pulled when the moon is whole.');
  logLine('> cardea: i half-see the place — reeds, east past the forest.');
  flags.set(FLAG.LEARNED_MANDRAKE_WHEN);
  flags.set(FLAG.LEARNED_MANDRAKE_WHERE);
}

// beat 5 — the hunt: the old marsh harvest exactly (full moon window, the PHASE=150
// cycle, the old lines), gated on the taught flags. While waiting AT the marsh
// pre-full-moon Cardea murmurs one line per moon-phase change (two rotating lines);
// WAIT_FULL_MOON pays once ('moon:1') when the full moon arrives while you stand there.
function questMarshHook(){
  if(!taught()){wasAtMarsh=false;return;}
  if(!near(SITES.marsh,1.5*TILE)){wasAtMarsh=false;return;}
  const full=moonFull(),root=flags.has(FLAG.HAS_MANDRAKE);
  if(!full&&!root&&!wasAtMarsh)logLine('> the marsh is barren. wait for the full moon.');
  if(!full&&!root&&wasAtMarsh&&moonIdx()!==lastMoon&&flags.has(FLAG.FOUND_CARDEA)){
    const MURMURS=['> cardea: the moon turns. stay a while.',
                   '> cardea: nearly whole now. i remember waiting, once.'];
    logLine(MURMURS[murmurN%2]);murmurN++;
  }
  if(full&&wasAtMarsh&&lastMoon===3)
    xp.award(XP_SOURCE.WAIT_FULL_MOON,{once:'moon:1',note:'you waited for the moon'});
  if(full&&!root){
    flags.set(FLAG.HAS_MANDRAKE);
    logLine('> mandrake root, pulled under the full moon.');  // the old line, kept
  }
  wasAtMarsh=true;
}

// beat 6 — the ritual, wizard-anchored: Cardea + the root at the wizard ->
// RITUAL_DONE + PORTAL_OPEN (the portal frame above renders bigger + lit on the flag),
// and her awakening flicker fires ONCE — flickerT drives the alpha in questDraw,
// the line is VERBATIM (LIMINA_I.md §5 — sacred).
function questRitualHook(){
  if(flags.has(FLAG.RITUAL_DONE))return;
  if(!flags.gateAll(FLAG.CARDEA_JOINED,FLAG.HAS_MANDRAKE))return;
  if(!near(SITES.wizard,2*TILE))return;
  flags.set(FLAG.RITUAL_DONE);
  flags.set(FLAG.PORTAL_OPEN);
  logLine('> the wizard takes the root. cardea takes his hand.');
  logLine('> two who remember, finishing what one began.');
  logLine('> the portal is open.');              // the old line, kept
  flickerT=140;                                  // her hinge-nature stirs — once
  logLine('> doors. I know doors. why do I know doors?');
}

// beat 7 — the portal: PORTAL_OPEN + standing at SITES.portal -> exitPrompt and the
// existing 'EXIT GAME?  Y' idiom, byte-for-byte (steady alpha under reduced motion).
function questPortalHook(camX,camY,t){
  exitPrompt=flags.has(FLAG.PORTAL_OPEN)&&near(SITES.portal,26);
  if(!exitPrompt)return;
  const msg='EXIT GAME?  Y',x=sx(SITES.portal)-camX,y=sy(SITES.portal)-camY;
  txt(msg,x-24-cw(msg),y-8,AMBER,reduced?.85:.5+.5*Math.sin(t/10),15);
}

// quest-only visuals: before FOUND_CARDEA she stands beset at the rescue clearing
// (drawMini, AMBER, distressed flicker — steady under reduced motion); after she joins
// she follows the trail like the old companions did; flickerT>0 is the awakening.
function questDraw(camX,camY,t){
  if(!flags.has(FLAG.FOUND_CARDEA)){
    const x=sx(SITES.rescue)-camX,y=sy(SITES.rescue)-camY;
    if(x>-20&&x<W+20&&y>-20&&y<H+20)
      drawMini(x,y,AMBER,reduced?.75:.45+.4*Math.sin(t/6));
    return;
  }
  const idx=trail.length-1-2;                    // ~two tile-steps behind — the old follow idiom
  if(idx<0)return;
  const p=trail[idx];
  const a=(flickerT>0&&!reduced)?.25+.75*Math.abs(Math.sin(t/3)):.95;
  drawMini(p.x-camX,p.y-camY,AMBER,a);
}

// beat 7 — keys: Y / space while exitPrompt confirms; the descent hands state one
// layer down (Cardea persists; era-1 companions are GONE — she replaced them).
function questKey(e){
  if(exitPrompt&&(e.key==='y'||e.key==='Y'||e.key===' ')){
    descendThroughPortal({enableCaps:[CAP.INVENTORY,CAP.PERSISTENCE],cullCompanions:true});
    setMode('seam_1_2');
    return true;
  }
  return false;
}

/* ================= rendering ================= */
let marshLit=false; // full-moon reed glow, computed per frame, read by drawTile
function drawTile(ch,tx,ty,px,py,t){
  switch(ch){
    case '.':{ // plains: sparse DEEP speckle (seeded — deterministic)
      const h=hash(tx,ty,1);
      if(h<0.3){
        blk(px+4+hash(tx,ty,2)*30,py+4+hash(tx,ty,3)*30,DEEP,.4,2);
        if(h<0.1)blk(px+34-hash(tx,ty,2)*26,py+30-hash(tx,ty,3)*22,DEEP,.3,2);
      }
      // the ford reads as stepping stones in the river line
      if(ty===SITES.ford.y&&(tx===SITES.ford.x||tx===SITES.ford.x+1)){
        blk(px+7,py+16,DEEP,.9,6);blk(px+19,py+22,DEEP,.9,6);blk(px+30,py+14,DEEP,.9,6);
      }
      break;}
    case 'f':{ // forest: DIM tree-glyphs, drawn not font
      const ox=px+9+hash(tx,ty,4)*20,oy=py+12+hash(tx,ty,5)*16,s2=9+hash(tx,ty,6)*6;
      ctx.strokeStyle=DIM;ctx.lineWidth=2;ctx.globalAlpha=.55;
      ctx.beginPath();ctx.moveTo(ox,oy-s2);ctx.lineTo(ox-s2*.62,oy+s2*.45);ctx.lineTo(ox+s2*.62,oy+s2*.45);ctx.closePath();ctx.stroke();
      ctx.beginPath();ctx.moveTo(ox,oy+s2*.45);ctx.lineTo(ox,oy+s2*.45+5);ctx.stroke();
      ctx.globalAlpha=1;
      break;}
    case '~':{ // water: TEAL-tinted strokes, gentle phase shimmer (static under reduced motion)
      ctx.fillStyle='#06100e';ctx.fillRect(px,py,TILE,TILE);
      const a=.15+.1*Math.sin(tx*1.7+ty*2.3+(reduced?0:t/34));
      ctx.strokeStyle=TEAL;ctx.lineWidth=1;ctx.globalAlpha=Math.max(.08,a);
      const wy=py+10+hash(tx,ty,7)*16;
      ctx.beginPath();ctx.moveTo(px+6,wy);ctx.lineTo(px+19,wy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(px+22,wy+9);ctx.lineTo(px+34,wy+9);ctx.stroke();
      ctx.globalAlpha=1;
      break;}
    case 'm':{ // marsh: the reed idiom, brightening under the taught full moon
      ctx.strokeStyle=marshLit?AMBER:DIM;ctx.lineWidth=2;ctx.globalAlpha=marshLit?.85:.55;
      const bx=px+8+hash(tx,ty,8)*12;
      for(let i=0;i<3;i++){const rx=bx+i*8;ctx.beginPath();ctx.moveTo(rx,py+30);ctx.lineTo(rx,py+14-(i%2?4:0));ctx.stroke();}
      ctx.globalAlpha=1;
      break;}
    case 'r':{ // rock: chunky, impassable
      ctx.fillStyle=DEEP;ctx.globalAlpha=.9;
      ctx.fillRect(px+6,py+14,28,20);ctx.fillRect(px+12,py+6,18,10);
      ctx.globalAlpha=.5;ctx.strokeStyle=DIM;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(px+6,py+14);ctx.lineTo(px+34,py+14);ctx.stroke();
      ctx.globalAlpha=1;
      break;}
    // 'T' ground is bare — the Tallest Tree is drawn after the tile pass, 3 tiles tall
  }
}
function drawTree(camX,camY,t){ // the world's primary landmark — unmistakable when on screen
  const bx=sx(SITES.tree)-camX,by=(SITES.tree.y+1)*TILE-camY-3;
  if(bx<-140||bx>W+140||by<-40||by>H+170)return;
  const sway=reduced?0:Math.sin(t/90)*2;
  ctx.strokeStyle=DIM;ctx.lineWidth=6;                                   // trunk
  ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx,by-86);ctx.stroke();
  ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(bx-11,by);ctx.lineTo(bx-3,by-26);ctx.moveTo(bx+11,by);ctx.lineTo(bx+3,by-26);ctx.stroke();
  ctx.fillStyle='#0b1a17';                                                // crown silhouette
  for(const [yy,ww,hh] of [[-78,56,34],[-100,42,30],[-118,28,26]]){
    ctx.beginPath();ctx.moveTo(bx+sway,by+yy-hh);ctx.lineTo(bx-ww/2+sway*.5,by+yy);ctx.lineTo(bx+ww/2+sway*.5,by+yy);ctx.closePath();
    ctx.globalAlpha=.92;ctx.fill();
    ctx.strokeStyle=TEAL;ctx.lineWidth=2;ctx.globalAlpha=.75;ctx.stroke();// TEAL crown — sanctioned (LIMINA_I.md §8)
  }
  ctx.globalAlpha=1;
  blk(bx+sway-1,by-146,TEAL,.9,3);                                        // the tip — elsewhere's colour
}
function drawMoon(cx,cy){ // the moon HUD — only ever drawn once the moon has been TAUGHT
  const il=moonIllum(),full=moonFull();
  if(full){ctx.globalAlpha=.5;ctx.fillStyle=AMBER;ctx.beginPath();ctx.arc(cx,cy,20,0,6.283);ctx.fill();ctx.globalAlpha=1;}
  ctx.strokeStyle=DIM;ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,12,0,6.283);ctx.stroke();
  ctx.fillStyle=full?AMBER:DIM;ctx.globalAlpha=full?1:.8;ctx.beginPath();ctx.arc(cx,cy,12*il,0,6.283);ctx.fill();ctx.globalAlpha=1;
  txt(full?'FULL MOON':'moon',cx-(full?30:18),cy+16,full?AMBER:DEEP,full?.9:.7,11);
}
function drawFoeShape(px,py,big){ // abstract chunky forms, DIM, amber eyes — a child's world
  ctx.fillStyle=DIM;ctx.globalAlpha=.8;
  if(big){ctx.fillRect(px-7,py-14,14,22);ctx.fillRect(px-11,py-6,22,8);}
  else{ctx.fillRect(px-8,py-5,16,11);ctx.fillRect(px-5,py-11,10,7);}
  ctx.globalAlpha=1;ctx.fillStyle=AMBER;
  if(big){ctx.fillRect(px-4,py-11,2,3);ctx.fillRect(px+2,py-11,2,3);}
  else{ctx.fillRect(px-4,py-9,2,2);ctx.fillRect(px+2,py-9,2,2);}
}
function pips(x,y,n){ // hp — shapes, not text (txt stays sacred for words)
  for(let i=0;i<3;i++){
    if(i<n){ctx.globalAlpha=.95;ctx.fillStyle=AMBER;ctx.fillRect(x+i*11,y,8,11);}
    else{ctx.globalAlpha=.8;ctx.strokeStyle=DEEP;ctx.lineWidth=1;ctx.strokeRect(x+i*11+.5,y+.5,7,10);}
  }
  ctx.globalAlpha=1;
}

/* ================= the mode ================= */
function drawTop(t){
  clear();
  moonClock++;                       // the world's own clock never stops — even mid-conversation
  if(invT>0)invT--;
  if(flickerT>0)flickerT--;          // quest phase arms this (Cardea's awakening flicker)

  // the traveler's modal pauses the world's ACTORS and quest hooks (moonClock above
  // already ticked — the world's clock outranks everyone); rendering continues below.
  const paused=trav.state==='modal';

  if(!paused){
  // ---- movement (grid steps: held arrows step one tile per cadence tick) ----
  for(const [k] of DIRS){                          // press-order ledger: newest held wins
    const i=heldDirs.indexOf(k);
    if(keys[k]){if(i<0)heldDirs.push(k);}
    else if(i>=0)heldDirs.splice(i,1);
  }
  if(stepCd>0)stepCd--;
  if(heldDirs.length){
    if(stepCd<=0){
      const d=DIRS.find(d=>d[0]===heldDirs[heldDirs.length-1]);
      tryStep(d[1],d[2]);                          // blocked attempts still spend the tick
      stepCd=STEP_T;
    }
  }else stepCd=0;                                  // released: the next press steps at once

  // ---- simulation ----
  for(const f of foes)tickFoe(f,5*TILE,1.25,.45,false);    // chase within ~5 tiles
  for(const f of rough)tickFoe(f,7*TILE,1.6,.5,true);      // rough folk: chase on sight, faster
  travTick();                                              // the traveler's body, per state
  tickBolts();
  lifeTick();

  // ---- the quest (flags drive everything; bodies are the next phase's) ----
  questWizardHook();
  questFragmentsHook();
  travHook();                        // the conversation trigger (replaces his auto-fragment)
  questRescueHook();
  questTeachingHook();
  questMarshHook();
  questRitualHook();
  lastMoon=moonIdx();                // phase-change edge for the marsh murmurs
  }

  // ---- camera ----
  const camX=Math.max(0,Math.min(WPX-W,fig.x-W/2));
  const camY=Math.max(0,Math.min(HPX-H,fig.y-H/2));

  // ---- world: visible tiles only ----
  marshLit=taught()&&moonFull()&&!flags.has(FLAG.HAS_MANDRAKE);
  const tx0=(camX/TILE)|0,ty0=(camY/TILE)|0;
  const tx1=Math.min(COLS-1,((camX+W)/TILE)|0),ty1=Math.min(ROWS-1,((camY+H)/TILE)|0);
  for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++)
    drawTile(GRID[ty][tx],tx,ty,tx*TILE-camX,ty*TILE-camY,t);
  // the faint tile grid — era-1's signature, kept (seam 1→2 folds it into walls)
  ctx.strokeStyle=DEEP;ctx.lineWidth=1;ctx.globalAlpha=.22;
  for(let x=-(camX%TILE);x<=W;x+=TILE){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=-(camY%TILE);y<=H;y+=TILE){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.globalAlpha=1;
  if(marshLit){const mx=sx(SITES.marsh)-camX,my=sy(SITES.marsh)-camY;
    ctx.globalAlpha=.18;ctx.fillStyle=AMBER;ctx.beginPath();ctx.arc(mx,my,30,0,6.283);ctx.fill();ctx.globalAlpha=1;}
  drawTree(camX,camY,t);

  // ---- the portal frame (collapsed beside the wizard; bigger + lit once PORTAL_OPEN) ----
  // Pure rendering of flag state. Opening it, the prompt, and the descent are the
  // quest phase's (questPortalHook / questKey).
  {const x=sx(SITES.portal)-camX,y=sy(SITES.portal)-camY,open=flags.has(FLAG.PORTAL_OPEN);
   const pw=open?32:24,ph=open?44:32;
   ctx.strokeStyle=open?AMBER:DIM;ctx.lineWidth=2;ctx.strokeRect(x-pw/2,y-ph/2,pw,ph);
   if(!open)txt('?',x-4,y-8,DIM,.6,15);
   else{ctx.globalAlpha=.25;ctx.fillStyle=AMBER;ctx.fillRect(x-pw/2,y-ph/2,pw,ph);ctx.globalAlpha=1;}}
  questPortalHook(camX,camY,t);

  // ---- people (scenery is core; their words are the quest phase's) ----
  {const wx=sx(SITES.wizard)-camX,wy=sy(SITES.wizard)-camY;
   drawFigure(wx,wy,1.2,.95);
   ctx.strokeStyle=AMBER;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(wx-6,wy-10);ctx.lineTo(wx,wy-20);ctx.lineTo(wx+6,wy-10);ctx.stroke();
   txt('wizard',wx-22,wy+20,DEEP,.7,11);}
  {const fx=sx(SITES.fisher)-camX,fy=sy(SITES.fisher)-camY;
   drawMini(fx,fy,DIM,.9);
   ctx.strokeStyle=DIM;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(fx+3,fy+2);ctx.lineTo(fx+14,fy-8);ctx.stroke(); // the rod
   txt('fisher',fx-20,fy+18,DEEP,.7,11);}
  {const vx=trav.x-camX,vy=trav.y-camY;       // the traveler moves now (hostile / walking home)
   const flash=trav.hitT>0&&(reduced||Math.floor(t/2)%2===0);
   drawMini(vx,vy,flash?AMBER:DIM,flash?1:.9); // hit-flash, the era's blink idiom
   txt('traveler',vx-26,vy+18,DEEP,.7,11);}
  {const mx=sx(SITES.marker)-camX,my=sy(SITES.marker)-camY; // the stone needs no label — it is read
   ctx.fillStyle=DEEP;ctx.fillRect(mx-6,my-10,12,18);
   ctx.strokeStyle=DIM;ctx.lineWidth=1;ctx.globalAlpha=.7;ctx.strokeRect(mx-6,my-10,12,18);
   ctx.beginPath();ctx.moveTo(mx-3,my-4);ctx.lineTo(mx+3,my-4);ctx.moveTo(mx-3,my);ctx.lineTo(mx+2,my);ctx.stroke();ctx.globalAlpha=1;}

  // ---- Cardea (beset -> following) is quest-phase rendering ----
  questDraw(camX,camY,t);

  // ---- foes / rough folk ----
  for(const f of foes)if(f.alive)drawFoeShape(f.x-camX,f.y-camY,false);
  for(const f of rough)if(f.alive)drawFoeShape(f.x-camX,f.y-camY,true);

  // ---- bolts (the persisting verb — white blk dots, as ever) ----
  for(const b of bolts)blk(b.x-camX,b.y-camY,WHITE,1,3);

  // ---- the player (blinks through invulnerability) ----
  if(invT<=0||Math.floor(t/4)%2===0)drawFigure(fig.x-camX,fig.y-camY,fig.dir);

  // ---- HUD ----
  pips(40,28,hp);                                              // hp pips top-left
  const names=party.members().map(c=>c.name.toUpperCase()).join(' · ');
  if(names)txt(names,80,28,AMBER,.9,13);                       // CARDEA appears when she joins
  const yr=''+state.year;txt(yr,W-110,40,DIM,.7,15);           // year top-right
  const lv='LV '+xp.level+' · XP '+xp.total;                   // modest — no bar
  txt(lv,W-110+cw(yr)-cw(lv,12),62,DIM,.65,12);
  if(flags.has(FLAG.LEARNED_MANDRAKE_WHEN))drawMoon(W/2,60);   // taught, not shown — no moon UI before
  const hint='arrows move · space fire · esc menu';
  txt(hint,W-40-cw(hint,12),H-30,DEEP,.7,12);
  // ---- the traveler's modal (drawn over the world; the log stays on top — sacred) ----
  travDrawModal();
  // corner command-line: the console, demoted but never gone (sacred)
  const log=getLog();
  for(let i=0;i<log.length;i++)txt(log[i],40,H-30-(log.length-1-i)*20,DEEP,.85,13);
}

registerMode('topdown',{
  enter(){init();},
  draw(t){drawTop(t);},
  key(e){
    if(travModalKey(e))return;      // the conversation owns the keys while open
    if(questKey(e))return;          // beat 7: the portal's EXIT GAME? confirm lives there
    if(e.key===' ')fire();
    if(e.key==='Escape')setMode('select'); // era 1 keeps the frame
  },
  click(x,y){travClick(x,y);}       // pointer bus: taps choose modal rows (mobile path)
});

// dev/QA handle (same family as engine's window.__seed): headless tests need to place
// the figure and wind the moon without forging input. Harmless client-side.
if(window.__seed)window.__seed.era1={
  warp(tx,ty){if(!fig)return;fig.x=(tx+0.5)*TILE;fig.y=(ty+0.5)*TILE;trail.length=0;},
  setMoon(n){moonClock=n;lastMoon=moonIdx();},
  probe(){return fig?{x:fig.x,y:fig.y,hp,foes:foes.filter(f=>f.alive).length,rough:rough.filter(r=>r.alive).length,moon:moonIdx(),xp:xp.total,level:xp.level,
    trav:trav.state,travHp:trav.hp,travX:trav.x,travY:trav.y,
    travPaid:flags.has('xp:npc:traveler'),knows:flags.has(FLAG.KNOWS_CARDEA_REGION),
    log:getLog().slice()}:null;},
};
