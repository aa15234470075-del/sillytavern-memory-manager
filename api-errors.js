// HTTP status belongs to the transport; upstream codes stay independent.
export function apiFailure(data,httpStatus,raw=''){
 const failure=!data||typeof data!=='object'||!!data.error||data.success===false||data.ok===false||data.status==='error'||data.type==='error';
 if(!failure)return null;
 const messages=[],codes=[],types=[],visited=new Set();
 const visit=(v,depth=0)=>{if(depth>5||v==null||typeof v==='boolean')return;
  if(typeof v==='string'){try{const parsed=JSON.parse(v);if(typeof parsed==='object'){visit(parsed,depth+1);return;}}catch{}if(v.trim())messages.push(v);return;}
  if(typeof v!=='object'||visited.has(v))return;visited.add(v);
  if(v.code!=null)codes.push(String(v.code));if(v.type)types.push(String(v.type));
  for(const k of ['message','error','detail','details','response','body','error_description'])if(v[k]!=null)visit(v[k],depth+1);
 };
 visit(data);const summary=[...new Set(messages)].join('；').slice(0,350)||'响应未包含可用模型正文或错误详情'+(raw?'；响应摘要：'+raw.slice(0,220):'');
 const code=[...new Set(codes)].join('/'),type=[...new Set(types)].join('/');
 const e=Error((httpStatus>=200&&httpStatus<300?'模型业务失败':'API失败')+'（HTTP '+httpStatus+(code?'；上游码 '+code:'')+(type?'；类型 '+type:'')+'）：'+summary);
 e.status=httpStatus;e.business=httpStatus>=200&&httpStatus<300;e.upstreamCode=code;e.upstreamType=type;return e;
}
export function emptyCompletion(data,status){
 return apiFailure({...data,error:data?.message||data?.detail||data?.response||'响应未包含有效choices正文；请核对模型ID与原始返回，不能仅凭HTTP状态判定模型调用成功'},status);
}
