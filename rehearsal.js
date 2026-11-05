import {escapeHtml as h} from './core.js?v=0.7.0';
import {characters,rehearse,sortMemories} from './experience.js?v=0.7.0';
import {floorLabel} from './memory-tools.js?v=0.7.0';
export function rehearsalDialog(memories,chat,recall,settings){
 const d=document.createElement('dialog');d.className='smm-editor smm-rehearsal';
 d.innerHTML='<h3>按楼层预演记忆发送</h3><p>选择实际聊天楼层，计算当前规则会选出哪些记忆。不会调用模型、发送消息或改变触发状态。隐藏楼层不参与关键词匹配；仍计入原始楼层编号。</p><label>起始楼层<input data-start type="number" min="0" max="'+Math.max(0,chat.length-1)+'" value="'+Math.max(0,chat.length-4)+'"></label><label>结束楼层<input data-end type="number" min="0" max="'+Math.max(0,chat.length-1)+'" value="'+Math.max(0,chat.length-1)+'"></label><label>来源排序<select data-order><option value="asc">来源楼层正序</option><option value="desc">来源楼层倒序</option></select></label><button data-run>开始预演</button><p role="alert"></p><section data-results></section><button data-close>关闭</button>';
 document.body.append(d);let result=null;const results=d.querySelector('[data-results]');
 const view=()=>{if(!result)return;results.innerHTML='<p><b>'+result.count+' 条记忆 · 最终记忆文本 '+characters(result.text)+' 字符</b> · 未计服务端包装，不估算tokens</p>'+sortMemories(result.included,d.querySelector('[data-order]').value).map(m=>'<details class="smm-memory-details"><summary>'+h(m.title)+' · '+h(floorLabel(m.selectedFloors||m.sources))+'</summary><p>'+h(m.reason)+'</p><p>'+h(m.mode==='brief'?m.brief:m.summary)+'</p></details>').join('')+'<p>超出字符预算排除 '+result.excluded.length+' 条</p><details><summary>实际会发送的完整记忆文本</summary><pre>'+h(result.text||'无记忆发送')+'</pre></details>';};
 d.querySelector('[data-run]').onclick=()=>{try{result=rehearse(memories,chat,Number(d.querySelector('[data-start]').value),Number(d.querySelector('[data-end]').value),recall,settings);d.querySelector('[role=alert]').textContent='';view();}catch(e){d.querySelector('[role=alert]').textContent=e.message;}};
 d.querySelector('[data-order]').onchange=view;d.querySelector('[data-close]').onclick=()=>d.close();d.onclose=()=>d.remove();d.showModal();
}
