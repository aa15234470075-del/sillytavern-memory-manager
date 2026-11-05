import {escapeHtml as h,selectMemories,buildInjection} from './core.js?v=0.7.1';
export const characters=value=>{let n=0;for(const _ of String(value??''))n++;return n;};
export function sortMemories(items,direction='asc'){
 const key=m=>{const a=(m.selectedFloors?.length?m.selectedFloors:m.sources||[]).filter(Number.isInteger);return a.length?Math.min(...a):Number.MAX_SAFE_INTEGER;};
 return items.map((m,i)=>({m,i})).sort((a,b)=>(direction==='desc'?-1:1)*(key(a.m)-key(b.m))||a.i-b.i).map(x=>x.m);
}
export function markedText(text,quotes=[]){
 text=String(text??'');const ranges=[];
 for(const q of new Set(quotes.filter(x=>typeof x==='string'&&x.length))){let at=0;while((at=text.indexOf(q,at))>=0){ranges.push([at,at+q.length]);at+=q.length;}}
 ranges.sort((a,b)=>a[0]-b[0]);const merged=[];for(const r of ranges){const last=merged.at(-1);if(last&&r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else merged.push([...r]);}
 let out='',at=0;for(const [start,end]of merged){out+=h(text.slice(at,start))+'<mark class="smm-review-mark">'+h(text.slice(start,end))+'</mark>';at=end;}return out+h(text.slice(at));
}
export function keywordHealth(items){return items.map(m=>{const words=m.keywords||[],text=[m.title,m.summary,m.brief,...Object.values(m.details||{})].join(' '),problems=[];if(!words.length)problems.push('缺少关键词');if(new Set(words).size!==words.length)problems.push('存在重复关键词');for(const w of words){if([...w].length<2||['自己','他们','事情','时候','这个','那个','记忆','总结'].includes(w))problems.push('过于宽泛：'+w);else if(!text.toLocaleLowerCase().includes(w.toLocaleLowerCase()))problems.push('正文未出现，需核对：'+w);}return {id:m.id,keywords:[...words],message:problems.join('；')||'脚本未发现明显问题',suggestion:problems.length?'请核对具体人名、地名、物品和事件；脚本不保证语义判断。':'保留现有关键词'};});}
export function rehearse(memories,chat,start,end,recall,settings){
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>=chat.length)throw Error('请输入当前聊天内有效的起止楼层');
 const text=chat.slice(start,end+1).filter(m=>!m.is_system).map(m=>m.mes||'').join(' '),turn=chat.slice(0,end+1).filter(m=>!m.is_user).length;
 const built=buildInjection(selectMemories(memories,text,structuredClone(recall||{}),turn,settings),settings);
 return {...built,count:built.included.length,characters:characters(built.text),start,end};
}
export function savePreview(draft,batches,keep,hidePlan,selected=[]){
 const count=selected.length?draft.items.filter(m=>selected.includes(m.id)).length:draft.items.length;
 const hide=draft.hideAfter?hidePlan(batches,draft.floors,keep):[];
 return {count,hide,retained:draft.floors.filter(f=>!hide.includes(f))};
}
