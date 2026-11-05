import {bindPanelMovement} from './panel.js?v=0.7.1';
export function createProgress(cancel,pause=()=>{}){
 let element,closed=false;
 const hide=()=>{if(element){if(element.matches(':popover-open'))element.hidePopover();element.hidden=true;}};
 return {reset(){closed=false;},update(text,enabled=true,batch=false){
  if(!text){hide();return;}if(closed||!enabled)return;
  if(!element?.isConnected){element=document.createElement('section');element.id='smm-floating-progress';element.setAttribute('popover','manual');element.innerHTML='<header><strong>记忆任务进度</strong></header><p></p><footer class="smm-actions"><button type="button" data-close>关闭提示</button><button type="button" data-pause hidden>本次完成后暂停</button><button type="button" data-cancel>取消任务</button></footer>';document.body.append(element);bindPanelMovement(element,{compact:true});element.querySelector('[data-close]').onclick=()=>{closed=true;hide();};element.querySelector('[data-cancel]').onclick=cancel;element.querySelector('[data-pause]').onclick=pause;}
  // Body siblings of native modal dialogs are inert, regardless of z-index.
  const parent=[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;
  if(element.parentElement!==parent){hide();parent.append(element);}
  element.hidden=false;element.querySelector('[data-pause]').hidden=!batch;element.querySelector('p').textContent=text;
  if(element.showPopover&&!element.matches(':popover-open'))element.showPopover();
 }};
}
