import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileCoverage,rewindStarts} from '../coverage.js';
import {coveredFloors,nextFloor,countInstruction} from '../session-state.js';
import {DEFAULTS,eligibleRange,validateDraft} from '../core.js';
import {statusCandidates,applyStatusUpdates} from '../status-updates.js';
import {formatExample,parseAlternative} from '../formats.js';
import {summarySchema} from '../output-contract.js';
import {localKeywords,localKeywordsAsync} from '../keywords.js';
import {keywordHealth} from '../experience.js';
import {buildSummaryMessages} from '../summary-request.js';
import {ApiClient} from '../connection.js';
import {readCompletion} from '../stream-reader.js';
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);

test('legacy missing IDs, stale IDs and absent batches all reopen exactly deleted floors; hidden never changes',()=>{
 for(const variant of ['missing','stale','none']){
  const removed={id:'last',sources:range(20,25)},st={revision:0,memories:[{id:'first',sources:range(0,19),status:'active'}],hidden:range(0,25),batches:variant==='none'?[]:[{level:1,approved:true,floors:range(0,19),ids:['first']},{level:1,approved:true,floors:range(20,25),...(variant==='stale'?{ids:['obsolete']}: {})}],options:{startFloor:26,autoStartFloor:26}};
  const before=structuredClone(st.hidden),settings={startFloor:26,autoStartFloor:26};rewindStarts(settings,st,reconcileCoverage(st,[removed]));
  assert.equal(settings.startFloor,20,variant);assert.equal(settings.autoStartFloor,20);assert.equal(nextFloor(st,settings.startFloor),20);assert.equal(eligibleRange(Array(30).fill({is_system:true}),st,{...DEFAULTS,keepRecent:0},settings.autoStartFloor).start,20);assert.ok(!coveredFloors(st).includes(20));assert.deepEqual(st.hidden,before);
  assert.equal(nextFloor(JSON.parse(JSON.stringify(st)),20),20);
 }
});
test('imported memory never marks this chat as summarized; partial deletion and resaving recover only the selected range',()=>{
 const st={revision:0,memories:[{id:'import',imported:true,sources:range(0,99)}],batches:[]};assert.deepEqual(coveredFloors(st),[]);
 st.batches=[{level:1,approved:true,floors:range(0,25),selectedFloors:range(0,25)}];reconcileCoverage(st,[{id:'tail',sources:range(20,25)}]);assert.equal(nextFloor(st,20),20);assert.ok(coveredFloors(st).includes(19));
 st.reopenedFloors=st.reopenedFloors.filter(f=>f>22);st.batches.push({level:1,approved:true,floors:range(20,22)});assert.equal(nextFloor(st,20),23);
});
test('event and time modes define scene chains rather than person pairs or minute intervals',()=>{
 for(const mode of ['events','time','single','count']){const text=countInstruction(mode,3);assert.match(text,/A与B、B与C、A与C/);assert.match(text,/十分钟/);assert.match(text,/过了一会儿/);assert.match(text,/不编造日期/);}
});
const old={id:'old',title:'铜印约定',status:'active',kind:'short',summary:'摘要原样',details:{promises:'阿宁归还铜印\r\n明日赴约',unresolved:'查明来信身份',time:'昨日',place:'桥边'},sources:[1]};
const evidence='阿宁已经归还铜印，约定已完成。';
const proposal={memoryId:'old',field:'promises',itemText:'阿宁归还铜印',sourceFloor:20,evidence};
const sources=[{floor:20,role:'assistant',text:evidence}];
test('scoped status suggestions require exact unique old line, active chat memory, current-floor evidence and enabled independent field',()=>{
 const valid=statusCandidates([{statusUpdates:[proposal,proposal]}],[old],sources,DEFAULTS);assert.equal(valid.length,1);assert.equal(valid[0].selected,false);
 for(const bad of [{field:'time'},{itemText:'归还铜印'},{memoryId:'missing'},{sourceFloor:19},{evidence:'阿宁将要归还铜印'},{evidence:'阿宁尚未完成约定'}])assert.deepEqual(statusCandidates([{statusUpdates:[{...proposal,...bad}]}],[old],sources,DEFAULTS),[]);
 assert.deepEqual(statusCandidates([{statusUpdates:[proposal]}],[old],sources,{...DEFAULTS,modes:{...DEFAULTS.modes,promises:'inline'}}),[]);
 assert.deepEqual(statusCandidates([{statusUpdates:[proposal]}],[{...old,details:{promises:'阿宁归还铜印\n阿宁归还铜印'}}],sources,DEFAULTS),[]);
});
test('completion updates append only the approved marker, preserve CRLF and all other fields, record original value',()=>{
 const m=structuredClone(old),p=statusCandidates([{statusUpdates:[proposal]}],[m],sources,DEFAULTS);assert.deepEqual(applyStatusUpdates([m],p,'task'),[]);assert.deepEqual(m,old);
 p[0].selected=true;const updates=applyStatusUpdates([m],p,'task',123);assert.equal(m.details.promises,'阿宁归还铜印（已完成）\r\n明日赴约');assert.equal(m.summary,old.summary);assert.equal(m.details.time,'昨日');assert.equal(m.details.place,'桥边');assert.equal(m.details.unresolved,old.details.unresolved);assert.deepEqual(updates.map(m=>m.title),['铜印约定']);assert.equal(m.statusHistory[0].before,old.details.promises);assert.equal(m.statusHistory[0].at,123);
 assert.throws(()=>applyStatusUpdates([m],p,'again'),/已改变/);
});
test('multiple completion markers in same field apply atomically; stale second proposal changes nothing',()=>{
 const m=structuredClone(old),ps=statusCandidates([{statusUpdates:[proposal]}],[m],sources,DEFAULTS);ps[0].selected=true;const stale={...ps[0],memoryId:'missing',title:'丢失'};assert.throws(()=>applyStatusUpdates([m],[...ps,stale],'t'),/已改变/);assert.deepEqual(m,old);
});
test('all formats and stages preserve keywords and structured completion suggestions without changing short kind',()=>{
 for(const outputMode of ['json','tags','plain'])for(const summaryLevel of [1,2,3]){
  const s={...DEFAULTS,outputMode,summaryLevel};let example=formatExample(s);if(outputMode==='json'){const data=JSON.parse(example);data.memories[0].sources=[20];data.memories[0].statusUpdates=[proposal];example=JSON.stringify(data);}else{const data=parseAlternative(example,outputMode);assert.ok(data.memories[0].keywords.length);continue;}
  const item=validateDraft(example,sources,s)[0];assert.ok(item.keywords.length);assert.equal(item.kind,'short');assert.deepEqual(item.statusUpdates,[proposal]);
 }
 assert.ok(summarySchema(DEFAULTS).properties.memories.items.properties.keywords);assert.ok(summarySchema(DEFAULTS).properties.memories.items.properties.statusUpdates);
 const request=buildSummaryMessages(DEFAULTS,sources,{memories:[old]},'');assert.match(request[0].content,/所有阶段均提取具体关键词/);assert.match(request[0].content,/用户核对勾选/);
});
test('local keyword extraction gives usable candidates for names, Chinese locations and Latin entities without an API',async()=>{
 for(const m of [{title:'青石桥铜印',summary:'阿宁在青石桥归还铜印。'},{title:'来信',summary:'张三在天牢见到李四，约定取回密函。'},{title:'Orion',summary:'Alice delivered the Orion key to Bob.'}]){const words=localKeywords(m);assert.ok(words.length>=2,JSON.stringify(words));assert.ok(words.every(w=>[m.title,m.summary].join(' ').includes(w)));assert.deepEqual(await localKeywordsAsync(m),words);}
 const health=keywordHealth([{title:'铜印',summary:'已归还',keywords:['未保留的历史称谓']}])[0];assert.match(health.message,/当前记忆/);assert.doesNotMatch(health.message,/正文/);
});
const configured=(patch={})=>({...DEFAULTS,baseUrl:'https://test.invalid/v1',model:'test-model',...patch});
function client(settings,logs=[]){const c=new ApiClient(()=>settings,async(stage,data)=>logs.push({stage,data}),()=>({getRequestHeaders:()=>({})}));c.key='not-a-real-key';return c;}
test('HTTP200 nested/string errors and missing choices report business details without inventing a 404 or retry',async()=>{
 const original=global.fetch;
 try{for(const data of [{error:{message:'model removed',code:'model_not_found',type:'invalid_request_error'}},{error:JSON.stringify({error:{message:'model renamed',code:404}})},{choices:[],message:'model unavailable'}]){let count=0;global.fetch=async()=>{count++;return new Response(JSON.stringify(data));};const c=client(configured({retries:2}));await assert.rejects(c.request('summary',[]),error=>{assert.match(error.message,/HTTP 200/);assert.match(error.message,/model/);return true;});assert.equal(count,1);}}
 finally{global.fetch=original;}
});
test('SSE business errors preserve upstream code/type and cancel the reader',async()=>{
 let cancelled=false;const response=new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {"error":{"message":"model removed","type":"invalid_request_error","code":"model_not_found"}}\n\n'));},cancel(){cancelled=true;}}));
 await assert.rejects(readCompletion(response,true),/model_not_found/);assert.equal(cancelled,true);
});
test('timeouts distinguish waiting headers from body bytes without pretending to know relay receipt',async()=>{
 const original=global.fetch;
 try{
  global.fetch=(_u,o)=>new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(Error('aborted'))));
  await assert.rejects(client(configured({timeout:.025})).request('summary',[]),/等待酒馆响应头.*未收到.*0 字节/);
  let cancelled=false;global.fetch=async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"你好"}}]}\n'));},cancel(){cancelled=true;}}));
  const logs=[];await assert.rejects(client(configured({timeout:.025,summaryStream:true}),logs).request('summary',[]),e=>{assert.match(e.message,/接收模型正文/);assert.match(e.message,/HTTP 200/);assert.match(e.message,/已收到首段正文/);return true;});assert.equal(cancelled,true);assert.ok(logs.find(x=>x.stage==='API错误').data.receivedBytes>0);
 }finally{global.fetch=original;}
});
test('cancel aborts nonstream body reading and no retry follows',async()=>{
 const original=global.fetch;let stopped=false,calls=0;
 global.fetch=async()=>{calls++;return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"choices":'));},cancel(){stopped=true;}}));};
 try{const c=client(configured({retries:2}));const request=c.request('summary',[]);setTimeout(()=>c.cancel(),20);await assert.rejects(request,/已取消浏览器请求/);assert.equal(stopped,true);assert.equal(calls,1);assert.equal(c.controller,null);}finally{global.fetch=original;}
});
test('structured output uses the actual batch contract instead of stale global defaults',async()=>{
 const original=global.fetch;let body;
 global.fetch=async(_u,o)=>{body=JSON.parse(o.body);return new Response(JSON.stringify({choices:[{message:{content:'OK'},finish_reason:'stop'}]}));};
 try{const messages=buildSummaryMessages({...DEFAULTS,batchProcessing:true,batchClassification:'ai'},sources,{memories:[]});await client(configured({structuredOutput:true,batchProcessing:false,batchClassification:'manual'})).request('summary',messages);const schema=body.json_schema.value.properties.memories.items;assert.ok(schema.properties.suggestedKind);assert.ok(schema.required.includes('keywords'));assert.ok(schema.required.includes('brief'));assert.ok(schema.required.includes('statusUpdates'));}finally{global.fetch=original;}
});
test('tag and plain completion proposals retain the exact structured payload',()=>{
 for(const outputMode of ['tags','plain']){let example=formatExample({...DEFAULTS,outputMode,summaryLevel:1});example=outputMode==='tags'?example.replace('<stm4-updates>[]</stm4-updates>','<stm4-updates>'+JSON.stringify([proposal])+'</stm4-updates>'):example.replace('旧事项完成建议：[]','旧事项完成建议：'+JSON.stringify([proposal]));assert.deepEqual(parseAlternative(example,outputMode).memories[0].statusUpdates,[proposal]);}
});
test('cancel during configured retry backoff prevents another model request',async()=>{
 const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;return new Response('{"error":{"message":"temporarily unavailable"}}',{status:503});};
 try{const c=client(configured({retries:2}));const p=c.request('summary',[]);setTimeout(()=>c.cancel(),20);await assert.rejects(p,/已取消重试/);assert.equal(calls,1);}finally{global.fetch=original;}
});
