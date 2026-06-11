// main.js — entry point. Modules self-register their modes on import; engine.start()
// is called last so the import graph stays acyclic (bible §7).
import {start} from './engine.js?v=244d1674';
import {setStore,load,save,autosaveOn} from './state.js?v=244d1674';
import './console.js?v=244d1674';
import './eras/era0_dot.js?v=244d1674';
import './eras/era1_tiles.js?v=244d1674';
import './eras/era2_map.js?v=244d1674';
import './eras/era2_inventory.js?v=244d1674';
import './eras/era2_dungeon.js?v=244d1674';
import './seams/seam_0_1.js?v=244d1674';
import './seams/seam_1_2.js?v=244d1674';
import './seams/seam_2_3.js?v=244d1674';
import './touch.js?v=244d1674';
import './terminal.js?v=244d1674';
import './pwa.js?v=244d1674';
import './admin.js?v=244d1674';
// Persistence wiring (STATE_MODULE.md caution #1): real sessions get the real store
// and autosave on every first-set flag; ?admin= sessions leave the store null so a
// dev/QA jump never pollutes a real save.
if(!new URLSearchParams(location.search).has('admin')){
  setStore(window.localStorage);
  load();
  autosaveOn(()=>save());
}
start();
