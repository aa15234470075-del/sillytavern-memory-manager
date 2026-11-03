import test from 'node:test';
import assert from 'node:assert/strict';
import {readCompletion} from '../stream-reader.js';
import {ApiClient} from '../connection.js';
import {nextFloor,cleanConfiguration,countInstruction,saveSession,loadSession} from '../session-state.js';
import {localKeywords} from '../keywords.js';
import {DEFAULTS} from '../core.js';
test('SSE DONE completes before HTTP EOF and fragmented UTF8 is preserved',async()=>{
 let cancelled=false;const text='data: '+JSON.stringify({choices:[{delta:{content:'铜印'},finish_reason:'stop'}]})+'\n\ndata: '+JSON.stringify({choices:[],usage:{total_tokens:12}})+'\n\ndata: [DONE]\n\n';
 const bytes=new TextEncoder().encode(text);const body=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));},cancel(){cancelled=true;}});
 const timer=setTimeout(()=>{},300);const result=await Promise.race([readCompletion(new Response(body),true),new Promise((_,reject)=>setTimeout(()=>reject(Error('still waiting for HTTP EOF')),200))]);clearTimeout(timer);
 assert.equal(JSON.parse(result).choices[0].message.content,'铜印');assert.equal(JSON.parse(result).usage.total_tokens,12);assert.ok(cancelled);
});
test('CSRF refresh precedes single model call; failure does not silently retry',async()=>{
 const original=global.fetch;let generation=0,token=0;const events=[];
 global.fetch=async(url,options)=>{if(url==='/csrf-token'){token++;return Response.json({token:'fresh'});}generation++;assert.equal(options.headers['X-CSRF-Token'],'fresh');return Response.json({choices:[{message:{content:'ok'},finish_reason:'stop'}]});};
 try{const c=new ApiClient(()=>({...DEFAULTS,baseUrl:'https://example.invalid/v1',model:'fake',retries:0}),async(stage)=>events.push(stage),()=>({getRequestHeaders:()=>({'X-CSRF-Token':'stale'})}));c.key='dummy';assert.equal(await c.request('summary',[]),'ok');assert.equal(generation,1);assert.equal(token,1);assert.ok(events.includes('酒馆响应头'));
 global.fetch=async url=>{if(url==='/csrf-token')return Response.json({token:'fresh'});generation++;throw TypeError('Failed to fetch');};await assert.rejects(c.request('summary',[]),/Failed to fetch/);assert.equal(generation,2);assert.equal(c.controller,null);
 }finally{global.fetch=original;}
});
test('next floor uses only approved first-stage coverage and preserves holes',()=>{
 const st={batches:[{approved:true,level:1,selectedFloors:Array.from({length:51},(_,i)=>i)},{approved:false,level:1,floors:[51]},{approved:true,level:2,floors:[51,52]}]};assert.equal(nextFloor(st),51);assert.equal(nextFloor({batches:[{approved:true,level:1,floors:[0,1,3]}]}),2);
});
test('configuration cleanup removes nested connection secrets but keeps keyword and nonconnection options',()=>{
 const v=cleanConfiguration({baseUrl:'private',model:'private',apiKey:'secret',profiles:[{options:{repairModel:'private'}}],keywordMin:2,keywords:['铜印'],timeout:300,nested:{proxy_password:'secret',checkBaseUrl:'private',detail:'standard'}});
 assert.ok(!JSON.stringify(v).includes('secret'));assert.ok(!JSON.stringify(v).includes('private'));assert.equal(v.keywordMin,2);assert.equal(v.timeout,300);assert.equal(v.nested.detail,'standard');
});
test('local keyword candidates are local, unique and derived from text; count rule explicit',()=>{
 const k=localKeywords({title:'阿宁持有铜印',summary:'阿宁把铜印带到南城，等待铜印交接。'});assert.ok(k.includes('铜印'));assert.equal(k.length,new Set(k).size);assert.ok(countInstruction('single',3).includes('1条'));assert.ok(countInstruction('count',3).includes('3条'));
});
test('chat sessions persist draft/versions/queue without starting tasks',()=>{
 const previous=global.localStorage,map=new Map();global.localStorage={setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)};
 try{saveSession('a',{draft:{id:'draft'},batchQueue:[{ordinal:2}],draftVersions:[{id:'v1'}]});assert.equal(loadSession('a').draft.id,'draft');assert.equal(loadSession('a').batchQueue[0].ordinal,2);assert.equal(loadSession('b'),null);}finally{global.localStorage=previous;}
});
