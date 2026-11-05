import {escapeHtml as h} from './core.js?v=0.6.1';

export function manualMemoryDialog(onSave){
 return new Promise(resolve=>{
  const d=document.createElement('dialog');d.className='smm-editor smm-manual-editor';
  d.innerHTML='<form><h3>手动新增记忆条目</h3><label>记忆类型<select name="kind"><option value="short">短期记忆 · 每轮发送</option><option value="long">长期记忆 · 关键词触发</option><option value="fixed">固定记忆 · 每轮发送</option></select></label><label>标题<input name="title" placeholder="可留空，使用正文开头"></label><label>记忆正文<textarea name="summary" rows="7" required></textarea></label><div data-long hidden><label>关键词（逗号或换行分隔）<textarea name="keywords" rows="2"></textarea></label><p class="smm-hint">长期记忆需要关键词；是否触发仍遵循设置里的命中数量。</p><label>短版（可留空，使用正文）<textarea name="brief" rows="3"></textarea></label></div><details class="smm-group"><summary>补充信息（可选）</summary>'+[['time','时间'],['place','地点'],['promises','约定与任务'],['items','关键物品']].map(([key,label])=>`<label>${h(label)}<textarea name="detail-${key}" rows="2"></textarea></label>`).join('')+'<label class="smm-check"><input name="locked" type="checkbox">后续合并总结时必须保留本条事实</label></details><p class="smm-form-error" role="alert" hidden></p><div class="smm-actions"><button type="button" data-dismiss>取消</button><button type="submit">添加记忆</button></div></form>';
  document.body.append(d);let busy=false,saved=false;const form=d.querySelector('form');
  form.elements.kind.onchange=()=>d.querySelector('[data-long]').hidden=form.elements.kind.value!=='long';
  d.querySelector('[data-dismiss]').onclick=()=>{if(!busy)d.close();};d.oncancel=e=>{if(busy)e.preventDefault();};
  form.onsubmit=async e=>{e.preventDefault();if(busy)return;const error=d.querySelector('[role=alert]');error.hidden=true;
   try{const summary=form.elements.summary.value.trim(),kind=form.elements.kind.value,keywords=[...new Set(form.elements.keywords.value.split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean))];if(!summary)throw Error('记忆正文不能为空');if(kind==='long'&&!keywords.length)throw Error('长期记忆请至少填写一个关键词');
    const details=Object.fromEntries([...form.querySelectorAll('[name^="detail-"]')].filter(el=>el.value.trim()).map(el=>[el.name.slice(7),el.value.trim()]));
    busy=true;for(const b of form.querySelectorAll('button'))b.disabled=true;
    await onSave({title:form.elements.title.value.trim()||summary.slice(0,30),summary,kind,brief:form.elements.brief.value.trim()||summary,keywords:kind==='long'?keywords:[],details,locked:form.elements.locked.checked});saved=true;d.close();
   }catch(e){error.textContent=e.message||String(e);error.hidden=false;}finally{busy=false;for(const b of form.querySelectorAll('button'))b.disabled=false;}
  };d.onclose=()=>{d.remove();resolve(saved);};d.showModal();form.elements.summary.focus();
 });
}
