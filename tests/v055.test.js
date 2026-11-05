import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,validateDraft} from '../core.js';
import {buildSummaryMessages} from '../summary-request.js';
import {requestBreakdown,requestView} from '../request-view.js';
import {responseProblem} from '../response.js';

const refs={character:{description:'参考设定'},worldBooks:[],memories:[]};
const sources=[{floor:7,role:'assistant',text:'原文😀'.repeat(15000),raw:'保留在本地的原始消息'}];
test('actual request builder keeps full materials and repeats selected stage contract in user data',()=>{
 for(const outputMode of ['json','tags','plain'])for(const level of [1,2,3]){
  const messages=buildSummaryMessages({...DEFAULTS,outputMode},sources,refs,'自定义要求',level>1,level);
  const body=JSON.parse(messages[1].content);
  assert.equal(body.sources[0].text,sources[0].text);assert.equal(body.sources[0].raw,undefined);
  assert.deepEqual(body.reference,refs);assert.equal(body.task.requirements,messages[0].content);
  assert.equal(body.summaryLevel,level);assert.equal(body.outputContract.format,outputMode);
  assert.ok(body.task.requirements.includes('自定义要求'));
  if(outputMode==='json'){
   const item=JSON.parse(body.outputContract.example).memories[0];
   assert.equal(Object.hasOwn(item,'brief'),level>1);assert.equal(Object.hasOwn(item,'keywords'),true);
  }
  assert.ok(Object.keys(body).at(-1)==='outputContract');
 }
});
test('character totals cover all message content including repeated constraints and Unicode',()=>{
 const messages=buildSummaryMessages(DEFAULTS,sources,refs);
 const result=requestBreakdown(messages);
 assert.equal(result.total,messages.reduce((n,m)=>n+[...m.content].length,0));
 assert.equal(Object.values(result.counts).reduce((a,b)=>a+b,0),result.total);
 assert.ok(result.counts.请求包装>=0);assert.ok(result.counts.提示词>messages[0].content.length);
 assert.match(requestView(messages),/材料结束后的输出约束/);
});
test('Markdown task drift is reported honestly; valid fenced JSON remains compatible',()=>{
 const raw='# 角色卡\n\n## 人物信息\n普通 Markdown 回复';
 assert.match(responseProblem(raw),/不是合法 JSON 被误判/);
 assert.throws(()=>validateDraft(raw,sources,DEFAULTS),/模型未按约定输出 JSON/);
 assert.match(responseProblem('<stm4-record>内容</stm4-record>'),/专用标签/);
 const [memory]=validateDraft('```json\n{"memories":[{"summary":"有效记忆","sources":[7]}]}\n```',sources,DEFAULTS);
 assert.equal(memory.summary,'有效记忆');
});
