// Coverage comes from surviving memories (including their merge ancestry), never a deleted batch alone.
export function reconcileCoverage(store){
 const live=new Set((store.memories||[]).map(m=>m.id));
 const descendants=new Map();
 for(const m of store.memories||[])for(const parent of m.parentIds||[])descendants.set(parent,[...(descendants.get(parent)||[]),m.id]);
 for(const b of store.batches||[])for(const parent of b.parentIds||[])descendants.set(parent,[...(descendants.get(parent)||[]),...(b.ids||[])]);
 const hasAncestor=(id,seen=new Set())=>{if(live.has(id))return true;if(seen.has(id))return false;seen.add(id);return (descendants.get(id)||[]).some(child=>hasAncestor(child,seen));};
 let rewind=null;
 for(const b of store.batches||[]){
  if(!b.approved||b.level!==1||!b.ids?.length)continue;
  const remaining=b.ids.filter(id=>hasAncestor(id));
  if(remaining.length===b.ids.length)continue;
  const missing=b.ids.filter(id=>!remaining.includes(id));
  const floors=b.selectedFloors||b.floors||[];
  if(floors.length)rewind=Math.min(rewind??Infinity,...floors);
  // Partial deletion must reopen the source range; retain the historical batch for audit only.
  b.approved=false;b.deletedMemoryIds=missing;b.invalidatedByDeletion=true;
 }
 store.revision=Number(store.revision||0)+1;
 return rewind;
}

export function rewindStarts(settings,store,floor){
 if(floor===null)return;
 for(const key of ['startFloor','autoStartFloor'])settings[key]=Math.min(Number(settings[key])||0,floor);
 if(store.options)for(const key of ['startFloor','autoStartFloor'])store.options[key]=settings[key];
}
