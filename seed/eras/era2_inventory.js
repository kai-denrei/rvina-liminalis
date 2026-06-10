// eras/era2_inventory.js — era 2 inventory: the human attachment to objects (bible §4;
// ledger §5 rows: inventory/weight — "the thing you carry vs. the thing you drop" — and
// depletion — "light is something you can lose"). The 12kg LOAD cap against 14.2kg of
// treasure is the era's beat: you cannot carry everything, and choosing what to keep is
// a statement of values. The torch burns whether you move or not (~5400 frames ≈ 90s):
// the first soft encounter with entropy.
// DM-lite paper-doll panel: hands / quiver / torches / pack, direct manipulation —
// tap a row to drop the thing where you stand. Every word through crt.txt (the
// command-line is sacred, bible §7); shapes (frame, pips, the doll) are ctx strokes.
// Amber family only — no TEAL here; the colour of elsewhere stays in the stone and
// the surface light. The hero is deliberately unnamed: '———'.
import {ctx,txt,cw,drawMini,W,H} from '../crt.js';
import {logLine} from '../state.js';
import {AMBER,DIM,DEEP} from '../palette.js';

/* ---------- constants ---------- */
const CAP=18;                 // kg — roomy at the start (12 was punitive — Gerald, 2026-06-11); the choosing-what-to-keep beat re-stages with heavier loot later
const BURN=1/5400;            // torch level lost per frame (~90s of light)
const ARROW_KG=0.1;           // 12 arrows = 1.2kg — consistent with the map's ITEMS kg
const PARTY=[{name:'CARDEA',carry:'———'},{name:'IOLO',carry:'lute ♪'}]; // fixtures: they carry their own
const r1=v=>Math.round(v*10)/10;
const f1=v=>r1(v).toFixed(1);

/* ---------- state ---------- */
let hands=null;        // {id:'bow',kg} or null — the hands slot
let quiver=0;          // loose arrows (count; weight = count × 0.1kg)
let lit=null;          // {level:1..0} — the burning torch, or null (darkness)
let spares=[];         // [{level}] — carried unlit torches, 1kg each
let pack=[];           // [{id,kg}] — everything else (idol, mirror, ...)
let open=false;        // panel visibility
let darkLogged=false;  // '> the dark closes in.' fires once per plunge into dark

export function initInventory(){
  hands=null;quiver=0;lit={level:1};spares=[];pack=[];open=false;darkLogged=false;
}

/* ---------- weight ---------- */
function loadKg(){
  let s=0;
  if(hands)s+=hands.kg;
  s+=quiver*ARROW_KG;
  if(lit)s+=1;
  s+=spares.length;
  for(const it of pack)s+=it.kg;
  return r1(s);
}

/* ---------- depletion ---------- */
export function tick(){
  if(!lit)return;
  lit.level-=BURN;
  if(lit.level>0)return;
  if(spares.length){
    lit=spares.shift();darkLogged=false;
    logLine('> the torch gutters. another is lit.');
  }else{
    lit=null;
    if(!darkLogged){darkLogged=true;logLine('> the dark closes in.');}
  }
}
export function lightLevel(){return lit?Math.max(0.08,lit.level):0.08;} // 0.08 floor: silhouettes only

/* ---------- pickup (the forced choice lives here) ---------- */
export function pickup(item){
  const kg=item.id==='arrows'?r1((item.count||1)*ARROW_KG):item.kg;
  if(r1(loadKg()+kg)>CAP){logLine('> too heavy: '+item.id+'.');return false;}   // name the refusal — dedup must never eat it
  if(item.id==='arrows')quiver+=(item.count||1);
  else if(item.id==='torch'){
    const lv=item.level!=null?item.level:1;            // a dropped half-burnt torch stays half-burnt
    if(!lit){lit={level:lv};darkLogged=false;}         // picked up in the dark: light it at once
    else spares.push({level:lv});
  }
  else if(item.id==='bow'&&!hands)hands={id:'bow',kg:item.kg};
  else pack.push({id:item.id,kg:item.kg});             // a second bow, the idol, the mirror...
  return true;
}

/* ---------- the bow ---------- */
export function hasBow(){return !!(hands&&hands.id==='bow');}
export function arrowCount(){return quiver;}
export function spendArrow(){if(quiver<1)return false;quiver--;return true;}

/* ---------- panel toggle ---------- */
export function togglePanel(){open=!open;}
export function isOpen(){return open;}

/* ---------- pips (shapes, not text — txt() stays sacred for words) ---------- */
function pips(x,y,n,total,pw,ph,g,a){
  for(let i=0;i<total;i++){
    if(i<n){ctx.globalAlpha=a;ctx.fillStyle=AMBER;ctx.fillRect(x+i*(pw+g),y,pw,ph);}
    else{ctx.globalAlpha=a*0.8;ctx.strokeStyle=DEEP;ctx.lineWidth=1;ctx.strokeRect(x+i*(pw+g)+.5,y+.5,pw-1,ph-1);}
  }
  ctx.globalAlpha=1;
}

/* ---------- header: one line, always on ---------- */
export function drawHeader(hp){
  txt('CARDEA · IOLO ♪ · ———',40,28,AMBER,.9,13);     // the hero is deliberately unnamed
  const pw=8,ph=11,g=3,py=29;
  const hpW=cw('HP',11)+6+3*(pw+g)-g;
  const tW=cw('TORCH',11)+6+5*(pw+g)-g;
  let x=W-40-(hpW+16+tW);
  txt('HP',x,30,DEEP,.8,11);x+=cw('HP',11)+6;
  pips(x,py,Math.max(0,Math.min(3,hp)),3,pw,ph,g,.95);x+=3*(pw+g)-g+16;
  txt('TORCH',x,30,DEEP,.8,11);x+=cw('TORCH',11)+6;
  pips(x,py,lit?Math.max(1,Math.ceil(lit.level*5)):0,5,pw,ph,g,.95);
}

/* ---------- panel: DM-lite paper-doll ---------- */
const PX=220,PY=78,PW=360,PH=400;     // frame rect — clear of the corner log and the hint
let rows=[];                          // tap targets, rebuilt every draw: {y,h,act}

function dropHands(){
  const it=hands;hands=null;
  logLine('> dropped: '+it.id+'.');
  return {dropped:{id:it.id,kg:it.kg}};
}
function dropQuiver(){
  const c=quiver;quiver=0;
  logLine('> dropped: arrows.');
  return {dropped:{id:'arrows',kg:r1(c*ARROW_KG),count:c}};
}
function dropTorch(){ // a spare goes first; only then the one that's burning (a real choice)
  if(spares.length){
    const s=spares.pop();
    logLine('> dropped: torch.');
    return {dropped:{id:'torch',kg:1,level:s.level}};
  }
  const l=lit;lit=null;
  logLine('> dropped: torch.');
  if(!darkLogged){darkLogged=true;logLine('> the dark closes in.');}
  return {dropped:{id:'torch',kg:1,level:l.level}};
}
function dropPack(i){
  const it=pack.splice(i,1)[0];
  logLine('> dropped: '+it.id+'.');
  return {dropped:it};
}

function divider(y){
  ctx.globalAlpha=.5;ctx.strokeStyle=DEEP;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(PX+14,y);ctx.lineTo(PX+PW-14,y);ctx.stroke();ctx.globalAlpha=1;
}

export function drawPanel(t){
  rows=[];
  // frame: dark paper over the dungeon, amber outer stroke, deep inner bevel
  ctx.globalAlpha=.96;ctx.fillStyle='#080604';ctx.fillRect(PX,PY,PW,PH);ctx.globalAlpha=1;
  ctx.strokeStyle=AMBER;ctx.lineWidth=2;ctx.strokeRect(PX,PY,PW,PH);
  ctx.strokeStyle=DEEP;ctx.lineWidth=1;ctx.strokeRect(PX+4,PY+4,PW-8,PH-8);

  const lx=PX+22,vx=PX+118,kx=PX+PW-22; // label / value / right-aligned kg columns
  let y=PY+16;

  // the paper doll — the unnamed hero
  drawMini(PX+34,y+12,AMBER,.95);
  txt('———',PX+54,y+4,DIM,.85,13);
  txt('LOAD '+f1(loadKg())+' / '+CAP+' KG',kx-cw('LOAD '+f1(loadKg())+' / '+CAP+' KG',13),y+4,AMBER,.9,13);
  y+=38;divider(y);y+=10;

  // HANDS — the slot Dungeon Master invented a genre around
  txt('HANDS',lx,y+5,DEEP,.85,11);
  if(hands){
    txt('BOW',vx,y+3,AMBER,.95,13);
    txt(f1(hands.kg)+' KG',kx-cw(f1(hands.kg)+' KG',12),y+4,DIM,.8,12);
    rows.push({y,h:24,act:dropHands});
  }else txt('———',vx,y+3,DIM,.5,13);
  y+=24;

  // QUIVER
  txt('QUIVER',lx,y+5,DEEP,.85,11);
  if(quiver>0){
    txt('ARROWS ×'+quiver,vx,y+3,AMBER,.95,13);
    txt(f1(quiver*ARROW_KG)+' KG',kx-cw(f1(quiver*ARROW_KG)+' KG',12),y+4,DIM,.8,12);
    rows.push({y,h:24,act:dropQuiver});
  }else txt('———',vx,y+3,DIM,.5,13);
  y+=24;

  // TORCH — the consumable light, level as pips
  txt('TORCH',lx,y+5,DEEP,.85,11);
  if(lit||spares.length){
    pips(vx,y+5,lit?Math.max(1,Math.ceil(lit.level*5)):0,5,7,9,3,.95);
    const tag=(lit?'LIT':'OUT')+(spares.length?' +'+spares.length+' SPARE':'');
    txt(tag,vx+56,y+4,lit?AMBER:DIM,.85,12);
    txt(f1((lit?1:0)+spares.length)+' KG',kx-cw(f1((lit?1:0)+spares.length)+' KG',12),y+4,DIM,.8,12);
    rows.push({y,h:24,act:dropTorch});
  }else txt('dark',vx,y+3,DIM,.5,13);
  y+=26;divider(y);y+=10;

  // PACK — what you judged worth holding onto
  txt('PACK',lx,y+2,DEEP,.85,11);y+=20;
  if(pack.length===0){txt('(nothing)',vx,y+1,DIM,.5,12);y+=22;}
  else for(let i=0;i<pack.length;i++){
    const it=pack[i];
    txt('· '+it.id,vx-26,y+1,AMBER,.9,13);
    txt(f1(it.kg)+' KG',kx-cw(f1(it.kg)+' KG',12),y+2,DIM,.8,12);
    rows.push({y:y-2,h:22,act:dropPack.bind(null,i)});
    y+=22;
  }
  y+=6;divider(y);y+=10;

  // the party carries its own — fixtures, not weight
  for(const p of PARTY){txt(p.name,lx,y,DIM,.65,11);txt(p.carry,vx,y,DIM,.65,11);y+=18;}

  // selection cursor — the keyboard path rides the same rows the taps use
  if(rows.length){if(sel>=rows.length)sel=rows.length-1;if(sel<0)sel=0;txt('>',PX+10,rows[sel].y+4,AMBER,.95,13);}

  // anchored hint at the frame's foot
  const hint='tap, or ↑↓ + ⏎, to drop · i / esc closes';
  txt(hint,PX+PW/2-cw(hint,11)/2,PY+PH-26,DEEP,.7,11);
}

/* ---------- keyboard path: select a row, drop with enter ---------- */
let sel=0;
export function panelKey(k){
  if(!open||!rows.length)return null;
  if(k==='ArrowUp'){sel=(sel+rows.length-1)%rows.length;return null;}
  if(k==='ArrowDown'){sel=(sel+1)%rows.length;return null;}
  if(k==='Enter'||k===' '){const r=rows[Math.min(sel,rows.length-1)];return r&&r.act?r.act():null;}
  return null;
}

/* ---------- tap-to-drop: the dungeon puts the thing where you stand ---------- */
export function click(x,y){
  if(!open)return null;
  if(x<PX||x>PX+PW||y<PY||y>PY+PH)return null;
  for(const r of rows)if(y>=r.y&&y<r.y+r.h&&r.act)return r.act();
  return null;
}
