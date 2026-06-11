// console.js — the machine's own voice: boot, select, line, off (bible §8 current behavior).
// Faithful ports of the PoC's drawBoot/drawSelect/drawOff, plus 'line' (the era-goal
// success beat, off-beat styled). All words go through crt.txt() — the command-line is sacred.
import {registerMode,setMode,reduced} from './engine.js?v=0b3251d9';
import {ctx,clear,txt,cw,W,H} from './crt.js?v=0b3251d9';
import {state,flags,FLAG} from './state.js?v=0b3251d9';
import {AMBER,DIM,DEEP} from './palette.js?v=0b3251d9';

/* ---------- BOOT ---------- */
const bootLines=['SEED SYSTEM  v0.1','','CORE ........ OK','PHOSPHOR .... OK','MEMORY ...... 4096 WORDS','','READY.'];
let bootShown=0,bootTimer=0;
registerMode('boot',{
  enter(){bootShown=0;bootTimer=0;},
  draw(t){
    clear();
    for(let i=0;i<bootShown&&i<bootLines.length;i++) txt(bootLines[i],50,68+i*30,AMBER,.95);
    if(bootShown>0&&bootShown<=bootLines.length){const ln=bootLines[bootShown-1]||'';if(Math.floor(t/22)%2===0){ctx.fillStyle=AMBER;ctx.fillRect(50+cw(ln)+3,68+(bootShown-1)*30,9,15);}}
    bootTimer++;const step=reduced?1:16;
    if(bootTimer>step&&bootShown<bootLines.length){bootShown++;bootTimer=0;}
    if(bootShown>=bootLines.length&&bootTimer>40){setMode('select');}
  }
});

/* ---------- SELECT ---------- */
let selIndex=0;
// The menu GROWS: each era-0 goal flag unlocks the next entry (flags gate it now;
// anyPlayed() stays exported from state.js for compat but is no longer consulted here).
// 'EXIT GAME?' — selecting it takes you deeper in (the exit is an entrance; bible §2D illusion-of-choice)
function menu(){
  const m=['BALLISTIC'];
  if(flags.has(FLAG.ERA0_BALLISTIC_DONE))m.push('ASTEROID');
  if(flags.has(FLAG.ERA0_ASTEROID_DONE))m.push('TANKS');
  if(flags.has(FLAG.ERA0_TANKS_DONE))m.push('EXIT GAME?');
  return m;
}
const PLAYED_KEY={BALLISTIC:'ballistic',ASTEROID:'asteroid',TANKS:'tanks'};
// The newest unlocked game flickers (the seam-flicker alpha) until first selected —
// state.played records the selection. Returns -1 when nothing should flicker.
function newestIdx(mn){
  for(let i=mn.length-1;i>=0;i--){const k=PLAYED_KEY[mn[i]];if(k)return state.played[k]?-1:i;}
  return -1;
}
registerMode('select',{
  enter(){selIndex=0;},
  draw(t){
    clear();
    txt('WHICH GAME DO YOU WANT TO PLAY?',50,80,AMBER);
    txt('────────────────────────────────',50,104,DEEP);
    const mn=menu(),nw=newestIdx(mn);
    mn.forEach((g,i)=>{
      const y=160+i*40,on=i===selIndex,isSeam=g.indexOf('EXIT')===0,flick=isSeam||i===nw;
      const a=flick?(.5+.5*Math.sin(t/10)):(on?1:.6);
      if(on)txt('>',64,y,AMBER);
      txt(g,92,y,on?AMBER:(flick?AMBER:DIM),a);
    });
    txt('↑ ↓  SELECT      ⏎ / SPACE  START',50,H-60,DIM,.85);
  },
  key(e){
    const mn=menu();
    if(e.key==='ArrowUp')selIndex=(selIndex+mn.length-1)%mn.length;
    if(e.key==='ArrowDown')selIndex=(selIndex+1)%mn.length;
    if(e.key===' '||e.key==='Enter'){
      const g=mn[selIndex];
      if(g==='BALLISTIC'){setMode('ballistic');state.played.ballistic=true;}
      else if(g==='ASTEROID'){setMode('asteroid');state.played.asteroid=true;}
      else if(g==='TANKS'){setMode('tanks');state.played.tanks=true;}
      else if(g.indexOf('EXIT')===0){setMode('seam');}
    }
  }
});

/* ---------- OFF ---------- */
const childLine='where do the tanks go when you turn it off?';
let offTimer=0,offTyped=0;
registerMode('off',{
  enter(){offTimer=0;offTyped=0;},
  draw(t){
    clear();
    if(reduced)offTyped=childLine.length;
    else if(offTimer>34&&offTyped<childLine.length&&offTimer%2===0)offTyped++;
    offTimer++;
    txt(childLine.slice(0,offTyped),60,H/2-8,DIM,.85);
    if(offTyped>=childLine.length&&Math.floor(t/22)%2===0){ctx.fillStyle=DIM;ctx.globalAlpha=.7;ctx.fillRect(60+cw(childLine)+2,H/2-8,9,15);ctx.globalAlpha=1;}
  }
});

/* ---------- LINE — a sentence the machine says to itself (the era-goal success beat) ----------
   Reusable and payload-driven: setMode('line',{text}) typewrites `text` in the power-off
   beat's exact style — x=60, y=H/2-8, DIM .85, same 34-frame delay and 2-frame cadence,
   blinking block cursor once fully typed, reduced-motion instant. Holds ~2s after the
   last character, then returns to 'select'. SPACE/ENTER skips ahead (first press
   completes the typing, second press leaves at once). Texts wider than the off-beat
   margins word-wrap downward in 24px steps; the cursor sits at the end of the last line. */
let lnLines=[],lnTotal=0,lnTimer=0,lnTyped=0,lnHold=0;
registerMode('line',{
  enter(p){
    const text=(p&&p.text)||'';
    lnLines=[];let cur=''; // greedy word-wrap to the off-beat margins (60px each side)
    for(const w of text.split(' ')){const j=cur?cur+' '+w:w;if(cur&&cw(j)>W-120){lnLines.push(cur);cur=w;}else cur=j;}
    if(cur)lnLines.push(cur);
    lnTotal=lnLines.reduce((n,s)=>n+s.length,0);
    lnTimer=0;lnTyped=0;lnHold=0;
  },
  draw(t){
    clear();
    if(reduced)lnTyped=lnTotal;
    else if(lnTimer>34&&lnTyped<lnTotal&&lnTimer%2===0)lnTyped++;
    lnTimer++;
    let rem=lnTyped;
    for(let i=0;i<lnLines.length;i++){
      const vis=Math.min(lnLines[i].length,rem);rem-=vis;
      txt(lnLines[i].slice(0,vis),60,H/2-8+i*24,DIM,.85);
    }
    if(lnTyped>=lnTotal){
      if(Math.floor(t/22)%2===0){
        const li=lnLines.length?lnLines.length-1:0,last=lnLines[li]||'';
        ctx.fillStyle=DIM;ctx.globalAlpha=.7;ctx.fillRect(60+cw(last)+2,H/2-8+li*24,9,15);ctx.globalAlpha=1;
      }
      lnHold++;
      if(lnHold>120)setMode('select'); // ~2s at 60fps, then back to the menu
    }
  },
  key(e){
    if(e.key===' '||e.key==='Enter'){
      if(lnTyped<lnTotal)lnTyped=lnTotal; // skip: finish the typing
      else setMode('select');             // already typed: leave at once
    }
  }
});
