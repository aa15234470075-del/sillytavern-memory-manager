// Local per-chat recovery, never contains API keys.
const prefix='st_memory_manager:session:';
export function saveSession(chat,value){localStorage.setItem(prefix+chat,JSON.stringify({...value,schema:1,at:Date.now()}));}
export function loadSession(chat){try{const v=JSON.parse(localStorage.getItem(prefix+chat)||'null');return v?.schema===1?v:null;}catch{return null;}}
export function nextFloor(store,start=0){const covered=new Set(store.batches.filter(b=>b.approved&&b.level===1).flatMap(b=>b.selectedFloors||b.floors));let n=Math.max(0,Number(start)||0);while(covered.has(n))n++;return n;}
export function countInstruction(mode,count){return mode==='single'?'本次将所选材料合成恰好1条记忆。':mode==='count'?'本次输出恰好'+Math.max(1,Number(count)||1)+'条记忆；按事件划分，不创造事实凑数。':'按事件合理拆分记忆条目，避免重复。';}
export function cleanConfiguration(value){
 const blocked=/^(?:.*(?:key|secret|password|token|baseurl|endpoint|proxy|connection|credential).*|model|checkmodel|repairmodel|profiles|attics|booksByCharacter|worldBooks)$/i;
 const walk=v=>Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!blocked.test(k)||['keywordRule','keywordMin','keywordCase','keywordWindow','keywords','rememberKeys'].includes(k)).map(([k,x])=>[k,walk(x)])):v;
 return walk(value);
}
