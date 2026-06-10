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
// The ENEMY const sits on the only corridor to EXIT; the beast is live (Threat phase):
// movement collision and arrow hits both route through the single point enemyAt().
import {registerMode,setMode,reduced} from '../engine.js';
import {ctx,clear,txt,cw,blk,W,H} from '../crt.js';
import {logLine,getLog} from '../state.js';
import {AMBER,DIM,DEEP,WHITE,TEAL} from '../palette.js';
import {GRID,ENTRY,ITEMS,ENEMY,EXIT} from './era2_map.js';
import * as inv from './era2_inventory.js';

/* ---------- grid math ---------- */
const CX=W/2,CY=H/2;
const ORDER=['N','E','S','W'];
const FV={N:[0,-1],E:[1,0],S:[0,1],W:[-1,0]};      // forward
const RV={N:[1,0],E:[0,1],S:[-1,0],W:[0,-1]};      // right (90° clockwise of forward)
const wallAt=(x,y)=>x<0||y<0||x>15||y>15||GRID[y][x]==='#';

/* =======================================================================
   THE BEAST (Threat phase). One live state object spawned from the ENEMY
   const; movement collision and arrow hit-detection both route through
   enemyAt(). Greedy chase on a ~45-frame tick: one cell toward the player,
   preferring the axis of larger distance, the other if walls block —
   no pathfinding, it is 1987. It never enters the player's cell. Adjacent,
   it strikes on a ~60-frame tick (hp-1, brief amber wash, '> it strikes.').
   Arrows: '> it recoils.'; at 0 hp '> it comes apart.' and the cell clears
   permanently for the session. The player at 0 hp wakes at ENTRY, hp 3,
   pack intact — the dungeon does not give the arrows back.
   ======================================================================= */
let foe=null,foeStepT=45,foeAtkT=30,foeHurtT=0,flashT=0;
function enemyAt(x,y){return !!foe&&foe.x===x&&foe.y===y;}
function tickEnemy(){
  if(foeHurtT>0)foeHurtT--;
  if(flashT>0)flashT--;
  if(!foe)return;
  const dx=pos.x-foe.x,dy=pos.y-foe.y,adj=Math.abs(dx)+Math.abs(dy)===1;
  if(--foeStepT<=0){
    foeStepT=45;
    if(!adj){ // greedy: the longer axis first, the other when the wall says no
      const opts=Math.abs(dx)>=Math.abs(dy)
        ?[[Math.sign(dx),0],[0,Math.sign(dy)]]
        :[[0,Math.sign(dy)],[Math.sign(dx),0]];
      for(const [ox,oy] of opts){
        if(!ox&&!oy)continue;
        const nx=foe.x+ox,ny=foe.y+oy;
        if(wallAt(nx,ny)||(nx===pos.x&&ny===pos.y))continue; // walls block; never the player's cell
        foe.x=nx;foe.y=ny;break;
      }
    }
  }
  if(adj){
    if(--foeAtkT<=0){
      foeAtkT=60;
      hp--;flashT=reduced?2:10;             // the amber wash — short and steady under reduced motion
      logLine('> it strikes.');
      if(hp<=0)respawn();
    }
  }else foeAtkT=Math.min(foeAtkT,30);       // half a beat of warning when it closes in
}
function hurtFoe(){ // an arrow found it (wired from updateArrows through enemyAt)
  foe.hp--;
  if(foe.hp>0){foeHurtT=8;logLine('> it recoils.');}
  else{foe=null;logLine('> it comes apart.');} // the corridor is yours — for good, this session
}
function respawn(){ // death is a relocation, not a reset: the pack persists, spent arrows stay spent
  pos={x:ENTRY.x,y:ENTRY.y};facing=ENTRY.facing;hp=3;cool=COOL;arrows=[];
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
const HINT='↑↓ move · ←→ turn · space fire · i pack · esc menu';

/* ---------- light ---------- */
// brightness of a surface at eye-distance d: torch level × depth falloff. At the 0.08
// darkness floor only the DEEP edge strokes survive — silhouettes. Torch sway is
// deterministic (sines, not random) and gated on prefers-reduced-motion.
function bright(d){
  let L=inv.lightLevel();
  if(!reduced)L*=1+0.05*Math.sin(T*0.31)+0.03*Math.sin(T*0.113);
  return Math.max(0,Math.min(1,L*(1-d*0.20)));
}

/* ---------- controls ---------- */
function tryStep(s){
  const F=FV[facing],nx=pos.x+F[0]*s,ny=pos.y+F[1]*s;
  if(wallAt(nx,ny))return;
  if(enemyAt(nx,ny))return;          // the beast blocks the corridor (live after Threat phase)
  pos.x=nx;pos.y=ny;cool=COOL;
  if(nx===EXIT.x&&ny===EXIT.y){setMode('seam_2_3');return;}   // the doorway out
  // walking onto an item cell — taken if the pack can bear it; refusals are logged by inventory
  for(const it of floorItems.filter(i=>i.x===nx&&i.y===ny)){
    if(inv.pickup(it)){logLine('> taken: '+it.id+'.');floorItems.splice(floorItems.indexOf(it),1);}
  }
}
function fire(){
  if(inv.hasBow()&&inv.spendArrow())arrows.push({x:pos.x,y:pos.y,fx:FV[facing][0],fy:FV[facing][1],sub:0});
  else logLine(inv.hasBow()?'> the quiver is empty.':'> your hands are empty.');
}
function updateArrows(){
  for(const a of arrows){
    a.sub+=1/6;                      // ~6 frames per cell
    while(a.sub>=1){
      a.sub-=1;a.x+=a.fx;a.y+=a.fy;
      if(wallAt(a.x,a.y)){a.dead=true;break;}     // lost to the wall
      if(enemyAt(a.x,a.y)){hurtFoe();a.dead=true;break;}   // hit
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
  for(const it of floorItems){const p=rel(it.x,it.y);if(p.d>-0.3&&p.d<4.3&&Math.abs(p.lat)<2.1)out.push({d:p.d,lat:p.lat,kind:it.id});}
  const e=rel(EXIT.x,EXIT.y);if(e.d>-0.3&&e.d<4.3&&Math.abs(e.lat)<2.1)out.push({d:e.d,lat:e.lat,kind:'exit'});
  for(const a of arrows){const p=rel(a.x+a.fx*a.sub,a.y+a.fy*a.sub);if(p.d>0.15&&p.d<4.3&&Math.abs(p.lat)<2.1)out.push({d:p.d,lat:p.lat,kind:'arrow'});}
  if(foe){const p=rel(foe.x,foe.y);if(p.d>-0.3&&p.d<4.3&&Math.abs(p.lat)<2.1)out.push({d:p.d,lat:p.lat,kind:'foe'});}
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
  const cx=CX+s.lat*W*f,fy=CY+CY*f-2,u=1.3*f;       // u: the beast is big — half the corridor
  const aB=Math.max(0.25,Math.min(1,b*1.4));        // silhouette floor: it reads even past the torch
  ctx.globalAlpha=aB;ctx.fillStyle=foeHurtT>0?AMBER:DIM;  // the recoil lights it up for a breath
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
function drawSprite(s){
  if(s.kind==='exit'){drawDoor(s);return;}
  if(s.kind==='foe'){drawFoe(s);return;}
  const d=Math.max(s.d,0.42),f=pf(d),b=bright(d);
  const cx=CX+s.lat*W*f,fy=CY+CY*f-2;
  if(s.kind==='arrow'){blk(cx-3*f,CY+36*f,WHITE,Math.min(1,b+0.35),Math.max(2,Math.round(7*f)));return;}
  const a=Math.min(1,b*1.5+0.06);
  ctx.globalAlpha=a;ctx.lineWidth=Math.max(1,2*f);
  switch(s.kind){
    case 'bow':
      ctx.strokeStyle=AMBER;
      ctx.beginPath();ctx.arc(cx-2*f,fy-12*f,11*f,-1.25,1.25);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+1.5*f,fy-22*f);ctx.lineTo(cx+1.5*f,fy-2*f);ctx.stroke();
      break;
    case 'arrows':
      ctx.strokeStyle=DIM;
      for(let i=-1;i<=1;i++){
        ctx.beginPath();ctx.moveTo(cx+i*3.4*f,fy);ctx.lineTo(cx+i*3.4*f+2.5*f,fy-15*f);ctx.stroke();
        ctx.fillStyle=WHITE;ctx.fillRect(cx+i*3.4*f+1.5*f,fy-17*f,Math.max(1,2.6*f),Math.max(1,2.6*f));
      }
      break;
    case 'torch':
      ctx.strokeStyle=DIM;
      ctx.beginPath();ctx.moveTo(cx,fy);ctx.lineTo(cx+3*f,fy-14*f);ctx.stroke();
      ctx.fillStyle=AMBER;ctx.fillRect(cx+1.5*f,fy-19*f,5*f,5*f);
      ctx.fillStyle=WHITE;ctx.fillRect(cx+3*f,fy-17.5*f,2*f,2*f);
      break;
    case 'idol':
      ctx.fillStyle=DIM;
      ctx.fillRect(cx-6*f,fy-13*f,12*f,13*f);
      ctx.fillRect(cx-3.5*f,fy-19*f,7*f,7*f);
      ctx.fillStyle='#080604'; // hollow eyes — amber eyes belong to the beast alone
      ctx.fillRect(cx-2*f,fy-17*f,1.6*f,1.6*f);ctx.fillRect(cx+0.8*f,fy-17*f,1.6*f,1.6*f);
      break;
    case 'mirror':
      ctx.fillStyle='#0e0b08';ctx.fillRect(cx-6*f,fy-20*f,12*f,20*f);
      ctx.strokeStyle=DIM;ctx.strokeRect(cx-6*f,fy-20*f,12*f,20*f);
      ctx.strokeStyle=WHITE;ctx.beginPath();ctx.moveTo(cx-3*f,fy-4*f);ctx.lineTo(cx+3*f,fy-16*f);ctx.stroke();
      break;
    default: // a dropped thing with no portrait — a small dim bundle
      ctx.fillStyle=DIM;ctx.fillRect(cx-4*f,fy-7*f,8*f,7*f);
  }
  ctx.globalAlpha=1;
}

/* ---------- the mode ---------- */
registerMode('dungeon',{
  enter(){ // full reset only on a fresh arrival; re-entry resumes the session
    if(started)return;
    started=true;
    pos={x:ENTRY.x,y:ENTRY.y};facing=ENTRY.facing;hp=3;cool=0;arrows=[];
    foe={x:ENEMY.x,y:ENEMY.y,hp:ENEMY.hp};foeStepT=45;foeAtkT=30;foeHurtT=0;flashT=0;
    floorItems=ITEMS.map(it=>({...it}));
    inv.initInventory();
    logLine('> it is dark here.');
  },
  draw(t){
    T=t;
    if(cool>0)cool--;
    inv.tick();                       // the torch burns whether you move or not
    tickEnemy();                      // and the beast walks whether you do or not
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
    if(flashT>0){ // the strike — a breath of amber across everything
      ctx.fillStyle=AMBER;ctx.globalAlpha=reduced?0.10:0.06+0.16*(flashT/10);
      ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
    }
    inv.drawHeader(hp);
    txt(HINT,W-40-cw(HINT,12),H-30,DEEP,.7,12);
    if(inv.isOpen())inv.drawPanel(t);
    // corner command-line: the console, demoted but never gone (sacred — era-1 idiom exactly)
    const log=getLog();
    for(let i=0;i<log.length;i++)txt(log[i],40,H-30-(log.length-1-i)*20,DEEP,.85,13);
  },
  key(e){
    const k=e.key;
    if(k==='i'||k==='I'){inv.togglePanel();return;}
    if(k==='Escape'){setMode('select');return;}
    if(inv.isOpen())return;           // movement (and the bow) wait while the pack is open
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
