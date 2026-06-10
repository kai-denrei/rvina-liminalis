// eras/era1_tiles.js — era 1, the Tile World: the Ultima-IV loop (bible §4, §8).
// Byte-faithful port of the PoC drawTop/initTop, with two contract changes:
//   (a) the local topLog is replaced by state.logLine/getLog — the corner command-line
//       is THE persistent log handed across seams (the command-line is sacred, bible §7);
//   (b) the displayed year reads state.year.
// Storyline (2026-06-10): the locked door is the collapsed PORTAL — the threshold itself
// (RVINA LIMINALIS). The wizard's quest restores it. Companions are named in join order:
// Cardea (goddess of hinges and thresholds), then Iolo (Ultima companion grammar).
import {registerMode,setMode,keys} from '../engine.js';
import {ctx,clear,txt,blk,drawFigure,drawMini,W,H} from '../crt.js';
import {state,logLine,getLog} from '../state.js';
import {AMBER,DIM,DEEP} from '../palette.js';

let fig,bolts,edgeNoted,movedFar;
let wizard,friends,marsh,door,trail,recruited,party,hasRoot,quest,moonClock;
const NAMES=['Cardea','Iolo'];
const PHASE=150;
function moonIdx(){return Math.floor(moonClock/PHASE)%8;}
function moonIllum(){return 1-Math.abs(moonIdx()-4)/4;}
function moonFull(){return moonIdx()===4;}
function initTop(){
  fig={x:W/2,y:H/2,dir:0};trail=[];bolts=[];
  recruited=0;party=[];hasRoot=false;quest='idle';moonClock=0;edgeNoted=false;movedFar=0;
  wizard={x:110,y:110};
  friends=[{x:690,y:490,got:false},{x:160,y:480,got:false}];
  marsh={x:560,y:300};
  door={x:710,y:100,open:false};
  logLine('> '+state.year);logLine('> the portal has collapsed!');logLine('> seek the Wizard to restore it.');
}
function drawMoon(cx,cy){
  const il=moonIllum(),full=moonFull();
  if(full){ctx.globalAlpha=.5;ctx.fillStyle=AMBER;ctx.beginPath();ctx.arc(cx,cy,20,0,6.283);ctx.fill();ctx.globalAlpha=1;}
  ctx.strokeStyle=DIM;ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,12,0,6.283);ctx.stroke();
  ctx.fillStyle=full?AMBER:DIM;ctx.globalAlpha=full?1:.8;ctx.beginPath();ctx.arc(cx,cy,12*il,0,6.283);ctx.fill();ctx.globalAlpha=1;
  txt(full?'FULL MOON':'moon',cx-(full?30:18),cy+16,full?AMBER:DEEP,full?.9:.7,11);
}
function drawTop(t){
  clear();
  moonClock++;
  // world grid (same amber + scanlines as era zero — accretion)
  ctx.strokeStyle=DEEP;ctx.lineWidth=1;ctx.globalAlpha=.5;
  for(let x=0;x<=W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<=H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.globalAlpha=1;
  // movement
  let dx=0,dy=0,sp=2.4;
  if(keys['ArrowLeft'])dx-=1;if(keys['ArrowRight'])dx+=1;if(keys['ArrowUp'])dy-=1;if(keys['ArrowDown'])dy+=1;
  if(dx||dy){fig.dir=Math.atan2(dy,dx);movedFar+=sp;}
  fig.x+=dx*sp;fig.y+=dy*sp;
  const m=30,cl=Math.max(m,Math.min(W-m,fig.x)),cly=Math.max(m,Math.min(H-m,fig.y));
  if((fig.x!==cl||fig.y!==cly)&&!edgeNoted){edgeNoted=true;logLine('> the world has an edge. for now.');}
  fig.x=cl;fig.y=cly;
  trail.push({x:fig.x,y:fig.y});if(trail.length>260)trail.shift();
  if(movedFar>240)logLine('> where does it go when you turn it off?');

  // marsh (mandrake site)
  ctx.strokeStyle=moonFull()?AMBER:DIM;ctx.lineWidth=2;ctx.globalAlpha=moonFull()?.9:.6;
  for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(marsh.x+i*5,marsh.y+8);ctx.lineTo(marsh.x+i*5,marsh.y-8-(i%2?4:0));ctx.stroke();}
  ctx.globalAlpha=1;
  if(moonFull()){ctx.globalAlpha=.18;ctx.fillStyle=AMBER;ctx.beginPath();ctx.arc(marsh.x,marsh.y,30,0,6.283);ctx.fill();ctx.globalAlpha=1;}

  // the portal (threshold to the next era — collapsed until restored; a bit bigger once open)
  const pw=door.open?32:24,ph=door.open?44:32;
  ctx.strokeStyle=door.open?AMBER:DIM;ctx.lineWidth=2;ctx.strokeRect(door.x-pw/2,door.y-ph/2,pw,ph);
  if(!door.open)txt('?',door.x-4,door.y-8,DIM,.6,15);
  else{ctx.globalAlpha=.25;ctx.fillStyle=AMBER;ctx.fillRect(door.x-pw/2,door.y-ph/2,pw,ph);ctx.globalAlpha=1;}

  // wizard
  drawFigure(wizard.x,wizard.y,1.2,.95);
  ctx.strokeStyle=AMBER;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(wizard.x-6,wizard.y-10);ctx.lineTo(wizard.x,wizard.y-20);ctx.lineTo(wizard.x+6,wizard.y-10);ctx.stroke();
  txt('wizard',wizard.x-22,wizard.y+20,DEEP,.7,11);

  // friends (uncrecruited)
  friends.forEach(f=>{if(!f.got){drawMini(f.x,f.y,DIM,.7+.3*Math.sin(t/12));}});

  // companions trail behind the player
  for(let k=0;k<recruited;k++){const idx=trail.length-1-(k+1)*16;if(idx>=0){const p=trail[idx];drawMini(p.x,p.y,AMBER,.95);}}

  // bolts (the persisting verb)
  bolts.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.life--;blk(b.x,b.y,'#fff',1,3);});
  bolts=bolts.filter(b=>b.life>0&&b.x>0&&b.x<W&&b.y>0&&b.y<H);

  // player
  drawFigure(fig.x,fig.y,fig.dir);

  // ---- quest logic ----
  // recruit on contact (the end of solitude) — named in join order
  friends.forEach(f=>{if(!f.got&&Math.hypot(fig.x-f.x,fig.y-f.y)<22){f.got=true;recruited++;const name=NAMES[recruited-1]||'a stranger';party.push(name);logLine('> '+name+' has joined your party!');}});
  // marsh harvest — the world keeps its own clock
  if(quest==='active'&&Math.hypot(fig.x-marsh.x,fig.y-marsh.y)<26){
    if(moonFull()&&!hasRoot){hasRoot=true;logLine('> mandrake root, pulled under the full moon.');}
    else if(!moonFull()&&!hasRoot)logLine('> the marsh is barren. wait for the full moon.');
  }
  // wizard: accept, then complete
  if(Math.hypot(fig.x-wizard.x,fig.y-wizard.y)<32){
    if(quest==='idle'){quest='active';logLine('> wizard: bring two companions,');logLine('> the mandrake from the marsh at full moon,');logLine('> and i will restore the portal.');}
    else if(quest==='active'&&recruited>=2&&hasRoot){quest='done';door.open=true;logLine('> the wizard restores the portal.');logLine('> the portal is open.');}
  }
  // TODO seam_1_2 triggers here (era 2 is the next build, not V1)
  if(door.open&&Math.hypot(fig.x-door.x,fig.y-door.y)<26)logLine('> outside is bigger than inside.');

  // HUD — companion names show up top once recruited
  drawMoon(W/2,60);
  txt((party.length?party.join(' · ').toUpperCase():'PARTY 0/2')+(hasRoot?'   ROOT ✓':''),50,40,AMBER,.9,15);
  txt(''+state.year,W-110,40,DIM,.7,15);
  txt('arrows move · space fire · esc menu',W-330,H-30,DEEP,.7,12);
  // corner command-line: the console, demoted but never gone
  const log=getLog();
  for(let i=0;i<log.length;i++)txt(log[i],40,H-30-(log.length-1-i)*20,DEEP,.85,13);
}

registerMode('topdown',{
  enter(){initTop();},
  draw(t){drawTop(t);},
  key(e){
    if(e.key===' ')bolts.push({x:fig.x,y:fig.y,vx:Math.cos(fig.dir)*6,vy:Math.sin(fig.dir)*6,life:120});
    if(e.key==='Escape')setMode('select');
  }
});
