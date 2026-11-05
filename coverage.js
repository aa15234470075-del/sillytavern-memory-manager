// Reopen removed source ranges explicitly, including legacy batches without IDs.
// Hidden floors are never read, changed, or used as saved coverage here.
export function reconcileCoverage(store,deleted=[]){
 const memories=store.memories||[],live=new Set(memories.map(m=>m.id)),children=new Map();
 for(const m of memories)for(const id of m.parentIds||[])children.set(id,[...(children.get(id)||[]),m.id]);
 for(const b of store.batches||[])for(const id of b.parentIds||[])children.set(id,[...(children.get(id)||[]),...(b.ids||[])]);
 const represented=(id,seen=new Set())=>{if(live.has(id))return true;if(seen.has(id))return false;seen.add(id);return (children.get(id)||[]).some(x=>represented(x,seen));};
 const reopened=new Set(store.reopenedFloors||[]);let rewind=null;
 const reopen=floors=>{for(const f of floors||[])if(Number.isInteger(f)){reopened.add(f);rewind=Math.min(rewind??Infinity,f);}};
 for(const item of deleted){const id=typeof item==='string'?item:item.id;if(represented(id))continue;reopen(typeof item==='string'?store.deletedSources?.[id]:item.selectedFloors||item.sources);}
 for(const b of store.batches||[]){if(!b.approved||b.level!==1||!b.ids?.length)continue;
  const missing=b.ids.filter(id=>!represented(id));if(!missing.length)continue;
  const exact=deleted.filter(m=>typeof m==='object'&&missing.includes(m.id));
  if(exact.length){for(const m of exact)reopen(m.selectedFloors||m.sources||b.selectedFloors||b.floors);}
  else reopen(b.selectedFloors||b.floors);
  b.approved=false;b.deletedMemoryIds=missing;b.invalidatedByDeletion=true;
 }
 if(rewind!==null){store.reopenedFloors=[...reopened].sort((a,b)=>a-b);store.revision=Number(store.revision||0)+1;}return rewind;
}
export function rewindStarts(settings,store,floor){
 if(floor===null)return;
 for(const key of ['startFloor','autoStartFloor'])settings[key]=Math.min(Number(settings[key])||0,floor);
 if(store.options)for(const key of ['startFloor','autoStartFloor'])store.options[key]=settings[key];
}
