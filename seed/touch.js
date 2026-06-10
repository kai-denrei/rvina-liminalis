// touch.js — control deck for coarse-pointer machines. Cabinet hardware, not phosphor:
// the deck is DOM/CSS (styles live in index.html's <style>), injected only when the
// primary pointer is coarse, so desktop layout stays pixel-identical. Input flows through
// engine's virtual-key API (pressKey/repeatKey/releaseKey) — modes see exactly the same
// keys{} map and key(e) events as a physical keyboard. No mode/era code is touched.
import {pressKey,repeatKey,releaseKey} from './engine.js';

const REPEAT_MS=90; // ~OS key-repeat cadence — ballistic aim and menu nav rely on repeated keydown

if(matchMedia('(pointer: coarse)').matches){
  const deck=document.createElement('div');
  deck.className='deck';
  deck.innerHTML=
    '<div class="dpad">'+
      '<button type="button" class="dk up" data-key="ArrowUp" aria-label="Up">▲</button>'+
      '<button type="button" class="dk left" data-key="ArrowLeft" aria-label="Left">◀</button>'+
      '<button type="button" class="dk right" data-key="ArrowRight" aria-label="Right">▶</button>'+
      '<button type="button" class="dk down" data-key="ArrowDown" aria-label="Down">▼</button>'+
    '</div>'+
    '<div class="acts">'+
      '<div class="act"><button type="button" class="dk fire" data-key=" " aria-label="Fire"></button><span class="label">FIRE</span></div>'+
      '<div class="act"><button type="button" class="dk menu" data-key="i" data-norepeat="1" aria-label="Inventory" style="font-size:18px;color:#ffb24a;font-family:inherit">i</button><span class="label" style="font-size:11px">PACK</span></div>'+
      '<div class="act"><button type="button" class="dk menu" data-key="Escape" aria-label="Menu"></button><span class="label">MENU</span></div>'+
    '</div>';
  deck.addEventListener('contextmenu',e=>e.preventDefault());
  document.querySelector('.cabinet').appendChild(deck);

  deck.querySelectorAll('button[data-key]').forEach(btn=>{
    const k=btn.dataset.key;
    let timer=null;
    const release=()=>{
      if(timer!==null){clearInterval(timer);timer=null;}
      btn.classList.remove('held');
      releaseKey(k);
    };
    btn.addEventListener('pointerdown',e=>{
      e.preventDefault();
      try{btn.setPointerCapture(e.pointerId);}catch(_){/* capture can fail if pointer already gone */}
      btn.classList.add('held');
      pressKey(k);
      if(timer!==null)clearInterval(timer);
      if(!btn.dataset.norepeat)timer=setInterval(()=>repeatKey(k),REPEAT_MS); // INV is a toggle: press/release only
    });
    btn.addEventListener('pointerup',release);
    btn.addEventListener('pointercancel',release);
    btn.addEventListener('pointerleave',release);
  });

  // In the dungeon, ◀ ▶ TURN rather than strafe — show what they do (Gerald, 2026-06-11)
  const L=deck.querySelector('.dk.left'),R=deck.querySelector('.dk.right');
  setInterval(()=>{
    const d=window.__seed&&window.__seed.getMode&&window.__seed.getMode()==='dungeon';
    if(L.textContent!==(d?'↺':'◀'))L.textContent=d?'↺':'◀';
    if(R.textContent!==(d?'↻':'▶'))R.textContent=d?'↻':'▶';
  },250);
}
