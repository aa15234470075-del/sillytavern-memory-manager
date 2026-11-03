import {escapeHtml as h} from './core.js?v=0.5.7';
export function localKeywords(memory){
 const text=[memory.title,memory.summary,...Object.values(memory.details||{})].join(' '),words=[];
 try{for(const part of new Intl.Segmenter('zh',{granularity:'word'}).segment(text))if(part.isWordLike&&[...part.segment].length>=2)words.push(part.segment);}catch{words.push(...(text.match(/[\p{L}\p{N}]{2,8}/gu)||[]));}
 const stop=new Set(['这个','那个','他们','自己','已经','没有','进行','之后','之前','时候','可以','因为','所以','一个','记忆','总结']);
 const counts=new Map();for(const w of words)if(!stop.has(w))counts.set(w,(counts.get(w)||0)+1);
 return [...counts].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length).slice(0,12).map(([w])=>w);
}
export function keywordDialog(items,generate,commit){return new Promise(resolve=>{
 const d=document.createElement('dialog');d.className='smm-editor smm-keywords';let busy=false;
 d.innerHTML='<h3>补充关键词 · '+items.length+'条</h3><p>只处理缺失项。脚本提取的是候选词，可修改后保存。</p><label>补齐方式<select data-method><option value="local">本地脚本（不调用API）</option><option value="api">API一次补齐</option><option value="manual">手动填写</option></select></label><section data-api hidden><label>API连接<select data-connection><option value="summary">总结API</option><option value="check">检查API</option><option value="custom">独立API</option></select></label><div data-custom hidden><label>地址<input data-url placeholder="https://…/v1"></label><label>密钥<input data-key type="password" autocomplete="off"></label><label>模型<input data-model></label><p>连接默认保存在当前浏览器，不写入日志或导出。</p></div></section><button data-generate>提取候选关键词</button>'+items.map(m=>'<label>'+h(m.title)+'<textarea data-keywords="'+h(m.id)+'" rows="2"></textarea></label>').join('')+'<p role="alert"></p><footer><button data-cancel>取消</button><button data-save>保存关键词</button></footer>';
 document.body.append(d);try{const saved=JSON.parse(localStorage.getItem('st_memory_manager:keyword-connection')||'null');if(saved){for(const [selector,key] of [['[data-url]','baseUrl'],['[data-key]','key'],['[data-model]','model']])d.querySelector(selector).value=saved[key]||'';}}catch{}const alert=d.querySelector('[role=alert]');const lock=value=>{busy=value;d.querySelectorAll('button').forEach(b=>b.disabled=value);};
 d.querySelector('[data-method]').onchange=e=>d.querySelector('[data-api]').hidden=e.target.value!=='api';
 d.querySelector('[data-connection]').onchange=e=>d.querySelector('[data-custom]').hidden=e.target.value!=='custom';
 d.querySelector('[data-generate]').onclick=async()=>{lock(true);alert.textContent='';try{
  const mode=d.querySelector('[data-method]').value;if(mode==='api'&&d.querySelector('[data-connection]').value==='custom')localStorage.setItem('st_memory_manager:keyword-connection',JSON.stringify({baseUrl:d.querySelector('[data-url]').value,key:d.querySelector('[data-key]').value,model:d.querySelector('[data-model]').value}));const rows=mode==='api'?await generate(items,{connection:d.querySelector('[data-connection]').value,baseUrl:d.querySelector('[data-url]').value,key:d.querySelector('[data-key]').value,model:d.querySelector('[data-model]').value}):mode==='local'?items.map(m=>({id:m.id,keywords:localKeywords(m)})):[];
  let filled=0;for(const m of items){const r=rows.find(x=>x.id===m.id);if(Array.isArray(r?.keywords)){d.querySelector('[data-keywords="'+CSS.escape(m.id)+'"]').value=r.keywords.filter(x=>typeof x==='string').join('、');filled++;}}
  alert.textContent=mode==='manual'?'请直接填写下方关键词。':'已补候选 '+filled+'/'+items.length+' 条，请核对后保存。';
 }catch(e){alert.textContent=e.message;}finally{lock(false);}};
 d.querySelector('[data-save]').onclick=async()=>{lock(true);try{const rows=items.map(m=>({id:m.id,keywords:[...new Set(d.querySelector('[data-keywords="'+CSS.escape(m.id)+'"]').value.split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean))]}));if(rows.some(r=>!r.keywords.length))throw Error('还有未填写关键词的条目，请补齐或取消。');await commit(rows);d.close('saved');}catch(e){alert.textContent=e.message;}finally{lock(false);}};
 d.querySelector('[data-cancel]').onclick=()=>d.close();d.oncancel=e=>{if(busy)e.preventDefault();};d.onclose=()=>{d.remove();resolve(d.returnValue==='saved');};d.showModal();
 });}
