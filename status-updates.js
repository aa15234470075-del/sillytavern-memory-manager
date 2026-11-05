export const STATUS_UPDATE_RULES='【旧事项完成建议】已有记忆只作参考，禁止改写旧摘要、时间、地点或其他内容。仅当用户把promises或unresolved独立列出且本次原文有明确已完成证据时，可在新记忆的statusUpdates中提出建议：[{memoryId:"旧记忆真实id",field:"promises或unresolved",itemText:"旧字段中一整行的逐字原文",sourceFloor:本次原文楼层整数,evidence:"该楼层逐字引用的明确完成证据"}]。没有确定证据返回空数组。不可凭关键词相似、打算、将要、条件句或否定句推断完成；原记忆不改写。程序只在用户核对勾选并保存后追加（已完成）。';
export const statusUpdateSchema={type:'array',items:{type:'object',properties:{memoryId:{type:'string'},field:{type:'string',enum:['promises','unresolved']},itemText:{type:'string'},sourceFloor:{type:'integer'},evidence:{type:'string'}},required:['memoryId','field','itemText','sourceFloor','evidence'],additionalProperties:false}};
const complete=/(?:已(?:经)?(?:完成|解决|履行|交付|归还|交还)|完成了|解决了|履行了|交付了|归还了|交还了)/;
const uncertain=/(?:尚未|还未|还没|没有|未曾|未完成|未解决|不曾|如果|假如|打算|计划|准备|将要|是否|可能|也许|以为|声称|自称)/;
export function statusCandidates(items,memories,sources,settings){
 const result=[],seen=new Set();
 for(const item of items)for(const proposal of item.statusUpdates||[]){
  const {memoryId,field,itemText,sourceFloor,evidence}=proposal||{};
  if(!['promises','unresolved'].includes(field)||settings.modes?.[field]!=='separate'||typeof itemText!=='string'||!itemText.trim()||typeof evidence!=='string'||evidence.trim().length<4||!Number.isInteger(sourceFloor))continue;
  const old=memories.find(m=>m.id===memoryId&&m.status==='active');if(!old)continue;
  const value=old.details?.[field];if(typeof value!=='string')continue;
  const lines=value.split(/\r?\n/);if(lines.filter(line=>line===itemText).length!==1||/已完成|已解决|已取消/.test(itemText))continue;
  const source=sources.find(s=>s.floor===sourceFloor&&s.role!=='memory'&&s.text?.includes(evidence));
  if(!source||!complete.test(evidence)||uncertain.test(evidence))continue;
  const key=JSON.stringify([memoryId,field,itemText]);if(seen.has(key))continue;seen.add(key);
  result.push({memoryId,title:old.title||'记忆 '+memoryId,field,itemText,sourceFloor,evidence,expected:value,selected:false});
 }return result;
}
export function applyStatusUpdates(memories,proposals,taskId,at=Date.now()){
 const chosen=(proposals||[]).filter(p=>p.selected),updates=[];
 // Validate all before changing anything; optimistic concurrency includes the whole field.
 for(const p of chosen){const m=memories.find(m=>m.id===p.memoryId&&m.status==='active');if(!m||!['promises','unresolved'].includes(p.field)||m.details?.[p.field]!==p.expected)throw Error('旧事项已改变，请重新核对：'+p.title);if(p.expected.split(/\r?\n/).filter(x=>x===p.itemText).length!==1)throw Error('无法唯一定位旧事项，未更新');}
 const grouped=new Map();for(const p of chosen){const key=JSON.stringify([p.memoryId,p.field]);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(p);}
 for(const group of grouped.values()){
  const first=group[0],m=memories.find(m=>m.id===first.memoryId),lines=new Set(group.map(p=>p.itemText));
  const after=first.expected.replace(/[^\r\n]+/g,line=>lines.has(line)?line+'（已完成）':line);
  if(after===first.expected)continue;
  m.details[first.field]=after;m.statusHistory??=[];m.statusHistory.push({field:first.field,before:first.expected,after,evidence:group.map(p=>({sourceFloor:p.sourceFloor,evidence:p.evidence,itemText:p.itemText})),taskId,at});
  updates.push({id:m.id,title:m.title||'记忆 '+m.id,field:first.field,before:first.expected,after});
 }return updates;
}
