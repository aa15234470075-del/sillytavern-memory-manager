export function floorLabel(floors=[]){
 const a=[...new Set(floors)].filter(Number.isInteger).sort((a,b)=>a-b);
 return a.length?'第'+a[0]+'-'+a.at(-1)+'楼':'用户手动';
}
export function hideFloors(floors,keep){const a=[...new Set(floors)].sort((a,b)=>a-b);return a.slice(0,Math.max(0,a.length-Math.max(0,Number(keep)||0)));}
// Revisit tails of earlier saved batches when a newer batch is confirmed.
export function pendingHideFloors(batches,currentFloors,keep){
 const current=[...new Set(currentFloors)].filter(Number.isInteger);
 if(!current.length)return [];
 const end=Math.max(...current);
 const previous=batches.filter(b=>b.approved&&b.level===1&&b.hideAfter!==false).flatMap(b=>b.floors||[]);
 return hideFloors([...previous,...current].filter(f=>Number.isInteger(f)&&f>=0&&f<=end),keep);
}
export function quoteChecks(value,sources,floors){
 const values=Array.isArray(value)?value:typeof value==='string'?value.split('\n'):[];
 return values.filter(x=>typeof x==='string'&&x.trim()).map(x=>{const text=x.trim(),source=sources.find(s=>floors.some(f=>(s.originalFloors||[s.floor]).includes(f))&&(s.role==='assistant'&&s.text.includes(text)||s.role==='memory'&&(s.quotes||[]).some(q=>q.verified&&q.text===text)));return {text,verified:!!source,floor:source?.role==='memory'?(source.quotes.find(q=>q.verified&&q.text===text)?.floor??null):source?.floor??null,reason:source?'逐字核对通过（角色回复楼层）':'未在对应角色回复楼层找到逐字一致原话，不发送；用户输入不作为角色原话'};});
}

export function normalizeIssues(value,items=[]){
 if(!Array.isArray(value)||value.some(i=>!i||typeof i.message!=='string'||!i.message.trim()))throw Error('检查格式不正确：需要有效issues列表');
 return value.map(i=>({id:items.some(m=>m.id===i.id)?i.id:(()=>{if(typeof i.quote!=='string'||!i.quote)return null;const matches=items.filter(m=>{const field=String(i.field||'summary').split('.').reduce((v,k)=>v?.[k],m);return typeof field==='string'&&field.includes(i.quote);});return matches.length===1?matches[0].id:null;})(),location:typeof i.id==='string'&&i.id.trim()?i.id:'未标明位置',message:i.message.trim(),quote:typeof i.quote==='string'?i.quote:'',field:typeof i.field==='string'?i.field:'summary',suggestion:typeof i.suggestion==='string'?i.suggestion.trim():''}));
}
export function compareMemories(before,after){
 const a=before.map(m=>m.summary).join('\n'),b=after.map(m=>m.summary).join('\n');
 return {changed:a!==b,beforeCharacters:[...a].length,afterCharacters:[...b].length,beforeTitles:before.map(m=>m.title),afterTitles:after.map(m=>m.title),note:'这里只比较内容变化，不能据此判定剧情更准确；请结合来源与检查意见核对。'};
}
export function textDialog(title,label,value=''){
 return new Promise(resolve=>{const d=document.createElement('dialog');d.className='smm-editor';const form=document.createElement('form'),h=document.createElement('h3'),l=document.createElement('label'),area=document.createElement('textarea'),cancel=document.createElement('button'),save=document.createElement('button');h.textContent=title;l.textContent=label;area.value=value;area.rows=6;cancel.type='button';cancel.textContent='取消';save.type='submit';save.textContent='确定';l.append(area);form.append(h,l,cancel,save);d.append(form);document.body.append(d);let result=null;cancel.onclick=()=>d.close();form.onsubmit=e=>{e.preventDefault();result=area.value;d.close();};d.onclose=()=>{d.remove();resolve(result);};d.showModal();area.focus();});
}
