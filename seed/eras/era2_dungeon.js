// eras/era2_dungeon.js — era 2, the Dungeon (Dungeon Master 1987, bible §4).
// Grid-based first person rendered the DM way: pre-drawn wall art shown larger/smaller
// by distance — scaled bitmaps at depth, NOT raycasting. All textures are generated
// procedurally on offscreen canvases ONCE at module init (seeded LCG — deterministic,
// never per-frame randomness) and pre-scaled per depth slot 0..3; per-frame work is
// blits + strokes only. Amber family throughout (era 2 is NOT Amiga gray); TEAL appears
// only as sparse lichen flecks in the stone (<=3% speckle — the colour of elsewhere).
// New primitives carried (ledger §5): inventory/weight (era2_inventory), depletion
// (torch -> lightLevel() dims the depth slots), loss of god's-eye (you are inside now).
// The corner command-line persists — sacred (bible §7). EXIT cell -> seam_2_3.
// ENEMIES[0] sits on the only corridor to EXIT; two lesser beasts live deeper in.
// All are live (Threat phase): movement collision and arrow hits both route through
// the single point enemyAt()/foeAt().
import {registerMode,setMode,reduced} from '../engine.js?v=244d1674';
import {ctx,clear,txt,cw,blk,W,H} from '../crt.js?v=244d1674';
import {logLine,getLog,party,flags,FLAG,xp,XP_SOURCE} from '../state.js?v=244d1674';
import {AMBER,DIM,DEEP,WHITE,TEAL} from '../palette.js?v=244d1674';
import {GRID,ENTRY,ITEMS,ENEMIES,EXIT,DECOR} from './era2_map.js?v=244d1674';
import * as inv from './era2_inventory.js?v=244d1674';

/* ---------- grid math ---------- */
const CX=W/2,CY=H/2;
const ORDER=['N','E','S','W'];
const FV={N:[0,-1],E:[1,0],S:[0,1],W:[-1,0]};      // forward
const RV={N:[1,0],E:[0,1],S:[-1,0],W:[0,-1]};      // right (90° clockwise of forward)
const wallAt=(x,y)=>x<0||y<0||x>15||y>15||GRID[y][x]==='#';

/* =======================================================================
   THE BEASTS (Threat phase). Live state objects spawned from ENEMIES;
   movement collision and arrow hit-detection both route through foeAt().
   Greedy chase on each foe's own ~45-frame tick (staggered by index, no
   lockstep): one cell toward the player, preferring the axis of larger
   distance, the other if walls block — no pathfinding, it is 1987. Leashed:
   the big one stirs within ~6 cells, lesser beasts within ~4, so deep rooms
   stay calm until entered. None enters the player's cell (or another foe's).
   Adjacent, it strikes on a ~60-frame tick (hp-1, brief amber wash,
   '> it strikes.'). Hits — arrow OR sword swing, both through hurtFoe():
   '> it recoils.'; at 0 hp '> it comes apart.',
   FELL_FOE xp (the log already speaks; SURVIVE_FIGHT once for the big one)
   and the cell clears permanently for the session. The player at 0 hp wakes
   at ENTRY, hp 3, pack intact — the dungeon does not give the arrows back.
   ======================================================================= */
let foes=[],flashT=0;
const foeAt=(x,y)=>foes.find(f=>f.x===x&&f.y===y)||null;
function enemyAt(x,y){return !!foeAt(x,y);}
function tickFoes(){
  if(flashT>0)flashT--;
  for(const f of foes){
    if(f.hurtT>0)f.hurtT--;
    const dx=pos.x-f.x,dy=pos.y-f.y,dist=Math.abs(dx)+Math.abs(dy),adj=dist===1;
    if(--f.stepT<=0){
      f.stepT=45;
      if(!adj&&dist<=(f.big?6:4)){ // greedy, leashed: the longer axis first, the other when the wall says no
        const opts=Math.abs(dx)>=Math.abs(dy)
          ?[[Math.sign(dx),0],[0,Math.sign(dy)]]
          :[[0,Math.sign(dy)],[Math.sign(dx),0]];
        for(const [ox,oy] of opts){
          if(!ox&&!oy)continue;
          const nx=f.x+ox,ny=f.y+oy;
          if(wallAt(nx,ny)||(nx===pos.x&&ny===pos.y)||foeAt(nx,ny))continue; // walls and bodies block
          f.x=nx;f.y=ny;break;
        }
      }
    }
    if(adj){
      if(--f.atkT<=0){
        f.atkT=60;
        hp--;flashT=reduced?2:10;           // the amber wash — short and steady under reduced motion
        logLine('> it strikes.');
        if(hp<=0){respawn();return;}
      }
    }else f.atkT=Math.min(f.atkT,30);       // half a beat of warning when it closes in
  }
}
function hurtFoe(f){ // a hit landed — arrow (updateArrows via foeAt) or sword swing (fire)
  f.hp--;
  if(f.hp>0){f.hurtT=8;logLine('> it recoils.');return;}
  foes.splice(foes.indexOf(f),1);          // the cell is yours — for good, this session
  logLine('> it comes apart.');
  xp.award(XP_SOURCE.FELL_FOE);            // no note — the log already speaks
  if(f.big)xp.award(XP_SOURCE.SURVIVE_FIGHT,{once:'era2_big_foe'});
}
function respawn(){ // death is a relocation, not a reset: the pack persists, spent arrows stay spent
  pos={x:ENTRY.x,y:ENTRY.y};facing=ENTRY.facing;hp=3;cool=COOL;arrows=[];swingT=0;swordCool=0;
  logLine('> you wake at the bottom of the stairs.');
}

/* ---------- projection: depth slots 0..3, boundaries 0..4 ---------- */
// pf(d): screen scale of one cell at eye-distance d (cells). Boundary k sits at k-0.5
// (the eye stands mid-cell). Boundary 0 blows past the screen edges — that is correct:
// your own cell's walls wrap around you.
const PK=0.85;
const pf=d=>1/(1+Math.max(d,-0.45)*PK);
const B=[];for(let k=0;k<=4;k++){const f=pf(k-0.5);B.push({hw:CX*f,hh:CY*f});}

/* ---------- procedural amber textures (init-only; seeded LCG) ---------- */
function lcg(seed){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
function cnv(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));const x=c.getContext('2d');x.imageSmoothingEnabled=false;return[c,x];}
function lichen(x,r,clusters){ // the colour of elsewhere, kept scarce: ~0.3% of texels, well under the 3% law
  for(let i=0;i<clusters;i++){const px=r()*256,py=r()*256,n=3+(r()*6|0);
    for(let j=0;j<n;j++){x.fillStyle=TEAL;x.globalAlpha=0.12+r()*0.22;x.fillRect((px+r()*8-4)|0,(py+r()*8-4)|0,1,1);}}
  x.globalAlpha=1;
}
function brickTex(seed,darken){
  const [c,x]=cnv(256,256),r=lcg(seed);
  x.fillStyle='#0d0905';x.fillRect(0,0,256,256);
  for(let row=0;row<8;row++)for(let col=-1;col<5;col++){
    x.fillStyle=DEEP;x.globalAlpha=0.45+r()*0.35;
    x.fillRect(col*64+(row%2)*32+2,row*32+2,60,28);
  }
  x.globalAlpha=1;
  for(let i=0;i<900;i++){x.fillStyle=r()<0.5?'#000':AMBER;x.globalAlpha=0.05+r()*0.12;x.fillRect(r()*256|0,r()*256|0,r()<0.3?2:1,1);}
  x.globalAlpha=1;
  lichen(x,r,24);
  if(darken){x.fillStyle='#000';x.globalAlpha=darken;x.fillRect(0,0,256,256);x.globalAlpha=1;}
  return c;
}
function flagTex(seed){ // floor flagstones
  const [c,x]=cnv(256,256),r=lcg(seed);
  x.fillStyle='#0a0703';x.fillRect(0,0,256,256);
  for(let gy=0;gy<4;gy++)for(let gx=0;gx<4;gx++){
    x.fillStyle=DEEP;x.globalAlpha=0.28+r()*0.24;
    x.fillRect(gx*64+3+(r()*6-3|0),gy*64+3+(r()*6-3|0),58,58);
  }
  x.globalAlpha=1;
  for(let i=0;i<650;i++){x.fillStyle=r()<0.6?'#000':DIM;x.globalAlpha=0.05+r()*0.10;x.fillRect(r()*256|0,r()*256|0,1,1);}
  x.globalAlpha=1;
  lichen(x,r,10);
  return c;
}
function ceilTex(seed){ // rough slab ceiling, darker than the rest
  const [c,x]=cnv(256,256),r=lcg(seed);
  x.fillStyle='#090603';x.fillRect(0,0,256,256);
  x.strokeStyle=DEEP;x.lineWidth=2;
  for(let y=8;y<256;y+=18+(r()*14|0)){x.globalAlpha=0.18+r()*0.16;x.beginPath();x.moveTo(0,y);x.lineTo(256,y+(r()*8-4|0));x.stroke();}
  x.globalAlpha=1;
  for(let i=0;i<350;i++){x.fillStyle=r()<0.7?'#000':DEEP;x.globalAlpha=0.06+r()*0.10;x.fillRect(r()*256|0,r()*256|0,1,1);}
  x.globalAlpha=1;
  lichen(x,r,4);
  return c;
}
const frontT=brickTex(0xA5EED,0),sideT=brickTex(0xC0FFEE,0.16),flagT=flagTex(0xF1005),ceilT=ceilTex(0x5EED);

/* ---------- Gerald's sprites (sanctioned 2026-06-11: the art is law) ----------
   64x64 RGBA pixel art that ships in its OWN colors — gold chest/crown, grey bone,
   orange flame — never recolored, never smoothed. Preloaded once at module init;
   runtime cache-bust via the cb meta token (the SW caches them under that token).
   Every blit forces imageSmoothingEnabled=false and RESTORES the prior value after
   (wall textures may rely on the ambient setting). No new animation is introduced:
   the candle's flame is baked into the art, so reduced-motion needs no special case. */
const CB=(document.querySelector('meta[name="cb"]')||{}).content||'';
function spr(path){const im=new Image();im.src='./public/sprites/era2/'+path+'?v='+CB;return im;}
// scale = drawn frame width as a fraction of the corridor width at that depth (W*pf):
// near-slot furniture reads as FURNITURE, ~half the corridor wide (Gerald: much bigger).
const DECOR_DEF={
  skeleton:           {img:spr('Gore03GroundSkeleton.png'),scale:0.72}, // bones spread wide where he fell
  chest:              {img:spr('TreasureChest.png'),       scale:0.42},
  candleTable:        {img:spr('TableCandle.png'),         scale:0.50},
  'kitchen:Barrel01' :{img:spr('kitchen/Barrel01.png'),    scale:0.38},
  'kitchen:Kitchen01':{img:spr('kitchen/Kitchen01.png'),   scale:0.46,ceil:true}, // hung from the ceiling
  'kitchen:Kitchen02':{img:spr('kitchen/Kitchen02.png'),   scale:0.40,ceil:true},
  'kitchen:Kitchen03':{img:spr('kitchen/Kitchen03.png'),   scale:0.52},           // the hearth
  'kitchen:Tabble01' :{img:spr('kitchen/Tabble01.png'),    scale:0.50},
  'kitchen:Table02'  :{img:spr('kitchen/Table02.png'),     scale:0.50},
  'kitchen:Tub01'    :{img:spr('kitchen/Tub01.png'),       scale:0.40},
  'kitchen:Tub02'    :{img:spr('kitchen/Tub02.png'),       scale:0.40},
  'kitchen:Water01'  :{img:spr('kitchen/Water01.png'),     scale:0.45},
};
const crownImg=spr('Crown.png');
function blit(img,x,y,w,h,a){ // the one drawImage gate: nearest-neighbor in, prior smoothing out
  if(!img.complete||!img.naturalWidth)return;       // still loading — it appears next frame
  const sm=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
  ctx.globalAlpha=a;ctx.drawImage(img,x,y,w,h);ctx.globalAlpha=1;
  ctx.imageSmoothingEnabled=sm;
}

/* ---------- pre-scaled depth slots (init-only) ---------- */
// front walls at boundaries 1..4 — one canvas each, blitted (and laterally shifted) per frame
const frontC=[null];
for(let k=1;k<=4;k++){const [c,x]=cnv(2*B[k].hw,2*B[k].hh);x.drawImage(frontT,0,0,256,256,0,0,c.width,c.height);frontC.push(c);}
// side walls per slot 0..3: the trapezoid between boundary z and z+1, pre-rendered
// column-by-column ONCE (the per-frame cost is a single blit per face)
function makeSide(z,rightSide){
  const n=B[z],f=B[z+1];
  const wpx=Math.max(1,Math.ceil(n.hw-f.hw)),yTN=CY-n.hh,yTF=CY-f.hh,hN=2*n.hh,hF=2*f.hh;
  const [c,x]=cnv(wpx,hN);
  for(let i=0;i<wpx;i++){
    const t=i/Math.max(1,wpx-1),g=rightSide?1-t:t;  // g=0 at the near end of the face
    x.drawImage(sideT,Math.min(255,Math.round(g*255)),0,1,256,i,(yTN+(yTF-yTN)*g)-yTN,1,hN+(hF-hN)*g);
  }
  const xNl=CX-n.hw,xFl=CX-f.hw,xNr=CX+n.hw,xFr=CX+f.hw,yBN=CY+n.hh,yBF=CY+f.hh;
  return rightSide
    ?{c,x0:xFr,y0:yTN,pts:[[xFr,yTF],[xNr,yTN],[xNr,yBN],[xFr,yBF]]}
    :{c,x0:xNl,y0:yTN,pts:[[xNl,yTN],[xFl,yTF],[xFl,yBF],[xNl,yBN]]};
}
const sideGeo=[];for(let z=0;z<4;z++)sideGeo.push({left:makeSide(z,false),right:makeSide(z,true)});
// ceiling/floor bands per slot 0..3 (full-width strips; perspective squash via tile size)
function makeBand(tex,top,bottom,z){
  const [c,x]=cnv(W,Math.max(1,bottom-top)),ts=Math.max(26,Math.round(200*pf(z)));
  for(let xx=0;xx<W;xx+=ts)x.drawImage(tex,0,0,256,256,xx,0,ts,c.height);
  return {c,y:Math.round(top)};
}
const ceilBand=[],floorBand=[];
for(let z=0;z<4;z++){
  ceilBand.push(makeBand(ceilT,Math.max(0,CY-B[z].hh),CY-B[z+1].hh,z));
  floorBand.push(makeBand(flagT,CY+B[z+1].hh,Math.min(H,CY+B[z].hh),z));
}

/* ---------- mode state ---------- */
const COOL=9;                       // ~9-frame step/turn cooldown (DM cadence)
let pos={x:ENTRY.x,y:ENTRY.y},facing=ENTRY.facing,hp=3;
let cool=0,floorItems=[],arrows=[],started=false,T=0;
// decor instances (per session — chests carry their opened flag); the candle's cell
// is cached for the 1-cell light source; candleSeen gates its once-line.
let decor=[],candleCell=null,candleSeen=false;
// the sword (close work): swingT counts down the 3-frame arc, swordCool the ~25-frame
// rhythm between swings; swordSeen gates the once-line at the dead man by the stairs.
let swingT=0,swordCool=0,swordSeen=false;
const HINT='↑↓ move · ←→ turn · space fire · i pack';
// Iolo waits two cells in from the bottom of the stairs; reaching his cell recruits him.
// He follows in the header, not the corridor — the era-2 party occupies one cell, DM-style.
const IOLO_CELL={x:3,y:11};
let ioloWaiting=false;

/* ---------- light ---------- */
// brightness of a surface at eye-distance d: torch level × depth falloff. At the 0.08
// darkness floor only the DEEP edge strokes survive — silhouettes. Torch sway is
// deterministic (sines, not random) and gated on prefers-reduced-motion.
function bright(d){
  let L=inv.lightLevel();
  if(!reduced)L*=1+0.05*Math.sin(T*0.31)+0.03*Math.sin(T*0.113);
  // THE CANDLE IS ALWAYS LIT (Gerald 2026-06-11): standing on or beside its cell, the
  // local view stays readable even with the torch burnt out — a 1-cell light source.
  // The floor is applied AFTER the torch sway: wax light is steady, it does not gutter.
  if(candleCell&&Math.abs(pos.x-candleCell.x)+Math.abs(pos.y-candleCell.y)<=1)L=Math.max(L,0.55);
  return Math.max(0,Math.min(1,L*(1-d*0.20)));
}

/* ---------- controls ---------- */
function tryStep(s){
  const F=FV[facing],nx=pos.x+F[0]*s,ny=pos.y+F[1]*s;
  if(wallAt(nx,ny))return;
  if(enemyAt(nx,ny))return;          // the beast blocks the corridor (live after Threat phase)
  pos.x=nx;pos.y=ny;cool=COOL;
  if(nx===EXIT.x&&ny===EXIT.y){setMode('seam_2_3');return;}   // the doorway out
  if(ioloWaiting&&nx===IOLO_CELL.x&&ny===IOLO_CELL.y){        // the bard joins the header
    ioloWaiting=false;
    party.add({id:'iolo',name:'Iolo',persistent:false,joinedEra:2,data:{instrument:'lute'}});
    flags.set(FLAG.FOUND_IOLO);
    logLine('> a bard, waiting in the dark, with his lute.');
  }
  // walking onto an item cell — taken if the pack can bear it; refusals are logged by inventory
  for(const it of floorItems.filter(i=>i.x===nx&&i.y===ny)){
    if(inv.pickup(it)){logLine('> taken: '+it.id+'.');floorItems.splice(floorItems.indexOf(it),1);}
  }
}
function fire(){
  // SPACE priority, stated order (attack only ever targets LIVING foes):
  //   1. a living foe directly ahead + the sword carried -> SWING (1 hp, ~25-frame
  //      cooldown; the foe can still counter — close work is brave work);
  //   2. NO living foe ahead and an unopened chest ahead or underfoot -> OPEN it
  //      (once each; the chest stays, the loot takes the normal pickup road);
  //   3. otherwise the bow as ever. '> your hands are empty.' remains the voice of
  //      a dropped bow.
  const F=FV[facing],ax=pos.x+F[0],ay=pos.y+F[1],ahead=foeAt(ax,ay);
  if(ahead&&inv.hasSword()){
    if(swordCool>0)return;
    swordCool=25;swingT=reduced?2:9;          // 3 chunky frames of arc; reduced -> one flash
    hurtFoe(ahead);
    return;
  }
  if(!ahead){ // nothing alive in the way — a chest may be opened
    const ch=decor.find(dc=>dc.sprite==='chest'&&!dc.opened&&
      ((dc.x===ax&&dc.y===ay)||(dc.x===pos.x&&dc.y===pos.y)));
    if(ch){
      ch.opened=true;
      logLine('> the chest creaks open.');
      const loot={...ch.loot,x:ch.x,y:ch.y};
      if(inv.pickup(loot))logLine('> taken: '+loot.id+'.'); // straight to the pack — the pickup idiom
      else floorItems.push(loot);                           // too heavy: it waits in the cell, pickable later
      return;
    }
  }
  if(inv.hasBow()&&inv.spendArrow())arrows.push({x:pos.x,y:pos.y,fx:FV[facing][0],fy:FV[facing][1],sub:0});
  else logLine(inv.hasBow()?'> the quiver is empty.':'> your hands are empty.');
}
function updateArrows(){
  for(const a of arrows){
    a.sub+=reduced?3:1/6;            // ~6 frames per cell; reduced motion resolves in 1-2 frames
    while(a.sub>=1){
      a.sub-=1;a.x+=a.fx;a.y+=a.fy;
      if(wallAt(a.x,a.y)){a.dead=true;break;}     // lost to the wall
      const f=foeAt(a.x,a.y);                     // the (one) living foe on the cell
      if(f){hurtFoe(f);a.dead=true;break;}        // hit
    }
    if(Math.abs(a.x-pos.x)+Math.abs(a.y-pos.y)>20)a.dead=true;
  }
  arrows=arrows.filter(a=>!a.dead);
}

/* ---------- scene passes (back-to-front; blits + strokes only) ---------- */
function drawBands(z){
  const b=bright(z);
  ctx.drawImage(ceilBand[z].c,0,ceilBand[z].y);
  ctx.fillStyle='#000';ctx.globalAlpha=Math.min(1,1-b+0.08);ctx.fillRect(0,ceilBand[z].y,W,ceilBand[z].c.height);
  ctx.globalAlpha=1;
  ctx.drawImage(floorBand[z].c,0,floorBand[z].y);
  ctx.fillStyle='#000';ctx.globalAlpha=1-b;ctx.fillRect(0,floorBand[z].y,W,floorBand[z].c.height);
  ctx.globalAlpha=1;
}
function drawFrontRow(k){
  const F=FV[facing],R=RV[facing],bb=B[k],wpx=2*bb.hw,b=bright(k-0.5);
  for(let o=-2;o<=2;o++){
    const x0=CX+o*wpx-bb.hw;
    if(x0>=W||x0+wpx<=0)continue;
    if(!wallAt(pos.x+F[0]*k+R[0]*o,pos.y+F[1]*k+R[1]*o))continue;
    ctx.drawImage(frontC[k],x0,CY-bb.hh);
    ctx.fillStyle='#000';ctx.globalAlpha=1-b;ctx.fillRect(x0,CY-bb.hh,wpx,2*bb.hh);
    ctx.globalAlpha=Math.max(0.10,b*0.55);ctx.strokeStyle=DEEP;ctx.lineWidth=1;ctx.strokeRect(x0,CY-bb.hh,wpx,2*bb.hh);
    ctx.globalAlpha=1;
  }
}
function poly(pts){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<4;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();}
function drawSides(z){
  const F=FV[facing],R=RV[facing],b=bright(z),g=sideGeo[z];
  for(const sgn of [-1,1]){
    if(!wallAt(pos.x+F[0]*z+R[0]*sgn,pos.y+F[1]*z+R[1]*sgn))continue;
    const sd=sgn<0?g.left:g.right;
    ctx.drawImage(sd.c,sd.x0,sd.y0);
    ctx.fillStyle='#000';ctx.globalAlpha=1-b;poly(sd.pts);ctx.fill();
    ctx.globalAlpha=Math.max(0.08,b*0.45);ctx.strokeStyle=DEEP;ctx.lineWidth=1;poly(sd.pts);ctx.stroke();
    ctx.globalAlpha=1;
  }
}

/* ---------- sprites: floor items, the exit doorway, arrows in flight ---------- */
function collectSprites(){
  const F=FV[facing],R=RV[facing],out=[];
  const rel=(x,y)=>({d:(x-pos.x)*F[0]+(y-pos.y)*F[1],lat:(x-pos.x)*R[0]+(y-pos.y)*R[1]});
  // decor first: same-cell items (the dead man's sword) draw OVER their dressing —
  // the within-slot sort is stable, so insertion order breaks the d-ties
  for(const dc of decor){const p=rel(dc.x,dc.y);if(p.d>-0.3&&p.d<4.3&&Math.abs(p.lat)<2.1){
    out.push({d:p.d,lat:p.lat,kind:'decor',dec:dc});
    if(dc.sprite==='candleTable'&&!candleSeen&&inv.lightLevel()<=0.08){
      candleSeen=true;logLine('> the candle does not ask if you have light.'); // first sight torchless, once
    }
  }}
  for(const it of floorItems){const p=rel(it.x,it.y);if(p.d>-0.3&&p.d<4.3&&Math.abs(p.lat)<2.1){
    out.push({d:p.d,lat:p.lat,kind:it.id});
    if(it.id==='sword'&&!swordSeen){swordSeen=true;logLine('> a dead man holds a sword.');} // first sight, once
  }}
  const e=rel(EXIT.x,EXIT.y);if(e.d>-0.3&&e.d<4.3&&Math.abs(e.lat)<2.1)out.push({d:e.d,lat:e.lat,kind:'exit'});
  if(ioloWaiting){const p=rel(IOLO_CELL.x,IOLO_CELL.y);if(p.d>-0.3&&p.d<4.3&&Math.abs(p.lat)<2.1)out.push({d:p.d,lat:p.lat,kind:'iolo'});}
  for(const a of arrows){const p=rel(a.x+a.fx*a.sub,a.y+a.fy*a.sub);if(p.d>0.15&&p.d<4.3&&Math.abs(p.lat)<2.1)out.push({d:p.d,lat:p.lat,kind:'arrow'});}
  for(const f of foes){const p=rel(f.x,f.y);if(p.d>-0.3&&p.d<4.3&&Math.abs(p.lat)<2.1)out.push({d:p.d,lat:p.lat,kind:'foe',foe:f});}
  return out;
}
function drawDoor(s){ // the EXIT cell renders as a doorway, standing at the far edge of its cell
  const d=Math.max(s.d+0.42,0.6),f=pf(d),b=bright(d);
  const w=W*f*0.52,h=H*f*0.68,x0=CX+s.lat*W*f-w/2,yB=CY+CY*f;
  ctx.fillStyle='#020201';ctx.fillRect(x0,yB-h,w,h);
  ctx.globalAlpha=Math.max(0.25,b);ctx.strokeStyle=AMBER;ctx.lineWidth=Math.max(1,2.5*f);
  ctx.strokeRect(x0,yB-h,w,h);
  ctx.beginPath();ctx.moveTo(x0,yB-h*0.82);ctx.lineTo(x0+w,yB-h*0.82);ctx.stroke();
  ctx.globalAlpha=1;
}
function drawFoe(s){ // the hunched beast: chunky rects/strokes, DIM body, AMBER eyes — at every depth
  const d=Math.max(s.d,0.5),f=pf(d),b=bright(d);
  const cx=CX+s.lat*W*f,fy=CY+CY*f-2,u=(s.foe.big?1.3:1.04)*f; // u: the big one fills half the corridor; lesser beasts ~0.8 of it
  const aB=Math.max(0.25,Math.min(1,b*1.4));        // silhouette floor: it reads even past the torch
  ctx.globalAlpha=aB;ctx.fillStyle=s.foe.hurtT>0?AMBER:DIM;  // the recoil lights it up for a breath
  ctx.beginPath();                                  // one path, one fill: no alpha compounding
  ctx.rect(cx-130*u,fy-100*u,84*u,100*u);           // left haunch
  ctx.rect(cx+46*u, fy-100*u,84*u,100*u);           // right haunch
  ctx.rect(cx-92*u, fy-190*u,184*u,150*u);          // torso
  ctx.rect(cx-76*u, fy-236*u,128*u,60*u);           // the hump, off-centre — hunched, not square
  ctx.rect(cx-46*u, fy-160*u,92*u,62*u);            // head slung low beneath the hump
  ctx.rect(cx-116*u,fy-58*u, 40*u,58*u);            // forelimbs planted in the stone
  ctx.rect(cx+76*u, fy-58*u, 40*u,58*u);
  ctx.fill();
  ctx.strokeStyle='#080604';ctx.lineWidth=Math.max(1,3*u); // carve the head out of the mass
  ctx.strokeRect(cx-46*u,fy-160*u,92*u,62*u);
  ctx.fillStyle='#080604';ctx.globalAlpha=aB*0.55;         // recess the face — a dark socket band
  ctx.fillRect(cx-42*u,fy-152*u,84*u,30*u);
  ctx.beginPath();                                  // claws
  for(const lx of [-116,76])for(let i=0;i<3;i++){ctx.moveTo(cx+(lx+7+i*13)*u,fy-12*u);ctx.lineTo(cx+(lx+11+i*13)*u,fy);}
  ctx.stroke();
  ctx.strokeStyle=DEEP;ctx.lineWidth=Math.max(1,2.5*u);   // spines along the hump
  ctx.beginPath();
  for(let i=0;i<4;i++){const sx=cx+(-64+i*32)*u;ctx.moveTo(sx,fy-234*u);ctx.lineTo(sx+9*u,fy-258*u);}
  ctx.stroke();
  const ew=Math.max(3,14*u),eh=Math.max(3,10*u);    // AMBER eyes — they do not need your torch
  ctx.globalAlpha=Math.min(1,0.75+0.25*b)*(reduced?1:0.86+0.14*Math.sin(T*0.09)); // slow smoulder, no flicker
  ctx.fillStyle=AMBER;
  ctx.fillRect(cx-28*u-ew/2,fy-137*u-eh/2,ew,eh);
  ctx.fillRect(cx+28*u-ew/2,fy-137*u-eh/2,ew,eh);
  if(ew>=6){ // slit pupils once there is room for them
    ctx.fillStyle='#080604';ctx.globalAlpha=aB;
    ctx.fillRect(cx-28*u-1,fy-137*u-eh/2,2,eh);ctx.fillRect(cx+28*u-1,fy-137*u-eh/2,2,eh);
  }
  ctx.globalAlpha=1;
}
function drawIolo(s){ // a standing figure with a lute, patient in the dark
  const d=Math.max(s.d,0.5),f=pf(d),b=bright(d);
  const cx=CX+s.lat*W*f,fy=CY+CY*f-2;
  ctx.globalAlpha=Math.max(0.2,Math.min(1,b*1.3));
  ctx.strokeStyle=AMBER;ctx.lineWidth=Math.max(1,2.4*f);
  ctx.beginPath();ctx.arc(cx,fy-46*f,8*f,0,6.283);ctx.stroke();          // head
  ctx.beginPath();ctx.moveTo(cx,fy-38*f);ctx.lineTo(cx,fy-14*f);          // body
  ctx.moveTo(cx,fy-14*f);ctx.lineTo(cx-8*f,fy);ctx.moveTo(cx,fy-14*f);ctx.lineTo(cx+8*f,fy); // legs
  ctx.moveTo(cx,fy-32*f);ctx.lineTo(cx+11*f,fy-22*f);ctx.stroke();        // arm to the lute
  ctx.strokeStyle=DIM;
  ctx.beginPath();ctx.arc(cx+13*f,fy-20*f,6*f,0,6.283);ctx.stroke();      // the lute's body
  ctx.beginPath();ctx.moveTo(cx+16*f,fy-25*f);ctx.lineTo(cx+22*f,fy-36*f);ctx.stroke(); // its neck
  ctx.globalAlpha=1;
}
function drawDecor(s){ // Gerald's sprites: own colors, nearest-neighbor, BIG —
  // a near-slot table spans ~half the corridor width and reads as furniture, not an icon
  const def=DECOR_DEF[s.dec.sprite];if(!def)return;
  const d=Math.max(s.d,0.42),f=pf(d);
  const S=W*f*def.scale,cx=CX+s.lat*W*f;
  const y=def.ceil?CY-CY*f+2:CY+CY*f-2-S; // hung from the ceiling line, or stood on the floor line
  // the candle table is ALWAYS lit: full brightness, torch or no torch (Gerald)
  const a=s.dec.sprite==='candleTable'?1:Math.min(1,bright(d)*1.5+0.06);
  blit(def.img,cx-S/2,y,S,S,a);
}
function drawSprite(s){
  if(s.kind==='exit'){drawDoor(s);return;}
  if(s.kind==='foe'){drawFoe(s);return;}
  if(s.kind==='iolo'){drawIolo(s);return;}
  if(s.kind==='decor'){drawDecor(s);return;}
  const d=Math.max(s.d,0.42),f=pf(d),b=bright(d);
  const cx=CX+s.lat*W*f,fy=CY+CY*f-2;
  if(s.kind==='arrow'){ // in flight: a chunky 8-bit dart — WHITE head, amber shaft, dim fletch
    const sz=Math.max(4,Math.round(20*f)),sh=Math.max(3,Math.round(sz*0.6)),ay=CY+28*f;
    blk(cx-sz/2-2,ay-2,'#080604',0.75,sz+4);              // dark backing — it reads against lit beasts
    blk(cx-sz/2,ay,WHITE,Math.min(1,b+0.5),sz);
    blk(cx-sh/2,ay+sz,AMBER,Math.min(1,b+0.35),sh);
    blk(cx-sh/2,ay+sz+sh,DIM,Math.min(1,b+0.25),sh);
    return;
  }
  // floor items read ~2x the old size (Gerald: 'all the objects must be much bigger') —
  // u doubles every extent; cx/fy (projection) untouched, so depth sorting stays true.
  const u=f*2,a=Math.min(1,b*1.5+0.06);
  ctx.globalAlpha=a;ctx.lineWidth=Math.max(1,2*u);
  switch(s.kind){
    case 'bow':
      ctx.strokeStyle=AMBER;
      ctx.beginPath();ctx.arc(cx-2*u,fy-12*u,11*u,-1.25,1.25);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+1.5*u,fy-22*u);ctx.lineTo(cx+1.5*u,fy-2*u);ctx.stroke();
      break;
    case 'sword': // fallen aslant where its owner fell — the blade still catches the torch
      ctx.strokeStyle=AMBER;
      ctx.beginPath();ctx.moveTo(cx-13*u,fy-2*u);ctx.lineTo(cx+11*u,fy-20*u);ctx.stroke();
      ctx.strokeStyle=DIM;
      ctx.beginPath();ctx.moveTo(cx-12*u,fy-11*u);ctx.lineTo(cx-5*u,fy-1*u);ctx.stroke();   // crossguard
      ctx.fillStyle=DIM;ctx.fillRect(cx-18*u,fy-3*u,5*u,4*u);                               // hilt
      ctx.fillStyle=WHITE;ctx.fillRect(cx+8*u,fy-19*u,Math.max(1,2*u),Math.max(1,2*u));     // the glint
      break;
    case 'arrows':
      ctx.strokeStyle=DIM;
      for(let i=-1;i<=1;i++){
        ctx.beginPath();ctx.moveTo(cx+i*3.4*u,fy);ctx.lineTo(cx+i*3.4*u+2.5*u,fy-15*u);ctx.stroke();
        ctx.fillStyle=WHITE;ctx.fillRect(cx+i*3.4*u+1.5*u,fy-17*u,Math.max(1,2.6*u),Math.max(1,2.6*u));
      }
      break;
    case 'torch':
      ctx.strokeStyle=DIM;
      ctx.beginPath();ctx.moveTo(cx,fy);ctx.lineTo(cx+3*u,fy-14*u);ctx.stroke();
      ctx.fillStyle=AMBER;ctx.fillRect(cx+1.5*u,fy-19*u,5*u,5*u);
      ctx.fillStyle=WHITE;ctx.fillRect(cx+3*u,fy-17.5*u,2*u,2*u);
      break;
    case 'crown':{ // Gerald's gold, as shipped — a Crown.png billboard, never the procedural road
      const S=W*f*0.30;
      blit(crownImg,cx-S/2,fy-S,S,S,a);
      break;}
    case 'idol':
      ctx.fillStyle=DIM;
      ctx.fillRect(cx-6*u,fy-13*u,12*u,13*u);
      ctx.fillRect(cx-3.5*u,fy-19*u,7*u,7*u);
      ctx.fillStyle='#080604'; // hollow eyes — amber eyes belong to the beast alone
      ctx.fillRect(cx-2*u,fy-17*u,1.6*u,1.6*u);ctx.fillRect(cx+0.8*u,fy-17*u,1.6*u,1.6*u);
      break;
    case 'mirror':
      ctx.fillStyle='#0e0b08';ctx.fillRect(cx-6*u,fy-20*u,12*u,20*u);
      ctx.strokeStyle=DIM;ctx.strokeRect(cx-6*u,fy-20*u,12*u,20*u);
      ctx.strokeStyle=WHITE;ctx.beginPath();ctx.moveTo(cx-3*u,fy-4*u);ctx.lineTo(cx+3*u,fy-16*u);ctx.stroke();
      break;
    default: // a dropped thing with no portrait — a dim bundle
      ctx.fillStyle=DIM;ctx.fillRect(cx-4*u,fy-7*u,8*u,7*u);
  }
  ctx.globalAlpha=1;
}

/* ---------- the swing: 3 frames of blocky amber arc across the lower-center view ---------- */
// blk() rects only — no smooth curves; 1987 had no antialiasing to spare. The arc sweeps
// upper-middle -> across -> lower-left from a fist pivot at the lower right. Under
// prefers-reduced-motion the swing collapses to the single middle frame (a static flash).
function drawSwing(){
  const fr=reduced?2:Math.min(3,Math.ceil(swingT/3));         // 3 -> 2 -> 1
  const ang=fr===3?-2.0:fr===2?-2.65:2.85;                    // radians; y-down canvas
  const px=CX+96,py=CY+150;
  blk(px-9,py-9,DIM,0.9,18);                                  // the fist at the hilt
  for(let j=2;j<=8;j++){
    const tip=j===8,sz=tip?14:16,bx=px+Math.cos(ang)*j*24,by=py+Math.sin(ang)*j*24;
    blk(bx-sz/2-3,by-sz/2-3,'#080604',0.85,sz+6);             // dark backing — the arc reads against lit beasts
    blk(bx-sz/2,by-sz/2,tip?WHITE:AMBER,tip?0.95:0.85,sz);
  }
}

/* ---------- the mode ---------- */
registerMode('dungeon',{
  enter(){ // full reset only on a fresh arrival; re-entry resumes the session
    if(started)return;
    started=true;
    pos={x:ENTRY.x,y:ENTRY.y};facing=ENTRY.facing;hp=3;cool=0;arrows=[];
    swingT=0;swordCool=0;swordSeen=false;
    // alive per session: spawned once on first arrival; a killed foe is gone for good.
    // stepT staggered by index so the beasts never move in lockstep.
    foes=ENEMIES.map((e,i)=>({x:e.x,y:e.y,hp:e.hp,big:!!e.big,stepT:45+i*17,atkT:30,hurtT:0}));
    flashT=0;
    if(window.__seed)window.__seed.era2={ // dev handles, era-1 idiom
      foes:()=>foes.map(f=>({...f})),pos:()=>({x:pos.x,y:pos.y,facing}),hp:()=>hp,
      inv:()=>({bow:inv.hasBow(),sword:inv.hasSword(),arrows:inv.arrowCount()}),
      items:()=>floorItems.map(i=>({...i})),flying:()=>arrows.length,swing:()=>swingT,
      decor:()=>decor.map(d=>({...d})),
      warp:(x,y,f)=>{pos={x,y};if(f)facing=f;}};
    floorItems=ITEMS.map(it=>({...it}));
    decor=DECOR.map(d=>({...d,opened:false}));      // chests open once each, per session
    candleCell=decor.find(d=>d.sprite==='candleTable')||null;
    candleSeen=false;
    ioloWaiting=!party.has('iolo');   // first arrival: the bard waits two cells in
    inv.initInventory();
    logLine('> it is dark here.');
  },
  draw(t){
    T=t;
    if(cool>0)cool--;
    if(swordCool>0)swordCool--;
    if(swingT>0)swingT--;
    inv.tick();                       // the torch burns whether you move or not
    tickFoes();                       // and the beasts walk whether you do or not
    updateArrows();
    clear();
    ctx.imageSmoothingEnabled=false;  // chunky pixels — the upscale IS the look
    ctx.fillStyle='#040201';ctx.fillRect(CX-B[4].hw,CY-B[4].hh,2*B[4].hw,2*B[4].hh); // the dark past seeing
    const sprites=collectSprites();
    for(let z=3;z>=0;z--){
      drawBands(z);
      drawFrontRow(z+1);
      drawSides(z);
      for(const s of sprites.filter(p=>Math.min(3,Math.max(0,Math.round(p.d)))===z).sort((a,b)=>b.d-a.d))drawSprite(s);
    }
    if(swingT>0)drawSwing();          // the arc rides over the scene, under the HUD
    if(flashT>0){ // the strike — a breath of amber across everything
      ctx.fillStyle=AMBER;ctx.globalAlpha=reduced?0.10:0.06+0.16*(flashT/10);
      ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
    }
    inv.drawHeader(hp);
    const hint=HINT+(inv.hasSword()?' · sword swings close':'');
    txt(hint,W-40-cw(hint,12),H-30,DEEP,.7,12);
    if(inv.isOpen())inv.drawPanel(t);
    // corner command-line: the console, demoted but never gone (sacred — era-1 idiom exactly)
    const log=getLog();
    for(let i=0;i<log.length;i++)txt(log[i],40,H-30-(log.length-1-i)*20,DEEP,.85,13);
  },
  key(e){
    const k=e.key;
    if(k==='i'||k==='I'){inv.togglePanel();return;}
    if(k==='Escape'){if(inv.isOpen())inv.togglePanel();return;}  // esc only closes the pack — the dungeon's exit is the EXIT (Gerald, 2026-06-11)
    if(inv.isOpen()){const r=inv.panelKey(k);if(r&&r.dropped)floorItems.push({...r.dropped,x:pos.x,y:pos.y});return;}
    if(k===' '){fire();return;}
    if(cool>0)return;
    if(k==='ArrowLeft'){facing=ORDER[(ORDER.indexOf(facing)+3)%4];cool=COOL;}
    else if(k==='ArrowRight'){facing=ORDER[(ORDER.indexOf(facing)+1)%4];cool=COOL;}
    else if(k==='ArrowUp')tryStep(1);
    else if(k==='ArrowDown')tryStep(-1);
  },
  click(x,y){ // taps reach the pack only while it is open; a dropped thing lands at your feet
    if(!inv.isOpen())return;
    const r=inv.click(x,y);
    if(r&&r.dropped)floorItems.push({...r.dropped,x:pos.x,y:pos.y});
  }
});
