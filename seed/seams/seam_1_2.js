// seams/seam_1_2.js — the REAL 1→2 seam (bible §7: the seam is the interesting object).
// Entered from era-1's Y-confirm at the restored portal. The camera drops INTO the figure
// (bible §4 era 2: god's-eye omniscience is the artifice stripped; presence is born):
// the tile-world's grid lines converge and RISE into vertical wall-lines, the figure
// scales up past the camera and fades, darkness closes from the edges. The year ticks
// 1985→1987 into state.year. The corner command-line persists throughout — it is sacred.
// Ends in mode 'dungeon'; the next stage exists now.
import {registerMode,setMode,reduced} from '../engine.js';
import {ctx,clear,txt,drawFigure,W,H} from '../crt.js';
import {state,logLine,getLog} from '../state.js';
import {DIM,DEEP} from '../palette.js';

let st=0,LEN=260,darkLogged=false;

registerMode('seam_1_2',{
  enter(){
    st=0;LEN=reduced?30:260;darkLogged=false;
    logLine('> you step through.');
  },
  draw(){
    clear();
    const p=Math.min(1,st/LEN);
    state.year=Math.round(1985+2*p);

    // phase A — the era-1 grid converges and rises into vertical wall-lines.
    // Vertical lines drift toward perspective wall-edges bunched at centre (a corridor at
    // depth); horizontal lines rise off the top and fade: the floor plane tips up as the
    // god's-eye is lost.
    const conv=Math.min(1,p/0.55);
    ctx.strokeStyle=DEEP;ctx.lineWidth=1;
    for(let gx=0;gx<=W;gx+=40){
      const side=gx<W/2?-1:1;
      const target=W/2+side*(60+Math.abs(gx-W/2)*0.22);
      const x=gx+(target-gx)*conv;
      ctx.globalAlpha=0.5+0.3*conv;
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
    }
    for(let gy=0;gy<=H;gy+=40){
      const y=gy-conv*gy*0.9;
      ctx.globalAlpha=0.5*(1-conv);
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
    }
    ctx.globalAlpha=1;

    // phase B — the figure scales up past the camera and fades: we drop INTO her.
    if(p<0.7){
      const fp=p/0.7,s=1+fp*7,a=Math.max(0,1-fp*1.15);
      const fx=W/2,fy=H/2+p*120;
      if(a>0){
        ctx.save();
        ctx.translate(fx,fy);ctx.scale(s,s);ctx.translate(-fx,-fy);
        drawFigure(fx,fy,0,a);
        ctx.restore();
      }
    }

    // phase C — darkness closes from the edges.
    const d=Math.max(0,(p-0.45)/0.55);
    if(d>0){
      ctx.fillStyle='#000';ctx.globalAlpha=0.92;
      const ix=d*W*0.5,iy=d*H*0.5;
      ctx.fillRect(0,0,ix,H);ctx.fillRect(W-ix,0,ix,H);
      ctx.fillRect(0,0,W,iy);ctx.fillRect(0,H-iy,W,iy);
      ctx.globalAlpha=1;
    }

    txt(''+state.year,W-110,40,DIM,.7,15);
    if(p>0.85&&!darkLogged){darkLogged=true;logLine('> it is dark here.');}

    // the corner command-line: demoted, persistent, sacred — drawn over the dark
    const log=getLog();
    for(let i=0;i<log.length;i++)txt(log[i],40,H-30-(log.length-1-i)*20,DEEP,.85,13);

    st++;
    if(st>LEN)setMode('dungeon');
  }
});
