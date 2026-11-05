import test from 'node:test';
import assert from 'node:assert/strict';
import {sortMemories,markedText,keywordHealth,rehearse,characters} from '../experience.js';
import {nativeRequest,canonicalNative,readNative} from '../native-api.js';
import {DEFAULTS} from '../core.js';
import {ApiClient} from '../connection.js';
test('source chronology is stable, reversible and ignores narrative dates',()=>{
 const rows=[{id:'b',sources:[20,22],summary:'古代'},{id:'a',sources:[2],summary:'未来'},{id:'c',sources:[]}];
 assert.deepEqual(sortMemories(rows).map(m=>m.id),['a','b','c']);assert.deepEqual(sortMemories(rows,'desc').map(m=>m.id),['c','b','a']);assert.equal(rows[0].id,'b');
});
test('review marks exact overlapping evidence and escapes HTML',()=>{
 assert.equal(markedText('<a>错误地点',['错误','错误地点']), '&lt;a&gt;<mark class="smm-review-mark">错误地点</mark>');assert.equal(markedText('原句',['不存在']),'原句');
});
test('rehearsal uses selected real floors and exact final injection characters without mutating recall',()=>{
 const memories=[{id:'m',kind:'long',status:'active',title:'铜印',summary:'铜印归阿宁',keywords:['铜印','阿宁'],sources:[0],details:{},level:1}],chat=[{mes:'无关',is_user:true},{mes:'铜印阿宁',is_user:false},{mes:'铜印阿宁',is_system:true}];const recall={};
 assert.equal(rehearse(memories,chat,0,0,recall,DEFAULTS).count,0);const result=rehearse(memories,chat,1,1,recall,DEFAULTS);assert.equal(result.count,1);assert.equal(result.characters,characters(result.text));assert.deepEqual(recall,{});assert.equal(rehearse(memories,chat,2,2,recall,DEFAULTS).count,0);assert.throws(()=>rehearse(memories,chat,2,5,recall,DEFAULTS));
 assert.match(keywordHealth([{title:'铜印',summary:'阿宁',keywords:['事情','铜印','铜印']}])[0].message,/重复/);
});
test('official payloads map roles, keys and output limit without trimming input',()=>{
 const messages=[{role:'system',content:'规则'},{role:'user',content:'长原文'.repeat(30000)}];for(const protocol of ['openai','deepseek','anthropic','gemini']){
 const spec=nativeRequest({...DEFAULTS,protocol,baseUrl:'https://example.test/v1',model:'test',outputTokens:1234},'secret','summary',messages,true);const body=JSON.parse(spec.options.body);assert.ok(spec.options.body.includes(messages[1].content));assert.ok(!spec.url.includes('secret'));
 assert.equal(protocol==='anthropic'?body.max_tokens:protocol==='gemini'?body.generationConfig.maxOutputTokens:body.max_tokens,1234);
 }
 assert.equal(nativeRequest({...DEFAULTS,protocol:'anthropic',baseUrl:'https://api.anthropic.com',model:'x'},'s','test',messages,false).url,'https://api.anthropic.com/v1/messages');
 assert.equal(canonicalNative('gemini',{candidates:[{content:{parts:[{text:'推理',thought:true},{text:'正文'}]},finishReason:'STOP'}]}).choices[0].message.content,'正文');
});
test('native fragmented streaming excludes thinking and preserves truncation',async()=>{
 const frames=[{type:'content_block_delta',delta:{type:'thinking_delta',thinking:'hidden'}},{type:'content_block_delta',delta:{type:'text_delta',text:'中文🙂'}},{type:'message_delta',delta:{stop_reason:'max_tokens'},usage:{output_tokens:20}}];const bytes=new TextEncoder().encode(frames.map(d=>'data: '+JSON.stringify(d)+'\n\n').join(''));let at=0;
 const stream=new ReadableStream({pull(c){if(at===bytes.length)c.close();else c.enqueue(bytes.slice(at,at+=Math.min(7,bytes.length-at)));}});const result=JSON.parse(await readNative(new Response(stream),'anthropic',true,async()=>{},async()=>{}));assert.equal(result.choices[0].message.content,'中文🙂');assert.equal(result.choices[0].finish_reason,'length');
 await assert.rejects(readNative(new Response('data: {"type":"ping"}\n\n'),'anthropic',true,async()=>{},async()=>{}),/提前结束/);
});
test('native client does not use Tavern CSRF and catches native truncation',async()=>{
 const old=global.fetch;const calls=[];global.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({content:[{type:'text',text:'部分JSON'}],stop_reason:'max_tokens'}));};
 try{const client=new ApiClient(()=>({...DEFAULTS,protocol:'anthropic',baseUrl:'https://api.anthropic.com',model:'claude',summaryStream:false}),async()=>{},()=>({getRequestHeaders:()=>{throw Error('should not call');}}));client.key='secret';await assert.rejects(client.request('summary',[{role:'user',content:'原文'}]),/截断/);assert.equal(calls.length,1);assert.match(calls[0].url,/\/v1\/messages$/);}finally{global.fetch=old;}
});
