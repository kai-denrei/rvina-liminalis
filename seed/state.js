// state.js — the through-line (bible §7): the persisting verb's witnesses, the year/age
// counter, scores carried forward, and the command-line log that demotes but never leaves.
export const state={played:{ballistic:false,asteroid:false,tanks:false},year:1979,scores:{}};

export function anyPlayed(){return state.played.ballistic||state.played.asteroid||state.played.tanks;}

/* the command-line log — PoC semantics: skip if identical to last entry; cap 5, shift oldest */
const log=[];
export function logLine(s){if(log[log.length-1]!==s){log.push(s);if(log.length>5)log.shift();}}
export function getLog(){return log;}
