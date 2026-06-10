// main.js — entry point. Modules self-register their modes on import; engine.start()
// is called last so the import graph stays acyclic (bible §7).
import {start} from './engine.js';
import {setStore,load,save,autosaveOn} from './state.js';
import './console.js';
import './eras/era0_dot.js';
import './eras/era1_tiles.js';
import './eras/era2_map.js';
import './eras/era2_inventory.js';
import './eras/era2_dungeon.js';
import './seams/seam_0_1.js';
import './seams/seam_1_2.js';
import './seams/seam_2_3.js';
import './touch.js';
import './pwa.js';
import './admin.js';
// Persistence wiring (STATE_MODULE.md caution #1): real sessions get the real store
// and autosave on every first-set flag; ?admin= sessions leave the store null so a
// dev/QA jump never pollutes a real save.
if(!new URLSearchParams(location.search).has('admin')){
  setStore(window.localStorage);
  load();
  autosaveOn(()=>save());
}
start();
