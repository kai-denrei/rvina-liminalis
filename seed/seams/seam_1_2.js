// seams/seam_1_2.js — STUB of the 1→2 seam. Era 2 (the Dungeon — Dungeon Master 1987,
// bible §4) is the next build; the real seam drops the camera INTO the figure (presence).
// For now: the tile world goes dark, the corner command-line persists — it always
// persists — the year ticks 1985→1987, and the machine admits the next stage isn't
// built yet. Then back to select.
import {registerMode,setMode,reduced} from '../engine.js';
import {clear,txt,W,H} from '../crt.js';
import {state,logLine,getLog} from '../state.js';
import {DIM,DEEP} from '../palette.js';

let st=0,LEN=260,HOLD=200;
registerMode('seam_1_2',{
  enter(){
    st=0;LEN=reduced?30:260;HOLD=reduced?30:200;
    logLine('> you step through.');
  },
  draw(){
    clear();
    const p=Math.min(1,st/LEN);
    state.year=Math.round(1985+2*p);
    txt(''+state.year,W-110,40,DIM,.7,15);
    if(st===LEN)logLine('> the next stage is still being built.');
    // the corner command-line: demoted, persistent, sacred
    const log=getLog();
    for(let i=0;i<log.length;i++)txt(log[i],40,H-30-(log.length-1-i)*20,DEEP,.85,13);
    st++;
    if(st>LEN+HOLD)setMode('select');
  }
});
