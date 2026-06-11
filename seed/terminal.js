// terminal.js — the aux terminal: a separate phosphor readout above the cabinet,
// on BOTH desktop and mobile (Gerald, 2026-06-11): larger fonts, adjustable size
// (A− / A+), and scrollback to read older messages. Cabinet hardware like the
// deck — DOM injected here, styles in index.html's <style>. It is an external
// MAGNIFIER of the corner command-line; the canvas log (state.logLine/getLog via
// crt.txt) is sacred and stays exactly as it is. No mode/era code is touched.
import {getLog,onLog} from './state.js?v=244d1674';

const MAX=300;                 // scrollback depth (the canvas keeps its 5)
const FS_KEY='seed.term.fs';
const FS_MIN=12,FS_MAX=28;
const coarse=matchMedia('(pointer: coarse)').matches;

const term=document.createElement('div');
term.className='auxterm';
term.style.display='none';     // hidden until a corner-log era is on screen
term.innerHTML=
  '<div class="auxterm-head">'+
    '<span class="auxterm-label">TERMINAL</span>'+
    '<span class="auxterm-keys">'+
      '<button type="button" class="auxterm-btn" data-step="-1" aria-label="Smaller text">A−</button>'+
      '<button type="button" class="auxterm-btn" data-step="1" aria-label="Larger text">A+</button>'+
    '</span>'+
  '</div>'+
  '<div class="auxterm-scroll" role="log" aria-live="polite"></div>';
document.body.insertBefore(term,document.querySelector('.cabinet'));

const scroll=term.querySelector('.auxterm-scroll');

/* font size — persisted, clamped 12..28; bigger default where fingers read it */
let fs=parseInt(localStorage.getItem(FS_KEY),10);
if(!(fs>=FS_MIN&&fs<=FS_MAX))fs=coarse?17:15;
const applyFs=()=>{scroll.style.fontSize=fs+'px';};
applyFs();
term.querySelectorAll('.auxterm-btn').forEach(btn=>{
  btn.addEventListener('click',e=>{
    fs=Math.max(FS_MIN,Math.min(FS_MAX,fs+ +btn.dataset.step));
    try{localStorage.setItem(FS_KEY,String(fs));}catch(_){/* storage may be denied */}
    applyFs();
    // keyboard-activated clicks (detail 0) keep focus for accessibility;
    // pointer clicks blur so arrows/space keep driving the game.
    if(e.detail>0)btn.blur();
  });
});

/* stick-to-bottom — newest line follows; stop while the reader scrolls up
   (>8px off bottom), resume when they return to the bottom. */
let stick=true;
scroll.addEventListener('scroll',()=>{
  stick=(scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight)<=8;
});

function append(s){
  const prev=scroll.lastElementChild;
  if(prev)prev.classList.add('old');           // older lines dim; newest stays full amber
  const line=document.createElement('div');
  line.className='auxterm-line';
  line.textContent=s;
  scroll.appendChild(line);
  while(scroll.childElementCount>MAX)scroll.removeChild(scroll.firstElementChild);
  if(stick)scroll.scrollTop=scroll.scrollHeight;
}
for(const s of getLog())append(s);             // seed with whatever the corner log already holds
onLog(append);                                 // then mirror every accepted line

/* visible only in the corner-log eras; era-0/boot/select keep their space */
setInterval(()=>{
  const m=window.__seed&&window.__seed.getMode?window.__seed.getMode():'';
  const want=(m==='topdown'||m==='dungeon')?'':'none';
  if(term.style.display!==want){
    term.style.display=want;
    if(want===''&&stick)scroll.scrollTop=scroll.scrollHeight;
  }
},250);
