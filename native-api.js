import {bodyReader} from './stream-reader.js?v=0.7.2';
import {apiFailure} from './api-errors.js?v=0.7.2';
const strip=s=>String(s).replace(/\/+$/,'');
export function nativeRequest(s,key,kind,messages,stream){
 const protocol=s.protocol||'tavern',base=strip(s.baseUrl),headers={'Content-Type':'application/json'};let url,body;
 const limit=s.outputTokens===''||s.outputTokens==null?null:Number(s.outputTokens);
 if(limit!==null&&(!Number.isInteger(limit)||limit<1))throw Error('输出token上限需为正整数或留空');
 if(protocol==='anthropic'){
  headers['x-api-key']=key;headers['anthropic-version']='2023-06-01';headers['anthropic-dangerous-direct-browser-access']='true';
  const root=base.replace(/\/v1$/,'');url=root+'/v1/'+(kind==='models'?'models':'messages');
  body={model:s.model,max_tokens:limit??8192,stream,system:messages.filter(m=>m.role==='system').map(m=>m.content).join('\n'),messages:messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content}))};
 }else if(protocol==='gemini'){
  headers['x-goog-api-key']=key;const root=base.replace(/\/v1(?:beta)?$/,'')+'/v1beta',model=String(s.model||'').replace(/^models\//,'');
  url=kind==='models'?root+'/models?pageSize=1000':root+'/models/'+encodeURIComponent(model)+':'+(stream?'streamGenerateContent?alt=sse':'generateContent');
  body={systemInstruction:{parts:messages.filter(m=>m.role==='system').map(m=>({text:m.content}))},contents:messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),generationConfig:{temperature:0.2,...(limit?{maxOutputTokens:limit}:{})}};
  if(!body.systemInstruction.parts.length)delete body.systemInstruction;
  if(s.structuredOutput&&s.outputMode==='json'&&['summary','check','repair'].includes(kind))body.generationConfig.responseMimeType='application/json';
 }else if(protocol==='openai'||protocol==='deepseek'){
  headers.Authorization='Bearer '+key;const root=/\/v1$/.test(base)?base:base+'/v1';url=root+(kind==='models'?'/models':'/chat/completions');
  body={model:s.model,messages,stream,temperature:0.2,...(limit?{max_tokens:limit}:{})};
  if(s.structuredOutput&&s.outputMode==='json'&&['summary','check','repair'].includes(kind))body.response_format={type:'json_object'};
 }else throw Error('不支持的API协议');
 return {url,options:{method:kind==='models'?'GET':'POST',headers,...(kind==='models'?{}:{body:JSON.stringify(body)})}};
}
export function canonicalNative(protocol,data,models=false){
 if(data.error)return data;
 if(models){if(protocol==='gemini')return {data:(data.models||[]).map(m=>({id:m.name.replace(/^models\//,'')})),nextPageToken:data.nextPageToken};return data;}
 if(protocol==='anthropic')return {choices:[{message:{content:(data.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('')},finish_reason:data.stop_reason==='max_tokens'?'length':data.stop_reason?'stop':null}],usage:{prompt_tokens:data.usage?.input_tokens,completion_tokens:data.usage?.output_tokens}};
 if(protocol==='gemini'){const c=data.candidates?.[0];if(c?.finishReason&& !['STOP','MAX_TOKENS'].includes(c.finishReason))throw Error('Gemini未正常完成：'+c.finishReason);return {choices:[{message:{content:(c?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('')},finish_reason:c?.finishReason==='MAX_TOKENS'?'length':c?.finishReason==='STOP'?'stop':null}],usage:{prompt_tokens:data.usageMetadata?.promptTokenCount,completion_tokens:data.usageMetadata?.candidatesTokenCount}};}
 return data;
}
export async function readNative(response,protocol,stream,onFirst,onContent,options={}){
 if(!response.ok||!stream||!['anthropic','gemini'].includes(protocol)){
  const body=bodyReader(response,options.onBytes,options.signal);let raw='';try{while(true){const r=await body.read();raw+=r.text;if(r.done||body.fallbackDone)break;}}finally{await body.cancel();body.release();}if(raw)await onFirst();let data;try{data=JSON.parse(raw);}catch{return raw;}
  return JSON.stringify(canonicalNative(protocol,data));
 }
 const body=bodyReader(response,options.onBytes,options.signal);let pending='',text='',finish=null,usage={},started=false,contentStarted=false;
 const frame=async line=>{if(!line.startsWith('data:'))return;const raw=line.slice(5).trim();if(!raw||raw==='[DONE]')return;const d=JSON.parse(raw);const failure=apiFailure(d,response.status);if(failure)throw failure;let next='';
  if(protocol==='anthropic'){if(d.type==='content_block_delta'&&d.delta?.type==='text_delta')next=d.delta.text||'';if(d.type==='message_start')usage.prompt_tokens=d.message?.usage?.input_tokens;if(d.type==='message_delta'){usage.completion_tokens=d.usage?.output_tokens;if(d.delta?.stop_reason)finish=d.delta.stop_reason==='max_tokens'?'length':'stop';}}
  else{const c=canonicalNative(protocol,d);next=c.choices?.[0]?.message?.content||'';finish=c.choices?.[0]?.finish_reason||finish;usage={...usage,...Object.fromEntries(Object.entries(c.usage||{}).filter(([,v])=>v!==undefined))};}
  if(next){text+=next;if(!contentStarted){contentStarted=true;await onContent();}}
 };
 try{while(true){const {done,text:part}=await body.read();if(done){pending+=part;break;}if(!started){started=true;await onFirst();}pending+=part;let at;while((at=pending.indexOf('\n'))>=0){await frame(pending.slice(0,at).replace(/\r$/,''));pending=pending.slice(at+1);}}if(pending.trim())await frame(pending.trim());}catch(e){e.partialCharacters=[...text].length;e.receivedBytes=body.bytes;throw e;}finally{await body.cancel();body.release();}
 if(!finish)throw Error('原生API流式连接提前结束，未收到完整结束原因');
 return JSON.stringify({choices:[{message:{content:text},finish_reason:finish}],usage});
}
