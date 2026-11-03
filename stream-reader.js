// Incremental SSE decoder. Complete events may cross network/UTF-8 boundaries.
export async function readCompletion(response,stream,onFirst=async()=>{},onEvent=async()=>{}){
 if(!stream||!response.body)return response.text();
 const reader=response.body.getReader(),decoder=new TextDecoder();
 let raw='',pending='',first=true,content='',finish=null,usage=null,seen=false,done=false,sse=false,firstContent=false;
 const event=async line=>{
  if(!line.startsWith('data:'))return;
  sse=true;const data=line.slice(5).trim();if(!data)return;
  if(data==='[DONE]'){done=true;await onEvent('complete',{characters:[...content].length});return;}
  let chunk;try{chunk=JSON.parse(data);}catch{throw Error('流式数据帧损坏，未把残缺内容当作完整结果');}
  if(chunk.error)throw Error(String(chunk.error.message||chunk.error));
  const c=chunk.choices?.[0];if(c){seen=true;const text=c.delta?.content??c.message?.content??'';
   if(typeof text==='string'&&text){content+=text;if(!firstContent){firstContent=true;await onEvent('content',{});}}
   if(c.finish_reason)finish=c.finish_reason;
  }if(chunk.usage)usage=chunk.usage;
 };
 try{
  while(!done){const {done:eof,value}=await reader.read();if(eof)break;
   if(first){first=false;await onFirst();}const text=decoder.decode(value,{stream:true});raw+=text;pending+=text;
   let at;while((at=pending.indexOf('\n'))>=0){const line=pending.slice(0,at).replace(/\r$/,'');pending=pending.slice(at+1);await event(line);if(done)break;}
  }
  if(!done){const tail=decoder.decode();raw+=tail;pending+=tail;if(pending.trim())await event(pending.replace(/\r$/,''));}
  if(done){void reader.cancel().catch(()=>{});}
 }catch(error){error.partialCharacters=[...content].length;error.receivedBytes=raw.length;throw error;}finally{reader.releaseLock();}
 if(!sse)return raw;
 if(!seen){if(done)throw Error('流式已结束，但没有模型结果');return raw;}
 if(!done&&!finish)throw Error('流式连接提前结束，未收到完成标志；请查看调用日志');
 return JSON.stringify({choices:[{message:{content},finish_reason:finish||'stop'}],usage});
}
