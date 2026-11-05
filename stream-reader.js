import {apiFailure} from './api-errors.js?v=0.7.2';
// All bodies are read incrementally, including non-streaming JSON, for useful diagnostics.
export function bodyReader(response,onBytes=()=>{},signal){
 const reader=response.body?.getReader(),decoder=new TextDecoder();let bytes=0,closed=false;
 const abort=()=>{void reader?.cancel(signal.reason).catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 const check=()=>{if(signal?.aborted)throw new DOMException('已中止浏览器读取','AbortError');};
 return {async read(){check();if(!reader){closed=true;const value=await response.text();check();bytes=new TextEncoder().encode(value).length;onBytes(bytes);return {done:false,text:value};}const r=await reader.read();check();if(r.done)return {done:true,text:decoder.decode()};bytes+=r.value.byteLength;onBytes(bytes);return {done:false,text:decoder.decode(r.value,{stream:true})};},get bytes(){return bytes;},get fallbackDone(){return closed;},async cancel(){try{await reader?.cancel();}catch{}},release(){signal?.removeEventListener('abort',abort);reader?.releaseLock();}};
}
export async function readCompletion(response,stream,onFirst=async()=>{},onEvent=async()=>{},options={}){
 const body=bodyReader(response,options.onBytes,options.signal);
 let raw='',pending='',first=true,content='',finish=null,usage=null,seen=false,done=false,sse=false,firstContent=false;
 const event=async line=>{
  if(!line.startsWith('data:'))return;sse=true;const data=line.slice(5).trim();if(!data)return;
  if(data==='[DONE]'){done=true;await onEvent('complete',{characters:[...content].length});return;}
  let chunk;try{chunk=JSON.parse(data);}catch{throw Error('流式数据帧损坏，未把残缺内容当作完整结果');}
  const failure=apiFailure(chunk,response.status);if(failure)throw failure;
  const c=chunk.choices?.[0];if(c){seen=true;const text=c.delta?.content??c.message?.content??'';if(typeof text==='string'&&text){content+=text;if(!firstContent){firstContent=true;await onEvent('content',{});}}if(c.finish_reason)finish=c.finish_reason;}if(chunk.usage)usage=chunk.usage;
 };
 try{
  while(!done){const r=await body.read();raw+=r.text;if(r.done)break;if(first){first=false;await onFirst();}
   if(stream){pending+=r.text;let at;while((at=pending.indexOf('\n'))>=0){const line=pending.slice(0,at).replace(/\r$/,'');pending=pending.slice(at+1);await event(line);if(done)break;}}
   if(body.fallbackDone)break;
  }
  if(stream&&!done&&pending.trim())await event(pending.replace(/\r$/,''));
  if(!stream||!sse)return raw;
  if(!seen){if(done)throw Error('流式已结束，但没有模型结果');return raw;}
  if(!done&&!finish)throw Error('流式连接提前结束，未收到完成标志；请查看调用日志');
  return JSON.stringify({choices:[{message:{content},finish_reason:finish||'stop'}],usage});
 }catch(error){error.partialCharacters=[...content].length;error.receivedBytes=body.bytes;throw error;}finally{await body.cancel();body.release();}
}
