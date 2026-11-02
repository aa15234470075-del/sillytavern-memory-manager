// Visual controls share one validated source for live preview and saved settings.
import {escapeHtml as h} from './core.js?v=0.5.2';

export const APPEARANCE_DEFAULTS = {fontSize:15,spacing:12,cardRadius:10,levels:{}};
const tierDefaults = level => ({size:[15,14,12][level-1],radius:8,padding:[9,9,5][level-1],border:1,fill:'theme',align:'center',colors:false,background:'#426b91',text:'#ffffff',borderColor:'#8aa7c7'});
const clamp=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:fallback;
export function normalizeAppearance(value={}){
 const out={fontSize:clamp(value.fontSize,12,24,15),spacing:clamp(value.spacing,4,28,12),cardRadius:clamp(value.cardRadius,0,28,10),levels:{}};
 for(let n=1;n<=3;n++){const d=tierDefaults(n),v=value.levels?.[n]||{};out.levels[n]={size:clamp(v.size,10,26,d.size),radius:clamp(v.radius,0,28,8),padding:clamp(v.padding,2,20,d.padding),border:clamp(v.border,0,4,1),fill:['theme','filled','outline','text'].includes(v.fill)?v.fill:'theme',align:['left','center','right'].includes(v.align)?v.align:'center',colors:v.colors===true,background:color(v.background,d.background),text:color(v.text,d.text),borderColor:color(v.borderColor,d.borderColor)};}
 return out;
}
export function appearanceCss(value){
 const v=normalizeAppearance(value);let css=`#smm-panel{font-size:${v.fontSize}px;--smm-space:${v.spacing}px;--smm-nav-min-width:${Math.max(60,v.levels[1].size*3.5)}px}#smm-panel .smm-card,#smm-panel .smm-group,#smm-panel .smm-content{border-radius:${v.cardRadius}px}`;
 for(let n=1;n<=3;n++){const t=v.levels[n],selector=`#smm-panel [data-button-level="${n}"]`;
  css+=`${selector}{font-size:${t.size}px;border-radius:${t.radius}px;padding:${t.padding}px ${t.padding+3}px;border-width:${t.border}px;text-align:${t.align};`;
  if(t.fill==='filled')css+=`background:${t.colors?t.background:'var(--smm-button-1-bg)'};border-style:solid;border-color:${t.colors?t.borderColor:'var(--smm-accent)'};`;
  if(t.fill==='outline')css+=`background:transparent;border-style:solid;border-color:${t.colors?t.borderColor:'var(--smm-accent)'};`;
  if(t.fill==='text')css+='background:transparent;border-color:transparent;';
  if(t.colors){css+=`color:${t.text};`;if(t.fill==='theme')css+=`background:${t.background};border-color:${t.borderColor};`;}
  css+='}';
 }
 // Keep compact utility controls compact regardless of general tier padding.
 css+='#smm-panel>header button{padding:0;font-size:23px}#smm-panel .smm-copy{padding:3px 6px;font-size:12px}';
 return css;
}
export function appearanceView(value){
 const a=normalizeAppearance(value);
 const slider=(key,label,v,min,max)=>`<label class="smm-slider">${label}<output data-appearance-output="${key}">${v}px</output><input type="range" data-appearance="${key}" min="${min}" max="${max}" step="1" value="${v}"></label>`;
 const select=(key,label,v,opts)=>`<label>${label}<select data-appearance="${key}">${Object.entries(opts).map(([k,t])=>`<option value="${k}" ${k===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
 return '<button type="button" data-action="window-size">调整窗口宽度与高度</button><p class="smm-hint">拖动和选择立即预览，无需保存；点击底部“保存设置”才持久保存。自定义 CSS 最后应用，可以覆盖这些控件。</p><div class="smm-appearance-grid">'+slider('fontSize','面板字号',a.fontSize,12,24)+slider('spacing','内容间距',a.spacing,4,28)+slider('cardRadius','内容框圆角',a.cardRadius,0,28)+'</div>'+[1,2,3].map(n=>{
  const t=a.levels[n],prefix='levels.'+n+'.';return `<details class="smm-group" ${n===1?'open':''}><summary>${['一级 · 顶部菜单','二级 · 普通操作','三级 · 编辑和复制'][n-1]}</summary><div class="smm-appearance-samples"><button type="button" data-button-level="${n}" disabled>效果示例</button></div><div class="smm-appearance-grid">`+slider(prefix+'size','字号',t.size,10,26)+slider(prefix+'radius','圆角',t.radius,0,28)+slider(prefix+'padding','按钮内边距',t.padding,2,20)+slider(prefix+'border','边框粗细',t.border,0,4)+select(prefix+'fill','按钮样式',t.fill,{theme:'跟随主题',filled:'填色',outline:'仅边框',text:'仅文字'})+select(prefix+'align','文字对齐',t.align,{left:'靠左',center:'居中',right:'靠右'})+`</div><label class="smm-check"><input type="checkbox" data-appearance="${prefix}colors" ${t.colors?'checked':''}>使用自选颜色（关闭则跟随主题）</label><div class="smm-appearance-colors">`+[['background','背景色'],['text','文字色'],['borderColor','边框色']].map(([key,label])=>`<label>${label}<input type="color" data-appearance="${prefix+key}" value="${h(t[key])}"></label>`).join('')+'</div></details>';
 }).join('')+'<button type="button" data-action="appearance-reset">恢复默认美化参数</button>';
}
export function readAppearance(root,base){const value=normalizeAppearance(base);for(const el of root.querySelectorAll('[data-appearance]')){const parts=el.dataset.appearance.split('.');let target=value;for(const part of parts.slice(0,-1))target=target[part];target[parts.at(-1)]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;}return normalizeAppearance(value);}
