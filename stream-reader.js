export async function readCompletion(response,stream,onFirst=async()=>{}){
 if(!stream||!response.body)return response.text();
 const reader=response.body.getReader(),decoder=new TextDecoder();let raw='',first=true;
 try{while(true){const {done,value}=await reader.read();if(done)break;if(first){first=false;await onFirst();}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
 if(!raw.trimStart().startsWith('data:')&&!raw.includes('\ndata:'))return raw;
 let content='',finish=null,usage=null,seen=false,done=false;
 for(const line of raw.split(/\r?\n/)){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(!data)continue;if(data==='[DONE]'){done=true;continue;}let chunk;try{chunk=JSON.parse(data);}catch{throw Error('流式数据帧损坏，未把残缺内容当作完整结果');}if(chunk.error)throw Error(String(chunk.error.message||chunk.error));const c=chunk.choices?.[0];if(c){seen=true;const text=c.delta?.content??c.message?.content??'';if(typeof text==='string')content+=text;if(c.finish_reason)finish=c.finish_reason;}if(chunk.usage)usage=chunk.usage;}
 if(!seen)return raw;if(!done&&!finish)throw Error('流式连接提前结束，未收到完成标志；请查看调用日志');
 return JSON.stringify({choices:[{message:{content},finish_reason:finish||'stop'}],usage});
}
