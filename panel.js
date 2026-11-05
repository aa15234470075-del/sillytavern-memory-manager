const SIZE_KEY='st_memory_manager:window-size-v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function panelBounds(viewport,settings={},position=null){
 const vw=Math.max(1,viewport.width),vh=Math.max(1,viewport.height),margin=Math.min(6,vw/8,vh/8);
 const availableW=vw-margin*2,availableH=vh-margin*2;
 const wp=clamp(Number(settings.width)||100,55,100),hp=clamp(Number(settings.height)||96,55,100);
 const width=Math.min(availableW,Math.max(Math.min(300,availableW),availableW*wp/100),settings.auto===false?Infinity:880);
 const height=Math.min(availableH,Math.max(Math.min(340,availableH),availableH*hp/100));
 const x=viewport.left||0,y=viewport.top||0;
 return {width,height,left:clamp(position?.left??x+(vw-width)/2,x+margin,x+vw-margin-width),top:clamp(position?.top??y+(vh-height)/2,y+margin,y+vh-margin-height)};
}
export function bindPanelMovement(panel,{compact=false}={}){
 const header=panel.querySelector(':scope > header');let drag=null,position=null,settings=compact?{width:300,height:176}:{width:100,height:96,auto:true};const storageKey=compact?SIZE_KEY+':progress':SIZE_KEY;
 try{Object.assign(settings,JSON.parse(localStorage.getItem(storageKey)||'{}'));}catch{}
 if(compact&&settings.position)position=settings.position;
 const viewport=()=>{const v=window.visualViewport;return {width:v?.width||window.innerWidth,height:v?.height||window.innerHeight,left:v?.offsetLeft||0,top:v?.offsetTop||0};};
 const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify({...settings,...(compact?{position}: {})}));}catch{}};
 function fit(){
  const view=viewport();if(compact){const width=Math.min(Number(settings.width)||300,Math.max(180,view.width-12)),height=Math.min(Number(settings.height)||176,Math.max(100,view.height-12)),left=clamp(position?.left??(view.left+(view.width-width)/2),view.left,view.left+Math.max(0,view.width-width)),top=clamp(position?.top??view.top+view.height*.18,view.top,view.top+Math.max(0,view.height-height));Object.assign(panel.style,{inset:'auto',left:left+'px',top:top+'px',width:width+'px',height:height+'px',maxWidth:Math.max(180,view.width-12)+'px',maxHeight:Math.max(100,view.height-12)+'px'});return;}const r=panelBounds(view,settings,position);if(panel.classList.contains('smm-minimized')){r.width=Math.min(340,view.width-12);r.height=58;r.left=clamp(r.left,view.left,view.left+view.width-r.width);r.top=clamp(r.top,view.top,view.top+view.height-r.height);}
  Object.assign(panel.style,{inset:'auto',left:r.left+'px',top:r.top+'px',right:'auto',bottom:'auto',width:r.width+'px',height:r.height+'px',maxWidth:'none',maxHeight:'none'});
 }
 header.addEventListener('pointerdown',e=>{if(e.target.closest('button,input,select,textarea')||e.button!==0)return;const r=panel.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};header.setPointerCapture(e.pointerId);e.preventDefault();});
 header.addEventListener('pointermove',e=>{if(!drag)return;position={left:drag.left+e.clientX-drag.x,top:drag.top+e.clientY-drag.y};fit();});
 const stop=()=>{drag=null;if(compact)persist();};header.addEventListener('pointerup',stop);header.addEventListener('pointercancel',stop);
 window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);
 const toggle=()=>{const minimized=panel.classList.toggle('smm-minimized');const b=panel.querySelector('[data-action=minimize]');if(b)b.textContent=minimized?'□':'−';fit();};
 toggle.fit=fit;toggle.resize=(width,height)=>{settings.width=clamp(width,240,900);settings.height=clamp(height,150,700);persist();fit();};
 if(compact){let timer;new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!panel.isConnected||panel.hidden||!panel.offsetWidth)return;settings.width=panel.offsetWidth;settings.height=panel.offsetHeight;persist();},150);}).observe(panel);}
 toggle.reset=()=>{settings={width:100,height:96,auto:true};position=null;panel.classList.remove('smm-minimized');const b=panel.querySelector('[data-action=minimize]');if(b)b.textContent='−';persist();fit();};
 toggle.configure=()=>{
  const existing=document.getElementById('smm-window-size-dialog');if(existing){existing.focus();return;}
  const d=document.createElement('dialog');d.className='smm-editor smm-size-editor';d.id='smm-window-size-dialog';
  d.innerHTML='<h3>调整窗口大小</h3><p>拖动立即生效，自动保存在本设备。横竖屏和键盘弹出时重新适配。</p><label>窗口宽度 <output data-size-output="width"></output><input type="range" data-panel-size="width" min="55" max="100" step="1"></label><label>窗口高度 <output data-size-output="height"></output><input type="range" data-panel-size="height" min="55" max="100" step="1"></label><button type="button" data-fit>恢复适配屏幕</button><button type="button" data-close>完成</button>';
  const refresh=()=>{for(const e of d.querySelectorAll('[data-panel-size]')){e.value=settings[e.dataset.panelSize];d.querySelector('[data-size-output="'+e.dataset.panelSize+'"]').textContent=e.value+'%';}};
  d.oninput=e=>{if(!e.target.dataset.panelSize)return;settings[e.target.dataset.panelSize]=Number(e.target.value);settings.auto=false;position=null;persist();fit();refresh();};
  d.querySelector('[data-fit]').onclick=()=>{toggle.reset();refresh();};d.querySelector('[data-close]').onclick=()=>d.close();d.onclose=()=>d.remove();document.body.append(d);refresh();d.showModal();
 };
 fit();return toggle;
}
