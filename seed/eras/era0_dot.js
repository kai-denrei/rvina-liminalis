// eras/era0_dot.js — era 0, The Dot (bible §3: the verb — fire, cause→consequence).
// BALLISTIC and ASTEROID are byte-faithful ports of the seed_console2.html PoC.
// TANKS is new: Atari Combat (1977) adapted to SEED monochrome amber — layout echoes
// CombatTankAttack.png (layout only, not colors). One shell per tank, no bounce
// (basic Combat — architectural decision). All text goes through crt.txt().
// Era-0 GOALS (the progression layer; game mechanics untouched): each game carries a
// one-time goal that sets its FLAG, grows the verb, and speaks a 'line' — then the game
// reverts to its original endless arcade self forever after.
import {registerMode,setMode,keys} from '../engine.js?v=0b3251d9';
import {ctx,clear,txt,blk,cw,W,H} from '../crt.js?v=0b3251d9';
import {state,flags,FLAG,verb,CAP} from '../state.js?v=0b3251d9';
import {AMBER,DIM,DEEP,WHITE} from '../palette.js?v=0b3251d9';

/* ---------- BALLISTIC (PoC port) ---------- */
const GND=H-60;
const turret={x:90,y:GND-15,angle:42,power:62};
let shotB=null,tgt={x:520,y:GND-6,hit:0},scoreB=0,flash=0;
let hitsB=0,shotsB=0; // era-0 goal counters: 3 hits within 7 shots (until ERA0_BALLISTIC_DONE)
function resetTgt(){tgt.x=340+Math.random()*360;tgt.hit=0;}
function fireB(){if(shotB)return;const r=turret.angle*Math.PI/180,v=turret.power*0.165;shotB={x:turret.x,y:turret.y,vx:Math.cos(r)*v,vy:-Math.sin(r)*v,trail:[]};if(!flags.has(FLAG.ERA0_BALLISTIC_DONE))shotsB++;}
// goal layer only — called when a shot resolves (hit or gone); the physics never changes
function ballisticGoal(hit){
  if(flags.has(FLAG.ERA0_BALLISTIC_DONE))return;
  if(hit){
    hitsB++;
    if(hitsB>=3&&shotsB<=7){
      verb.enable(CAP.MOVE); // the verb accretes: fire -> +move (before the flag, so autosave catches it)
      flags.set(FLAG.ERA0_BALLISTIC_DONE);
      setMode('line',{text:'We can FIRE at something...we have power over the world!'});
      return;
    }
  }
  if(shotsB>=7&&hitsB<3){hitsB=0;shotsB=0;} // 7 shots short of 3 hits: silent reset, fresh attempt
}
registerMode('ballistic',{
  enter(){resetTgt();if(!flags.has(FLAG.ERA0_BALLISTIC_DONE)){hitsB=0;shotsB=0;}},
  draw(t){
    clear();
    ctx.fillStyle=DEEP;ctx.fillRect(0,GND,W,2);
    ctx.fillStyle=AMBER;ctx.fillRect(turret.x-7,turret.y-2,14,10);
    const r=turret.angle*Math.PI/180;
    ctx.strokeStyle=AMBER;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(turret.x,turret.y);ctx.lineTo(turret.x+Math.cos(r)*26,turret.y-Math.sin(r)*26);ctx.stroke();
    const tp=.6+.4*Math.sin(t/8);
    if(tgt.hit<=0){blk(tgt.x,tgt.y-6,AMBER,tp,4);blk(tgt.x-4,tgt.y-2,AMBER,tp*.7,4);blk(tgt.x+4,tgt.y-2,AMBER,tp*.7,4);blk(tgt.x,tgt.y+2,AMBER,tp,4);}
    else{for(let i=0;i<12;i++)blk(tgt.x+(Math.random()*24-12),tgt.y-(Math.random()*24),AMBER,Math.random()*tgt.hit,4);tgt.hit-=.05;if(tgt.hit<=0)resetTgt();}
    if(shotB){shotB.trail.push({x:shotB.x,y:shotB.y});if(shotB.trail.length>16)shotB.trail.shift();shotB.trail.forEach((p,i)=>blk(p.x,p.y,AMBER,(i/shotB.trail.length)*.5,2));shotB.x+=shotB.vx;shotB.y+=shotB.vy;shotB.vy+=0.3;blk(shotB.x,shotB.y,'#fff',1,4);if(tgt.hit<=0&&Math.abs(shotB.x-tgt.x)<14&&Math.abs(shotB.y-(tgt.y-4))<14){tgt.hit=1;scoreB++;flash=8;shotB=null;ballisticGoal(true);}else if(shotB.x>W||shotB.y>GND){shotB=null;ballisticGoal(false);}}
    if(flash>0){ctx.fillStyle='rgba(255,178,74,'+(flash/30)+')';ctx.fillRect(0,0,W,H);flash--;}
    txt('ANGLE '+Math.round(turret.angle)+'°   PWR '+Math.round(turret.power),50,40,DIM,.9);
    if(flags.has(FLAG.ERA0_BALLISTIC_DONE))txt('HITS '+scoreB,W-130,40,AMBER,.9); // original endless HUD
    else{const gs='HITS '+hitsB+'/3   SHOTS '+shotsB+'/7';txt(gs,W-50-cw(gs),40,AMBER,.9);} // goal HUD
    txt('↑↓ AIM  ←→ POWER  SPACE FIRE   ESC MENU',50,H-38,DEEP,.9);
  },
  key(e){
    if(e.key==='ArrowUp')turret.angle=Math.min(88,turret.angle+2);if(e.key==='ArrowDown')turret.angle=Math.max(8,turret.angle-2);
    if(e.key==='ArrowRight')turret.power=Math.min(100,turret.power+2);if(e.key==='ArrowLeft')turret.power=Math.max(10,turret.power-2);
    if(e.key===' ')fireB();if(e.key==='Escape'){setMode('select');}
  }
});

/* ---------- ASTEROID (PoC port) ---------- */
let ship,bullets,rocks,scoreA;
function newRock(x,y,r){const verts=[];for(let i=0;i<9;i++)verts.push(.72+Math.random()*.45);const sp=(46-r)*0.018+0.2,a=Math.random()*6.28;return {x,y,r,verts,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,rot:Math.random()*6.28,vr:(Math.random()-.5)*.04};}
function wave(n){rocks=[];for(let i=0;i<n;i++){let x,y;do{x=Math.random()*W;y=Math.random()*H;}while(Math.hypot(x-W/2,y-H/2)<160);rocks.push(newRock(x,y,42));}}
function initAst(){ship={x:W/2,y:H/2,a:-Math.PI/2,vx:0,vy:0,inv:90};bullets=[];scoreA=0;wave(4);}
function wrap(o){if(o.x<0)o.x+=W;if(o.x>W)o.x-=W;if(o.y<0)o.y+=H;if(o.y>H)o.y-=H;}
function fireA(){if(bullets.length>4)return;bullets.push({x:ship.x+Math.cos(ship.a)*16,y:ship.y+Math.sin(ship.a)*16,vx:Math.cos(ship.a)*8+ship.vx,vy:Math.sin(ship.a)*8+ship.vy,life:55});}
function drawRock(rk){ctx.strokeStyle=AMBER;ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<rk.verts.length;i++){const ang=rk.rot+i/rk.verts.length*6.283,rr=rk.r*rk.verts[i],px=rk.x+Math.cos(ang)*rr,py=rk.y+Math.sin(ang)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.stroke();}
registerMode('asteroid',{
  enter(){initAst();},
  draw(t){
    clear();
    if(keys['ArrowLeft'])ship.a-=0.07;if(keys['ArrowRight'])ship.a+=0.07;
    const thrust=keys['ArrowUp'];
    if(thrust){ship.vx+=Math.cos(ship.a)*0.12;ship.vy+=Math.sin(ship.a)*0.12;}
    ship.vx*=0.992;ship.vy*=0.992;ship.x+=ship.vx;ship.y+=ship.vy;wrap(ship);if(ship.inv>0)ship.inv--;
    if(ship.inv<=0||Math.floor(t/4)%2===0){
      ctx.strokeStyle=AMBER;ctx.lineWidth=2;ctx.beginPath();const a=ship.a;
      ctx.moveTo(ship.x+Math.cos(a)*16,ship.y+Math.sin(a)*16);ctx.lineTo(ship.x+Math.cos(a+2.5)*11,ship.y+Math.sin(a+2.5)*11);ctx.lineTo(ship.x+Math.cos(a-2.5)*11,ship.y+Math.sin(a-2.5)*11);ctx.closePath();ctx.stroke();
      if(thrust&&Math.floor(t/3)%2===0){ctx.beginPath();ctx.moveTo(ship.x-Math.cos(a)*8,ship.y-Math.sin(a)*8);ctx.lineTo(ship.x-Math.cos(a)*16,ship.y-Math.sin(a)*16);ctx.stroke();}
    }
    bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.life--;wrap(b);blk(b.x,b.y,'#fff',1,3);});bullets=bullets.filter(b=>b.life>0);
    rocks.forEach(rk=>{rk.x+=rk.vx;rk.y+=rk.vy;rk.rot+=rk.vr;wrap(rk);drawRock(rk);});
    for(let i=rocks.length-1;i>=0;i--){const rk=rocks[i];for(let j=bullets.length-1;j>=0;j--){if(Math.hypot(rk.x-bullets[j].x,rk.y-bullets[j].y)<rk.r){bullets.splice(j,1);rocks.splice(i,1);scoreA++;if(rk.r>16){rocks.push(newRock(rk.x,rk.y,rk.r*0.55));rocks.push(newRock(rk.x,rk.y,rk.r*0.55));}break;}}}
    if(ship.inv<=0)for(const rk of rocks){if(Math.hypot(rk.x-ship.x,rk.y-ship.y)<rk.r+10){ship.x=W/2;ship.y=H/2;ship.vx=ship.vy=0;ship.inv=90;break;}}
    if(rocks.length===0){
      // era-0 goal: the FIRST cleared wave is the threshold (flags.set returns true
      // only on the first set — afterwards this is the original endless respawn)
      if(!flags.has(FLAG.ERA0_ASTEROID_DONE)){
        verb.enable(CAP.HOSTILE_AI); // fire+move proven -> the world may now want things (before the flag, so autosave catches it)
        flags.set(FLAG.ERA0_ASTEROID_DONE);
        setMode('line',{text:'We can Fire at something AND move...exhilarating!'});
      }
      wave(5);
    }
    txt('SCORE '+scoreA,50,40,AMBER,.9);
    txt('← → TURN   ↑ THRUST   SPACE FIRE   ESC MENU',50,H-38,DEEP,.9);
  },
  key(e){
    if(e.key===' ')fireA();if(e.key==='Escape'){setMode('select');}
  }
});

/* ---------- TANKS (new — Combat 1977, monochrome amber) ---------- */
const WALL=14,TR=11; // wall thickness, tank collision radius
const walls=[{x:0,y:0,w:W,h:WALL},{x:0,y:H-WALL,w:W,h:WALL},{x:0,y:0,w:WALL,h:H},{x:W-WALL,y:0,w:WALL,h:H}];
const obstacles=[
  {x:W/2-12,y:110,w:24,h:120},                                    // center bar, top
  {x:W/2-12,y:370,w:24,h:120},                                    // center bar, bottom (gap between)
  {x:170,y:288,w:90,h:24},                                        // horizontal bar, mid-left
  {x:540,y:288,w:90,h:24},                                        // horizontal bar, mid-right
  {x:70,y:210,w:16,h:180},{x:86,y:210,w:30,h:16},{x:86,y:374,w:30,h:16},     // left bracket [
  {x:714,y:210,w:16,h:180},{x:684,y:210,w:30,h:16},{x:684,y:374,w:30,h:16}   // right bracket ]
];
const solids=walls.concat(obstacles);
const P_HOME={x:150,y:H/2,a:0},E_HOME={x:650,y:H/2,a:Math.PI};
let P,E,aiWob=0,aiWobT=0,aiCool=0;
let autoDrive=0; // auto-drive latch: 1 fwd, -1 rev, 0 off — ↑/↓ toggle, player focuses on left-right (Gerald, 2026-06-11)
if(window.__seed)window.__seed.tanks={auto:()=>autoDrive,pos:()=>P?{x:P.x,y:P.y}:null}; // deck latch + headless probe
function mkTank(home){return {x:home.x,y:home.y,a:home.a,shell:null,spin:0,dvx:0,dvy:0};}
function resetTanks(){P=mkTank(P_HOME);E=mkTank(E_HOME);aiWob=0;aiWobT=0;aiCool=0;}
function hitRect(cx,cy,r){for(const rc of solids){const px=Math.max(rc.x,Math.min(cx,rc.x+rc.w)),py=Math.max(rc.y,Math.min(cy,rc.y+rc.h));if((cx-px)*(cx-px)+(cy-py)*(cy-py)<r*r)return true;}return false;}
function blockedT(nx,ny,other){return hitRect(nx,ny,TR)||Math.hypot(nx-other.x,ny-other.y)<TR*2;}
function angDiff(from,to){let d=to-from;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;}
function fireTank(tk){if(tk.shell||tk.spin>0)return;tk.shell={x:tk.x+Math.cos(tk.a)*24,y:tk.y+Math.sin(tk.a)*24,vx:Math.cos(tk.a)*5,vy:Math.sin(tk.a)*5,life:90};}
function shellStep(tk,target,who){
  const s=tk.shell;if(!s)return;
  s.x+=s.vx;s.y+=s.vy;s.life--;
  if(s.life<=0||hitRect(s.x,s.y,2)){tk.shell=null;return;}
  if(target.spin<=0&&Math.hypot(s.x-target.x,s.y-target.y)<12){
    const d=Math.atan2(target.y-s.y,target.x-s.x); // away from the impact
    target.spin=50;target.dvx=Math.cos(d)*1.5;target.dvy=Math.sin(d)*1.5;
    state.scores.tanks[who]++;tk.shell=null;return;
  }
  blk(s.x,s.y,WHITE,1,3);
}
function spinStep(tk,home,other){
  tk.a+=.35;
  const nx=tk.x+tk.dvx,ny=tk.y+tk.dvy;
  if(!blockedT(nx,ny,other)){tk.x=nx;tk.y=ny;}
  tk.spin--;
  if(tk.spin<=0){tk.x=home.x;tk.y=home.y;tk.a=home.a;}
}
function drawTank(tk,c,filled){
  ctx.save();ctx.translate(tk.x,tk.y);ctx.rotate(tk.a);
  ctx.lineWidth=2;
  if(filled){ctx.fillStyle=c;ctx.fillRect(-12,-11,24,4);ctx.fillRect(-12,7,24,4);ctx.fillRect(-10,-7,20,14);}
  else{ctx.strokeStyle=c;ctx.strokeRect(-12,-11,24,4);ctx.strokeRect(-12,7,24,4);ctx.strokeRect(-10,-7,20,14);}
  ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(24,0);ctx.stroke(); // 14px barrel
  ctx.restore();
}
registerMode('tanks',{
  enter(){
    if(!state.scores.tanks)state.scores.tanks={p:0,e:0}; // scores persist for the session
    autoDrive=0;
    resetTanks();
  },
  draw(t){
    clear();
    // arena
    ctx.fillStyle=DEEP;walls.forEach(rc=>ctx.fillRect(rc.x,rc.y,rc.w,rc.h));
    ctx.globalAlpha=.8;ctx.fillStyle=DIM;obstacles.forEach(rc=>ctx.fillRect(rc.x,rc.y,rc.w,rc.h));ctx.globalAlpha=1;
    // player — chunky rotation, lumbering drive
    if(P.spin>0)spinStep(P,P_HOME,E);
    else{
      if(keys['ArrowLeft'])P.a-=0.045;if(keys['ArrowRight'])P.a+=0.045;
      const mv=autoDrive===1?1.5:autoDrive===-1?-0.8:0; // auto-drive: same speeds as the old held-key drive
      if(mv){const nx=P.x+Math.cos(P.a)*mv,ny=P.y+Math.sin(P.a)*mv;if(!blockedT(nx,ny,E)){P.x=nx;P.y=ny;}}
    }
    // enemy — era-0 dumb, visibly mechanical
    if(E.spin>0)spinStep(E,E_HOME,P);
    else{
      aiWobT++;if(aiWobT>=45){aiWobT=0;aiWob=(Math.random()-.5)*0.8;} // ±0.4 wobble, re-rolled ~45f
      const ang=Math.atan2(P.y-E.y,P.x-E.x),err=angDiff(E.a,ang);
      const steer=angDiff(E.a,ang+aiWob);
      E.a+=Math.max(-0.03,Math.min(0.03,steer));
      if(Math.hypot(P.x-E.x,P.y-E.y)>180){
        const nx=E.x+Math.cos(E.a)*1.5,ny=E.y+Math.sin(E.a)*1.5;
        if(!blockedT(nx,ny,P)){E.x=nx;E.y=ny;}
        else E.a+=0.05; // blocked: rotate until clear
      }
      if(aiCool>0)aiCool--;
      if(Math.abs(err)<0.15&&!E.shell&&aiCool<=0){fireTank(E);aiCool=50;}
    }
    drawTank(P,AMBER,true);
    drawTank(E,DIM,false);
    shellStep(P,E,'p');
    shellStep(E,P,'e');
    const sc=state.scores.tanks;
    // era-0 goal: first to 3 hits. Player first -> the threshold (fear named, verbs grow).
    // Enemy first -> both scores fall back to 0-0 and play continues: the machine forgets.
    if(!flags.has(FLAG.ERA0_TANKS_DONE)){
      if(sc.p>=3){
        verb.enable(CAP.QUEST,CAP.PARTY,CAP.RIDDLE); // the era-1 stack (STATE_MODULE.md) — before the flag, so autosave catches it
        flags.set(FLAG.ERA0_TANKS_DONE);
        setMode('line',{text:'That enemy wanted to hunt us down... sometimes the world can want something against us... is this fear?'});
      }else if(sc.e>=3){sc.p=0;sc.e=0;}
    }
    // HUD — Combat's score strip, adapted
    txt('YOU '+sc.p,50,40,AMBER,.9);
    if(autoDrive!==0)txt(autoDrive===1?'AUTO ▲':'AUTO ▼',50,62,AMBER,.9,12); // engaged indicator, under YOU
    txt('IT '+sc.e,W-130,40,DIM,.9);
    txt('← → TURN   ↑ AUTO-FWD   ↓ AUTO-REV   SPACE FIRE   ESC MENU',50,H-38,DEEP,.9);
  },
  key(e){
    if(e.key==='ArrowUp'||e.key==='ArrowDown'){
      if(e.repeat)return; // physical hold must not re-toggle the latch
      if(e.key==='ArrowUp')autoDrive=autoDrive===1?0:1;
      else autoDrive=autoDrive===-1?0:-1;
    }
    if(e.key===' ')fireTank(P);
    if(e.key==='Escape'){setMode('select');}
  }
});
