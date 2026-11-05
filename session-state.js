// Local per-chat recovery, never contains API keys.
const prefix='st_memory_manager:session:';
export function saveSession(chat,value){localStorage.setItem(prefix+chat,JSON.stringify({...value,schema:1,at:Date.now()}));}
export function loadSession(chat){try{const v=JSON.parse(localStorage.getItem(prefix+chat)||'null');return v?.schema===1?v:null;}catch{return null;}}
export function coveredFloors(store){return [...new Set([...(store.ignoredFloors||[]),...store.batches.filter(b=>b.approved&&b.level===1).flatMap(b=>b.floors||[])])];}
export function nextFloor(store,start=0){const covered=new Set([...coveredFloors(store),...store.batches.filter(b=>b.approved&&b.level===1).flatMap(b=>b.selectedFloors||b.floors)]);let n=Math.max(0,Number(start)||0);while(covered.has(n))n++;return n;}
export function automaticStart(store,start=0){return nextFloor(store,start);}
export function countInstruction(mode,count){return mode==='single'?'本次将所选材料合成恰好1条记忆。':mode==='count'?'本次输出恰好'+Math.max(1,Number(count)||1)+'条记忆；按事件划分，不创造事实凑数。':mode==='time'?'按原文明确的时间阶段拆分记忆：同一连续时段合并，发生明确时间转换时分条；时间不明时按先后顺序组织，不编造日期，不为拆分创造事实。':'按事件合理拆分记忆条目，避免重复。';}
export function cleanConfiguration(value){
 const blocked=/^(?:.*(?:key|secret|password|token|baseurl|endpoint|proxy|connection|credential).*|model|checkmodel|repairmodel|profiles|attics|booksByCharacter|worldBooks)$/i;
 const walk=v=>Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!blocked.test(k)||['keywordRule','keywordMin','keywordCase','keywordWindow','keywords','rememberKeys'].includes(k)).map(([k,x])=>[k,walk(x)])):v;
 return walk(value);
}
