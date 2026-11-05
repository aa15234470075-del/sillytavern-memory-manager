import {apiFailure,emptyCompletion} from './api-errors.js?v=0.7.2';
import {nativeRequest,canonicalNative,readNative} from './native-api.js?v=0.7.2';
import {summarySchema} from './output-contract.js?v=0.7.2';
import {readCompletion} from './stream-reader.js?v=0.7.2';
export class ApiClient {
 constructor(settings,log,context){this.settings=settings;this.log=log;this.context=context;this.key='';this.controller=null;this.cachedModels=null;}
 cancel(){this.controller?.abort('cancelled');}
 async request(kind,messages,externalSignal,validate=null){
  const s=structuredClone(this.settings()),key=this.key;
  let url;try{url=new URL(s.baseUrl);}catch{throw Error('请填写有效的独立API地址');}
  if(!['http:','https:'].includes(url.protocol))throw Error('API地址需使用http或https');
  if(!key)throw Error('请填写并保存API密钥');
  if(kind!=='models'&&!s.model)throw Error('请选择或填写模型');
  const native=s.protocol&&s.protocol!=='tavern';const cached=this.cachedModels;
  if(kind==='models'&&cached?.url===s.baseUrl&&cached.key===key&&cached.protocol===(s.protocol||'tavern')&&Date.now()-cached.at<120000)return cached.values;
  const retries=['models','repair'].includes(kind)?0:Number(s.retries||0);
  for(let attempt=0;attempt<=retries;attempt++){
   const controller=new AbortController();this.controller=controller;
   const cancel=()=>controller.abort('cancelled');externalSignal?.addEventListener('abort',cancel,{once:true});if(externalSignal?.aborted)cancel();
   let phase='准备连接',receivedStatus=null,receivedBytes=0,firstContent=false;const diagnostics=()=>({phase,receivedStatus,receivedBytes,firstContent,model:s.model,protocol:s.protocol||'tavern'});const started=performance.now(),seconds=kind==='models'?15:Number(s.timeout||300);
   const timer=setTimeout(()=>controller.abort('timeout'),seconds*1000);
   try{
    const base={chat_completion_source:'openai',reverse_proxy:s.baseUrl.replace(/\/+$/,''),proxy_password:key};
    const stream=kind==='summary'?Boolean(s.summaryStream):kind==='check'?Boolean(s.checkStream):kind==='repair'?Boolean(s.repairStream):Boolean(s.stream);
    const body=kind==='models'?base:{...base,messages,model:s.model,stream,temperature:0.2,...(s.outputTokens?{max_tokens:Number(s.outputTokens)}:{})};
    if(s.structuredOutput&&s.outputMode==='json'&&['summary','repair','check'].includes(kind)){body.json_schema={name:kind==='check'?'memory_review':'memory_summary',strict:true,value:kind==='check'?{type:'object',properties:{issues:{type:'array',items:{type:'object',properties:{id:{type:'string'},message:{type:'string'},suggestion:{type:'string'},quote:{type:'string'},field:{type:'string'}},required:['id','message','suggestion','quote','field'],additionalProperties:false}}},required:['issues'],additionalProperties:false}:summarySchema({...s,...(kind==='summary'?(()=>{const payload=JSON.parse(messages.at(-1).content);return {summaryLevel:payload.summaryLevel||1,batchProcessing:payload.task?.batchProcessing??s.batchProcessing,batchClassification:payload.task?.batchClassification??s.batchClassification};})():{summaryLevel:s.summaryLevel||1})})};}
    await this.log('API请求准备',{kind,attempt:attempt+1,model:s.model,stream,at:new Date().toISOString(),characters:JSON.stringify(messages).length,outputTokens:s.outputTokens||null});
    if(controller.signal.aborted)throw Error('已取消请求');
    // Refresh only the local Tavern CSRF token. This is not a model retry.
    phase=native?'准备浏览器直连':'刷新酒馆会话令牌';const headers=native?{}:{...this.context().getRequestHeaders()};
    if(Object.keys(headers).some(k=>k.toLowerCase()==='x-csrf-token')){const tokenResponse=await fetch('/csrf-token',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
    if(!tokenResponse.ok)throw Error('酒馆会话检查失败，HTTP '+tokenResponse.status+'；请重新登录或刷新酒馆');
    const tokenData=await tokenResponse.json();if(tokenData.token)headers['X-CSRF-Token']=tokenData.token;}
    phase=native?'等待上游响应头（浏览器直连）':'等待酒馆响应头';await this.log('API请求发送',{protocol:s.protocol||'tavern',transport:native?'浏览器直连':'酒馆后端转发',kind,attempt:attempt+1,model:s.model,stream,at:new Date().toISOString(),note:native?'准备浏览器直连上游；是否收到以上游记录为准':'准备调用酒馆接口；此记录不证明请求已发出或中转已收到'});
    const spec=native?nativeRequest(s,key,kind,messages,stream):null;const response=await fetch(native?spec.url:'/api/backends/chat-completions/'+(kind==='models'?'status':'generate'),native?{...spec.options,signal:controller.signal}:{method:'POST',credentials:'same-origin',headers,body:JSON.stringify(body),signal:controller.signal});
    receivedStatus=response.status;phase='读取返回内容';await this.log(native?'上游响应头（浏览器直连）':'酒馆响应头',{kind,status:response.status,contentType:response.headers.get('content-type'),ms:Math.round(performance.now()-started)});
    if(response.status===403&&!native){const e=Error('酒馆拒绝请求（403），可能是登录或CSRF令牌失效；请刷新酒馆后重试，未自动重新发送模型请求');e.status=403;throw e;}
    const first=()=>this.log('API首批数据',{kind,ms:Math.round(performance.now()-started)});const onNativeContent=()=>{firstContent=true;phase='接收模型正文';return this.log('API首段正文',{kind,ms:Math.round(performance.now()-started)});};const readerOptions={signal:controller.signal,onBytes:n=>{receivedBytes=n;}};const raw=native&&kind!=='models'&&['anthropic','gemini'].includes(s.protocol)?await readNative(response,s.protocol,stream,first,onNativeContent,readerOptions):await readCompletion(response,stream,()=>this.log('API首批数据',{kind,attempt:attempt+1,at:new Date().toISOString(),ms:Math.round(performance.now()-started),note:'仅收到字节，可能是心跳，不代表模型正文'}),async(type,data)=>{if(type==='content')firstContent=true;phase=type==='content'?'接收模型正文':'收到流式完成标志';await this.log(type==='content'?'API首段正文':'API流式完成',{kind,...data,ms:Math.round(performance.now()-started)});},readerOptions);
    await this.log('API返回',{kind,attempt:attempt+1,status:response.status,at:new Date().toISOString(),ms:Math.round(performance.now()-started),raw:raw.split(key).join('[密钥已隐藏]')});
    let data;try{data=JSON.parse(raw);}catch{const e=Error('服务返回非JSON，HTTP '+response.status+'；返回摘要：'+raw.slice(0,220)+'；原始返回已保留');e.status=response.status;throw e;}
    const failure=apiFailure(data,response.status,raw);if(failure)throw failure;if(!response.ok){const error=apiFailure({error:data.message||raw.slice(0,350)},response.status);throw error;}
    if(kind==='models'){
     if(native)data=canonicalNative(s.protocol,data,true);if(data.nextPageToken||data.has_more)throw Error('模型列表超过单页容量，请手动填写模型ID；未把不完整列表当作全部模型');
     const list=Array.isArray(data.data)?data.data:Array.isArray(data.data?.data)?data.data.data:Array.isArray(data.models)?data.models:null;
     if(!list)throw Error('服务返回的模型列表格式不受支持；可手动填写模型ID并测试生成');
     const values=[...new Set(list.map(m=>typeof m==='string'?m:m.id).filter(Boolean))];
     if(!values.length)throw Error('服务返回空模型列表；可手动填写模型ID');
     this.cachedModels={url:s.baseUrl,key,protocol:s.protocol||'tavern',values,at:Date.now()};return values;
    }
    this.lastUsage=data.usage||null;const choice=data.choices?.[0],content=choice?.message?.content;
    if(typeof content!=='string'||!content.trim())throw emptyCompletion(data,response.status);
    await this.log('API结果统计',{kind,model:s.model,elapsedMs:Math.round(performance.now()-started),outputCharacters:Array.from(content).length,usage:this.lastUsage,outputTokens:s.outputTokens||null,finishReason:choice.finish_reason});
    if(choice.finish_reason==='length')throw Error('模型输出被截断，请增大输出上限；本次输入未被裁剪');
    if(validate){try{validate(content);}catch(e){e.validation=true;throw e;}}
    return content;
   }catch(e){
    const message=controller.signal.aborted?(controller.signal.reason==='timeout'?(kind==='models'?'模型列表15秒未响应，已停止等待；可直接填写模型ID测试生成':'请求超时：'+phase+'；HTTP '+(receivedStatus??'未收到')+'，已收 '+receivedBytes+' 字节，'+(firstContent?'已收到首段正文':'未收到首段正文')+'；模型 '+s.model+'，协议 '+(s.protocol||'tavern')+'。浏览器已停止等待，上游是否收到／仍在计算需查上游记录'):'已取消浏览器请求与读取；无法确认上游已停止计算'):String(e.message||e).replace(/Failed to fetch/g,native?'直连接口失败：请检查网络、地址及上游CORS跨域支持（未自动改走其他连接）':'Failed to fetch').split(key).join('[密钥已隐藏]');
    await this.log('API错误',{kind,attempt:attempt+1,message,...diagnostics(),upstreamCode:e.upstreamCode,upstreamType:e.upstreamType,partialCharacters:e.partialCharacters||0,receivedBytes:e.receivedBytes||receivedBytes,ms:Math.round(performance.now()-started)});
    if(e.validation||e.business||controller.signal.aborted||[400,401,403,404].includes(e.status)){const error=Error(message);Object.assign(error,diagnostics(),{upstreamCode:e.upstreamCode,upstreamType:e.upstreamType,cancelled:controller.signal.aborted&&controller.signal.reason!=='timeout'});throw error;}
    if(attempt===retries){const error=Error(message);Object.assign(error,diagnostics());throw error;}
    clearTimeout(timer);await new Promise((resolve,reject)=>{const end=()=>{clearTimeout(wait);externalSignal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',abort);resolve();};const abort=()=>{clearTimeout(wait);externalSignal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',abort);const e=Error('已取消重试；上游是否停止需以上游记录为准');e.cancelled=true;reject(e);};const wait=setTimeout(end,Math.min(1000*2**attempt,8000));externalSignal?.addEventListener('abort',abort,{once:true});controller.signal.addEventListener('abort',abort,{once:true});if(externalSignal?.aborted||controller.signal.aborted)abort();});
   }finally{clearTimeout(timer);externalSignal?.removeEventListener('abort',cancel);if(this.controller===controller)this.controller=null;}
  }
 }
}
