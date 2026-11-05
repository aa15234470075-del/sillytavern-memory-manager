import {escapeHtml as h} from './core.js?v=0.7.2';

const compact=(text,n=90)=>{const s=String(text||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n)+'…':s;};
// Summaries are presentation only: full evidence remains available without another API call.
export function issueView(i){
 const message=String(i.message||'请核对原文'),suggestion=String(i.suggestion||'核对原文');
 const brief='<p>'+h(compact(message))+'</p><p>建议：'+h(compact(suggestion))+'</p>';
 return '<li>'+brief+((message.length>90||suggestion.length>90||i.quote)?'<details><summary>完整意见与依据</summary><p>'+h(message)+'</p><p>建议：'+h(suggestion)+'</p>'+(i.quote?'<blockquote>'+h(i.quote)+'</blockquote>':'')+'</details>':'')+'</li>';
}
