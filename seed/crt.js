// crt.js — this file IS the accretion layer (bible §7).
// The same txt() that prints READY. at boot prints every later era's words: the command-line
// is sacred — it demotes (boot screen → corner log → dialogue → subtitle) but never changes
// engine. Never re-implement text per era; never set ctx.font or call fillText outside this file.
// Helper bodies are byte-faithful ports of the seed_console2.html PoC.
import {AMBER} from './palette.js';

export const W=800,H=600;
export let ctx;

export function init(canvas){ctx=canvas.getContext('2d');canvas.width=W;canvas.height=H;}

export function clear(){ctx.fillStyle='#080604';ctx.fillRect(0,0,W,H);}
export function txt(str,x,y,c=AMBER,a=1,s=15){ctx.globalAlpha=a;ctx.fillStyle=c;ctx.font=s+'px "JetBrains Mono",monospace';ctx.textBaseline='top';ctx.fillText(str,x,y);ctx.globalAlpha=1;}
export function blk(x,y,c,a=1,s=3){ctx.globalAlpha=a;ctx.fillStyle=c;ctx.fillRect(x|0,y|0,s,s);ctx.globalAlpha=1;}
export function cw(str,s=15){ctx.font=s+'px "JetBrains Mono",monospace';return ctx.measureText(str).width;}

/* ---------- shared figure ---------- */
export function drawFigure(x,y,dir,a=1){
  ctx.globalAlpha=a;ctx.strokeStyle=AMBER;ctx.fillStyle=AMBER;ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(x,y-6,4,0,6.283);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,y-2);ctx.lineTo(x,y+8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-5,y+2);ctx.lineTo(x+5,y+2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,y+8);ctx.lineTo(x-4,y+16);ctx.moveTo(x,y+8);ctx.lineTo(x+4,y+16);ctx.stroke();
  blk(x+Math.cos(dir)*12,y+2+Math.sin(dir)*12,'#fff',a,3);
  ctx.globalAlpha=1;
}
export function drawMini(x,y,c=AMBER,a=1){ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-3,3.2,0,6.283);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+8);ctx.moveTo(x,y+8);ctx.lineTo(x-3,y+14);ctx.moveTo(x,y+8);ctx.lineTo(x+3,y+14);ctx.stroke();ctx.globalAlpha=1;}
