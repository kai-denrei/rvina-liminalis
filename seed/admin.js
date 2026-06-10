// admin.js — dev/test jump (pm.md decision 2026-06-11): ?admin=<target> in the URL
// skips the ladder and lands directly in a layer, pre-arming the state below it.
// Targets: select | ballistic | asteroid | tanks | seam | topdown (era1/limina) |
//          seam_1_2 | dungeon (era2) | seam_2_3 | off
// Invisible to players; works on phones and headless QA alike. Admin sessions never
// pollute a real save: main.js only wires the store when ?admin= is ABSENT.
import {setMode} from './engine.js';
import {state,flags,FLAG} from './state.js';

const ALIAS={era0:'select',basics:'select',era1:'topdown',limina:'topdown',limina1:'topdown',era2:'dungeon',dm:'dungeon'};
const VALID=new Set(['select','ballistic','asteroid','tanks','seam','topdown','seam_1_2','dungeon','seam_2_3','off']);

// QA handles — ride along on engine.js's window.__seed (created at import time).
if(window.__seed){window.__seed.flags=flags;window.__seed.state=state;}

const q=new URLSearchParams(location.search).get('admin');
if(q){
  const target=ALIAS[q.toLowerCase()]||q.toLowerCase();
  if(VALID.has(target)){
    // arm the era-0 goal flags beneath the target so the growing menu, goals and
    // years behave: ballistic needs nothing; asteroid needs ballistic done; tanks
    // needs ballistic+asteroid done; everything past era 0 needs all three.
    if(target==='asteroid')flags.set(FLAG.ERA0_BALLISTIC_DONE);
    else if(target==='tanks'){flags.set(FLAG.ERA0_BALLISTIC_DONE);flags.set(FLAG.ERA0_ASTEROID_DONE);}
    else if(target!=='ballistic'){flags.set(FLAG.ERA0_BALLISTIC_DONE);flags.set(FLAG.ERA0_ASTEROID_DONE);flags.set(FLAG.ERA0_TANKS_DONE);}
    if(target==='topdown'||target==='seam_1_2')state.year=1985;
    if(target==='dungeon'||target==='seam_2_3')state.year=1987;
    // engine starts in 'boot'; jump once the loop is alive
    setTimeout(()=>setMode(target),350);
  }
}
