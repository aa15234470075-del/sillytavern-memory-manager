import test from 'node:test';
import assert from 'node:assert/strict';
import {hideFloors,floorLabel} from '../memory-tools.js';
import {readCompletion} from '../stream-reader.js';
import {DEFAULTS,validateDraft,summaryPrompt} from '../core.js';
import {ApiClient} from '../connection.js';
import {normalizeIssues} from '../memory-tools.js';
import {checkRepairMessages} from '../formats.js';
test('summary/check/repair independently select streaming without altering input',async()=>{
 const original=global.fetch,seen=[];
 global.fetch=async(_url,options)=>{const body=JSON.parse(options.body);seen.push(body);return new Response(JSON.stringify({choices:[{message:{content:'OK'},finish_reason:'stop'}]}));};
 try{const client=new ApiClient(()=>({...DEFAULTS,baseUrl:'https://example.invalid/v1',model:'mock',summaryStream:true,checkStream:false,repairStream:true}),async()=>{},()=>({getRequestHeaders:()=>({})}));client.key='temporary';const messages=[{role:'user',content:'正文'.repeat(20000)}];for(const kind of ['summary','check','repair'])assert.equal(await client.request(kind,messages),'OK');assert.deepEqual(seen.map(b=>b.stream),[true,false,true]);assert.equal(seen[0].messages[0].content,messages[0].content);}finally{global.fetch=original;}
});
test('retries obey user setting exactly and never switch models automatically',async()=>{
 const original=global.fetch,used=[],statusCalls=[];global.fetch=async(url,options)=>{const body=JSON.parse(options.body);if(url.endsWith('/status')){statusCalls.push(body);return new Response(JSON.stringify({data:[{id:'first'},{id:'backup'}]}));}used.push(body.model);return new Response(JSON.stringify({error:{message:'upstream unstable'}}),{status:503});};
 try{for(const retries of [0,1]){const client=new ApiClient(()=>({...DEFAULTS,baseUrl:'https://example.invalid/v1',model:'first',retries}),async()=>{},()=>({getRequestHeaders:()=>({})}));client.key='same-configured-key';await assert.rejects(client.request('summary',[{role:'user',content:'unchanged'}]),/API失败/);}assert.deepEqual(used,['first','first','first']);assert.equal(statusCalls.length,0);}finally{global.fetch=original;}
});
test('hide only selected batch tail, including high floors and sparse selection',()=>{
 assert.deepEqual(hideFloors(Array.from({length:10},(_,i)=>i),3),[0,1,2,3,4,5,6]);
 assert.deepEqual(hideFloors(Array.from({length:10},(_,i)=>i+10),3),[10,11,12,13,14,15,16]);
 assert.deepEqual(hideFloors([20,40,50],2),[20]);assert.deepEqual(hideFloors([1,2],10),[]);
 assert.equal(floorLabel([0,1,2,4,6,7]),'第0-2、4、6-7楼');
});
test('bad quote remains reviewable, never injected as verified quote',()=>{
 const [m]=validateDraft(JSON.stringify({memories:[{summary:'事实',sources:[3],details:{quotes:['真实原话','虚构台词']}}]}),[{floor:3,role:'assistant',text:'他说：真实原话。'}],DEFAULTS);
 assert.equal(m.details.quotes,'真实原话');assert.equal(m.quoteChecks.length,2);assert.equal(m.quoteChecks[1].verified,false);
});
test('first-level formats do not request brief or keywords, later levels do',()=>{
 const first=summaryPrompt(DEFAULTS,'',1),second=summaryPrompt(DEFAULTS,'',2);
 assert.ok(!first.includes('"brief":'));assert.ok(!first.includes('"keywords":'));
 assert.ok(second.includes('"brief":'));assert.ok(second.includes('"keywords":'));
});
test('streaming handles fragmented bytes, usage, truncation and missing finish',async()=>{
 const text='data: '+JSON.stringify({choices:[{delta:{content:'中文'},finish_reason:null}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{content:'结果'},finish_reason:'length'}],usage:{prompt_tokens:500}})+'\n\ndata: [DONE]\n';
 const bytes=new TextEncoder().encode(text);const body=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=5)c.enqueue(bytes.slice(i,i+5));c.close();}});
 const out=JSON.parse(await readCompletion(new Response(body),true));assert.equal(out.choices[0].message.content,'中文结果');assert.equal(out.choices[0].finish_reason,'length');assert.equal(out.usage.prompt_tokens,500);
 await assert.rejects(readCompletion(new Response('data: {"choices":[{"delta":{"content":"不完整"}}]}\n'),true),/提前结束/);
 await assert.rejects(readCompletion(new Response('data: broken\n'),true),/损坏/);
 const json='{"choices":[]}';assert.equal(await readCompletion(new Response(json),true),json);
});

test('check issues accept semantic field locations and preserve them as global annotations',()=>{
 const items=[{id:'uuid-1'}];
 const issues=normalizeIssues([{id:'draft.details.time',message:'时刻冲突',suggestion:'核对原文'},{id:'uuid-1',message:'引用缺证'}],items);
 assert.deepEqual(issues.map(i=>i.id),[null,'uuid-1']);
 assert.equal(issues[0].location,'draft.details.time');
 assert.equal(issues[0].message,'时刻冲突');
 assert.throws(()=>normalizeIssues([{id:'bad',message:''}],items),/有效issues/);
 assert.deepEqual(normalizeIssues([],items),[]);
});
test('check format repair only repairs report structure, preserving original response',()=>{
 const raw='```json\n{"issues":[{"id":"details.time","message":"时间问题\"}]\n```';
 const messages=checkRepairMessages(raw,Error('JSON syntax'),DEFAULTS);
 assert.equal(JSON.parse(messages[1].content).originalResponse,raw);
 assert.ok(messages[0].content.includes('不重新检查剧情'));
 assert.ok(messages[0].content.includes('只输出issues检查JSON'));
 assert.ok(!messages[0].content.includes('\"memories\":'));
});
