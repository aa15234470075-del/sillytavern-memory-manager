// Local per-chat recovery, never contains API keys.
const prefix='st_memory_manager:session:';
export function saveSession(chat,value){localStorage.setItem(prefix+chat,JSON.stringify({...value,schema:1,at:Date.now()}));}
export function loadSession(chat){try{const v=JSON.parse(localStorage.getItem(prefix+chat)||'null');return v?.schema===1?v:null;}catch{return null;}}
export function coveredFloors(store){
 const reopened=new Set(store.reopenedFloors||[]),batches=store.batches||[];
 const knownRanges=new Set(batches.filter(b=>b.level===1).flatMap(b=>b.selectedFloors||b.floors||[]));
 const orphanFloors=(store.memories||[]).filter(m=>!m.imported&&m.status!=='index').flatMap(m=>m.sources||m.selectedFloors||[]).filter(f=>!knownRanges.has(f));
 return [...new Set([...(store.ignoredFloors||[]),...batches.filter(b=>b.approved&&b.level===1).flatMap(b=>b.floors||[]),...orphanFloors])].filter(f=>!reopened.has(f));
}
export function nextFloor(store,start=0){const reopened=new Set(store.reopenedFloors||[]),covered=new Set([...coveredFloors(store),...(store.batches||[]).filter(b=>b.approved&&b.level===1).flatMap(b=>b.selectedFloors||b.floors||[])].filter(f=>!reopened.has(f)));let n=Math.max(0,Number(start)||0);while(covered.has(n))n++;return n;}
export function automaticStart(store,start=0){return nextFloor(store,start);}
export const SPLIT_RULES='【拆分边界】事件单位是连续场景中的完整因果链，不是每个人物配对、动作或一句对白。同一场对峙中A与B、B与C、A与C的交互合为一条，写清起因、行动、回应和结果；不可按三组人物拆三条。只有独立事件链开始、场景实质切换或上一事件结束且新阶段开始才分条。时间单位是剧情阶段，不是固定分钟数：同一场景十分钟内的动作和对话不分条，“过了一会儿”也不单独拆分；只有明确跨日、昼夜转换或足以改变剧情阶段的时间跳跃才分条。不编造日期，不得创造时间或事件来凑数。';
export function countInstruction(mode,count){return (mode==='single'?'本次将所选材料合成恰好1条记忆。':mode==='count'?'本次输出恰好'+Math.max(1,Number(count)||1)+'条记忆；不创造事实凑数。':mode==='time'?'本次按原文明示的实质时间阶段拆分；连续场景合并，弱时间参照不分条。':'本次按完整事件链拆分；场景事件链优先于人物配对。')+'\n'+SPLIT_RULES;}
export function cleanConfiguration(value){
 const blocked=/^(?:.*(?:key|secret|password|token|baseurl|endpoint|proxy|connection|credential).*|model|checkmodel|repairmodel|profiles|attics|booksByCharacter|worldBooks)$/i;
 const walk=v=>Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!blocked.test(k)||['keywordRule','keywordMin','keywordCase','keywordWindow','keywords','rememberKeys'].includes(k)).map(([k,x])=>[k,walk(x)])):v;
 return walk(value);
}
