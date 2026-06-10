// engine.js — rAF loop, mode registry, input bus, reduced-motion (bible §7).
// Owns the DOM and the clock. Imports crt only (never mode modules); modes self-register
// via registerMode() on import, and main.js calls start() — keeps the import graph acyclic.
import * as crt from './crt.js';

export const keys={};
export const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;

const modes={};
let mode='boot';
let t=0;

export function registerMode(name,def){modes[name]=def;}
export function setMode(name,payload){mode=name;const def=modes[name];if(def&&def.enter)def.enter(payload);}

/* ---------- loop (phosphor flicker ported verbatim from the PoC) ---------- */
function loop(){
  t++;
  const def=modes[mode];
  if(def)def.draw(t);
  if(!reduced&&Math.random()<0.04){crt.ctx.fillStyle='rgba(255,178,74,0.015)';crt.ctx.fillRect(0,0,crt.W,crt.H);}
  requestAnimationFrame(loop);
}
let started=false;
function begin(){if(started)return;started=true;loop();}

/* ---------- input bus ---------- */
addEventListener('keyup',e=>{keys[e.key]=false;});
addEventListener('keydown',e=>{
  keys[e.key]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
  const def=modes[mode];
  if(def&&def.key)def.key(e);
});

/* ---------- start: crt.init, power button, font-load gate (PoC port), then loop ---------- */
export function start(){
  const cv=document.getElementById('c');
  const screen=document.getElementById('screen');
  const powerBtn=document.getElementById('power');
  crt.init(cv);

  powerBtn.addEventListener('click',()=>{
    if(mode!=='off'){
      screen.classList.add('off');powerBtn.classList.add('dead');
      setTimeout(()=>{setMode('off');screen.classList.remove('off');cv.style.opacity='1';cv.style.transform='none';cv.style.filter='none';},reduced?50:560);
    }else{
      powerBtn.classList.remove('dead');setMode('boot');
    }
  });

  setMode('boot'); // engine starts in mode 'boot'

  if(document.fonts&&document.fonts.load){
    Promise.all([document.fonts.load('15px "JetBrains Mono"'),document.fonts.load('700 15px "JetBrains Mono"')]).then(begin).catch(begin);
    setTimeout(begin,1500);
  }else begin();
}
