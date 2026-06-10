// console.js — the machine's own voice: boot, select, off (bible §8 current behavior).
// Faithful ports of the PoC's drawBoot/drawSelect/drawOff. All words go through crt.txt() —
// the command-line is sacred.
import {registerMode,setMode,reduced} from './engine.js';
import {ctx,clear,txt,cw,W,H} from './crt.js';
import {state,anyPlayed} from './state.js';
import {AMBER,DIM,DEEP} from './palette.js';

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
// 'EXIT GAME?' — selecting it takes you deeper in (the exit is an entrance; bible §2D illusion-of-choice)
function menu(){const m=['BALLISTIC','ASTEROID','TANKS'];if(anyPlayed())m.push('EXIT GAME?');return m;}
registerMode('select',{
  enter(){selIndex=0;},
  draw(t){
    clear();
    txt('WHICH GAME DO YOU WANT TO PLAY?',50,80,AMBER);
    txt('────────────────────────────────',50,104,DEEP);
    menu().forEach((g,i)=>{
      const y=160+i*40,on=i===selIndex,isSeam=g.indexOf('EXIT')===0;
      const a=isSeam?(.5+.5*Math.sin(t/10)):(on?1:.6);
      if(on)txt('>',64,y,AMBER);
      txt(g,92,y,on?AMBER:(isSeam?AMBER:DIM),a);
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
