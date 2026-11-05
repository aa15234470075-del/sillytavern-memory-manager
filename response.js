// 只解析明确的结构化数据，不执行模型附带的脚本、标签或指令。
export const JSON_RECOVERED=Symbol('memory-manager-json-quote-recovery');
// Only paired, unescaped quotes inside a value string are eligible. Never
// invent missing commas/braces, repair keys, or accept an incomplete document.
export function recoverValueQuotes(text){
 let out='',quoted=false,escaped=false,value=false,objectValue=false,changed=0,inside=0,previous='';
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(!quoted){out+=c;if(c==='"'){quoted=true;value=previous===':'||previous==='[';objectValue=previous===':';inside=0;}if(!/\s/.test(c))previous=c;continue;}
  if(escaped){out+=c;escaped=false;continue;}if(c==='\\'){out+=c;escaped=true;continue;}
  if(c!=='"'){out+=c;continue;}
  const next=text.slice(i+1).match(/^\s*(.)/s)?.[1]||'';
  const afterComma=next===','?text.slice(i+1).match(/^\s*,\s*(.)/s)?.[1]:null;
  const textComma=objectValue&&next===','&&afterComma&&!/["}]/.test(afterComma);
  const textColon=next===':'&&inside%2===1;
  if(value&&next&&(!/[,\]}:]/.test(next)||textComma||textColon)){
   if(/["{\[]/.test(next)&&!(next==='"'&&inside%2===1&&/^"\s*[,}\]]/.test(text.slice(i+1))))return null;
   out+='\\"';changed++;inside++;continue;
  }
  if(inside%2)return null;
  quoted=false;previous='"';out+=c;
 }
 return !quoted&&changed?{text:out,changes:changed}:null;
}
function recoveredResponse(candidates){
 const values=[];
 for(const candidate of candidates){const fixed=recoverValueQuotes(candidate);if(!fixed)continue;try{const data=JSON.parse(fixed.text);if(!data||typeof data!=='object'||!Array.isArray(data.memories)&&!Array.isArray(data.issues))continue;Object.defineProperty(data,JSON_RECOVERED,{value:fixed.changes});values.push(data);}catch{}}
 const unique=[...new Map(values.map(v=>[JSON.stringify(v),v])).values()];if(unique.length>1)throw Error('返回含多份不同修复结果，未自动选用');return unique[0]||null;
}
export function responseProblem(raw){
 const text=String(raw??'').trim();
 if(!text)return '模型返回空正文';
 if(/<stm4-record\b/i.test(text))return '当前选择 JSON，但模型返回了专用标签格式';
 if(/===\s*STM4条目/.test(text))return '当前选择 JSON，但模型返回了分段格式';
 if(!/[{\[]/.test(text))return '模型未按约定输出 JSON，返回的是普通文字或 Markdown；这不是合法 JSON 被误判';
 return '返回包含结构符号，但未提取到完整、可解析的 JSON';
}
function stripTrailingCommas(text){let out='',quoted=false,escaped=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){out+=c;if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}if(c==='"')quoted=true;if(c===','&&/^\s*[}\]]/.test(text.slice(i+1)))continue;out+=c;}return out;}
function balanced(text,start){let stack=[],quoted=false,escaped=false;for(let i=start;i<text.length;i++){const c=text[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}if(c==='"'){quoted=true;continue;}if(c==='{'||c==='[')stack.push(c);else if(c==='}'||c===']'){const opening=stack.pop();if(opening!==(c==='}'?'{':'['))return null;if(!stack.length)return text.slice(start,i+1);}}return null;}
export function parseResponse(raw){const text=String(raw??'').trim(),candidates=[text];for(const m of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi))candidates.push(m[1].trim());const clean=text.replace(/<think(?:ing)?\b[^>]*>[\s\S]*?<\/think(?:ing)?\s*>/gi,'');for(let i=0;i<clean.length;i++)if(clean[i]==='{'||clean[i]==='['){const part=balanced(clean,i);if(part){candidates.push(part);i+=part.length-1;}}const parsed=[];for(const c of candidates){try{const v=JSON.parse(stripTrailingCommas(c));if(v&&typeof v==='object')parsed.push(v);}catch{}}const structured=parsed.filter(v=>Array.isArray(v.memories)||Array.isArray(v.issues));const unique=[...new Map(structured.map(v=>[JSON.stringify(v),v])).values()];if(unique.length>1)throw Error('返回含多份不同结果，请核对原始回复；未自动选用');if(unique.length===1)return unique[0];const distinct=[...new Map(parsed.map(v=>[JSON.stringify(v),v])).values()];if(distinct.length===1)return distinct[0];const recovered=recoveredResponse(candidates);if(recovered)return recovered;throw Error('[JSON语法/提取] 未找到完整可解析的JSON；原始回复已保留，未写入或隐藏。');}
