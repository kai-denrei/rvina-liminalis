// seams/seam_0_1.js — console → tiles (bible §7: the seam is the interesting object).
// Byte-faithful port of the PoC drawSeam: year tick 1979→1985 (written into state.year as it
// goes — era 1 reads it), grid bleed, figure resolve at p>0.6. The three seam log lines are
// pushed through state.logLine as they appear so they persist into era 1.
// The FINAL line '> is there an outside?' renders in TEAL — the second colour's first and only
// V1 appearance (PM/story decision; do not use TEAL anywhere else).
import {registerMode,setMode,reduced} from '../engine.js?v=0b3251d9';
import {ctx,clear,txt,drawFigure,W,H} from '../crt.js?v=0b3251d9';
import {state,logLine} from '../state.js?v=0b3251d9';
import {DIM,DEEP,TEAL} from '../palette.js?v=0b3251d9';

let seamT=0,pushed=0;
const SEAM_LEN=reduced?20:200;
const seamLog=['> boot','> the screen got bigger','> is there an outside?'];

registerMode('seam',{
  enter(){seamT=0;pushed=0;},
  draw(t){
    clear();
    const p=Math.min(1,seamT/SEAM_LEN);
    state.year=Math.round(1979+(1985-1979)*p);
    txt(''+state.year,W-110,40,DIM,.7,15);
    const shown=Math.floor(p*seamLog.length+0.5);
    while(pushed<shown&&pushed<seamLog.length){logLine(seamLog[pushed]);pushed++;}
    for(let i=0;i<shown&&i<seamLog.length;i++)txt(seamLog[i],40,H-110+i*22,i===seamLog.length-1?TEAL:DEEP,.8,13);
    const gp=Math.max(0,(p-0.2)/0.6);ctx.strokeStyle=DEEP;ctx.lineWidth=1;ctx.globalAlpha=0.5*gp;
    for(let x=0;x<=W;x+=40){if(x/W<=gp){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}}
    for(let y=0;y<=H;y+=40){if(y/H<=gp){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}}
    ctx.globalAlpha=1;
    if(p>0.6)drawFigure(W/2,H/2,0,(p-0.6)/0.4);
    seamT++;
    if(seamT>=SEAM_LEN+(reduced?0:30))setMode('topdown');
  }
});
