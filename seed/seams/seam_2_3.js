// seams/seam_2_3.js — STUB of the 2→3 seam. Entered from the dungeon's EXIT cell.
// TEAL light floods down from the top of the frame over the darkness — the surface,
// and teal is the colour of elsewhere (aesthetic law: this is one of its two sanctioned
// era-2 uses). The year ticks 1987→1992 (era-3 reference band, bible §4) into state.year.
// The corner command-line persists — sacred — and the machine admits era 3 isn't built.
// Then back to select.
import {registerMode,setMode,reduced} from '../engine.js?v=0b3251d9';
import {ctx,clear,txt,W,H} from '../crt.js?v=0b3251d9';
import {state,logLine,getLog} from '../state.js?v=0b3251d9';
import {DIM,DEEP,TEAL} from '../palette.js?v=0b3251d9';

let st=0,LEN=260,noted=false;

registerMode('seam_2_3',{
  enter(){
    st=0;LEN=reduced?30:260;noted=false;
    logLine('> the surface.');
  },
  draw(){
    clear();
    const p=Math.min(1,st/LEN);
    state.year=Math.round(1987+5*p);

    // teal light floods down from the top of the frame — banded rows, brightest at the lip
    const depth=p*H*0.85;
    if(depth>0){
      ctx.fillStyle=TEAL;
      for(let y=0;y<depth;y+=4){
        ctx.globalAlpha=0.16*(1-y/Math.max(1,depth));
        ctx.fillRect(0,y,W,4);
      }
      ctx.globalAlpha=1;
    }

    txt(''+state.year,W-110,40,DIM,.7,15);
    if(p>0.85&&!noted){noted=true;logLine('> the next iteration is still being built.');}

    // the corner command-line: demoted, persistent, sacred
    const log=getLog();
    for(let i=0;i<log.length;i++)txt(log[i],40,H-30-(log.length-1-i)*20,DEEP,.85,13);

    st++;
    if(st>LEN)setMode('select');
  }
});
