import test from 'node:test';
import assert from 'node:assert/strict';
import {ApiClient} from '../connection.js';
import {DEFAULTS,filterText,selectMemories,parseJson,summaryPrompt,presetEntries} from '../core.js';
test('three exclusive filter modes, whitespace labels and fenced JSON',()=>{
 const text='<thinking>隐</thinking><content>正</content><other>补</other>';
 assert.equal(filterText(text,{filterMode:'off'}).text,text);
 assert.equal(filterText(text,{filterMode:'include',filterTags:'content other'}).text,'正\n补');
 assert.equal(filterText(text,{filterMode:'exclude',filterTags:'thinking other'}).text,'<content>正</content>');
 assert.deepEqual(parseJson('```json\n {"a":1}\n```'),{a:1});
});
test('keyword any, all, count and case rules',()=>{
 const m={id:'x',kind:'long',status:'active',keywords:['南城','铜印']};
 assert.equal(selectMemories([m],'南城',{},0,{keywordRule:'all'}).length,0);
 assert.equal(selectMemories([m],'南城铜印',{},0,{keywordRule:'all'}).length,1);
 assert.equal(selectMemories([m],'南城',{},0,{keywordRule:'min',keywordMin:2}).length,0);
 assert.equal(selectMemories([{...m,keywords:['ABC']}],'abc',{},0,{keywordCase:true}).length,0);
});
test('prompt contains enabled entries only and complete format',()=>{
 const prompt=summaryPrompt({...DEFAULTS,promptEntries:[{name:'有效',content:'保留误信',enabled:true},{name:'关闭',content:'不该发送',enabled:false}]});
 assert.ok(prompt.includes('保留误信'));assert.ok(!prompt.includes('不该发送'));assert.ok(prompt.includes('sources'));assert.ok(DEFAULTS.basePrompt.length>700);
 assert.throws(()=>presetEntries({entries:[{name:'坏'}]}));
});
test('model response cached and credentials never logged',async()=>{
 const original=global.fetch;let calls=0;const logs=[];
 global.fetch=async()=>{calls++;return new Response(JSON.stringify({data:[{id:'model-a'}]}));};
 try{const c=new ApiClient(()=>({...DEFAULTS,baseUrl:'https://example.invalid/v1'}),async(_,d)=>logs.push(d),()=>({getRequestHeaders:()=>({})}));c.key='temporary-secret';assert.deepEqual(await c.request('models',[]),['model-a']);await c.request('models',[]);assert.equal(calls,1);assert.ok(!JSON.stringify(logs).includes(c.key));}finally{global.fetch=original;}
});
test('cancelled request rejects and releases controller',async()=>{
 const original=global.fetch;global.fetch=(_url,opts)=>new Promise((_resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('aborted'))));
 try{const c=new ApiClient(()=>({...DEFAULTS,baseUrl:'https://example.invalid/v1'}),async()=>{},()=>({getRequestHeaders:()=>({})}));c.key='secret';const promise=c.request('models',[]);c.cancel();await assert.rejects(promise,/已取消/);assert.equal(c.controller,null);}finally{global.fetch=original;}
});
