import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,summaryPrompt,renderMemory} from '../core.js';
import {summaryLengthRule,automaticMerge,summaryLevelLabel} from '../summary-rules.js';
import {requestBreakdown,requestView} from '../request-view.js';
import {settingsView} from '../settings-ui.js';

test('summary character ranges are high priority defaults with explicit user override',()=>{
 for(const [detail,range] of [['concise','100–200'],['standard','200–400'],['detailed','400–600']]){
  const prompt=summaryPrompt({...structuredClone(DEFAULTS),detail},'请按我的特殊篇幅要求整理');
  assert.ok(prompt.includes(range));assert.ok(prompt.includes('本条默认范围作废'));assert.ok(prompt.includes('不得截断原文输入'));
 }
 assert.equal(DEFAULTS.timeout,300);assert.equal(DEFAULTS.autoHide,true);assert.ok(summaryLengthRule(DEFAULTS).includes('summary'));
});
test('automatic merging counts saved eligible memory entries, not approval batches',()=>{
 const memories=Array.from({length:4},(_,i)=>({id:'m'+i,level:1,status:'active',kind:'short',sources:[i]}));
 const batches=[{id:'a',level:1,approved:true,ids:['m0','m1'],created:1},{id:'b',level:1,approved:true,ids:['m2','m3'],created:2}];
 assert.equal(automaticMerge(memories,batches,{...DEFAULTS,autoSecondary:true,secondaryCount:5}),null);
 assert.equal(automaticMerge(memories,batches,{...DEFAULTS,autoSecondary:true,secondaryCount:3}).parents.length,3);
 const result=automaticMerge(memories,batches,{...DEFAULTS,autoSecondary:true,secondaryCount:2});assert.equal(result.level,2);assert.equal(result.parents.length,2);
 assert.equal(automaticMerge(memories.map(m=>({...m,status:'archived'})),batches,{...DEFAULTS,autoSecondary:true,secondaryCount:2}),null);
 assert.equal(automaticMerge(memories,batches,DEFAULTS),null);
 const second=memories.map(m=>({...m,level:2})),secondBatches=batches.map(b=>({...b,level:2}));
 assert.equal(automaticMerge(second,secondBatches,{...DEFAULTS,autoTertiary:true,tertiaryCount:2}).level,3);
});
test('request counts separate original chat from selected confirmed summaries',()=>{
 const messages=sources=>[{role:'system',content:'规则'},{role:'user',content:JSON.stringify({sources,reference:{worldBooks:[],character:null,memories:[]},purpose:'test'})}];
 const first=requestBreakdown(messages([{role:'assistant',text:'原文'}]));assert.ok(first.counts.聊天原文>0);assert.equal(first.counts.已选总结记忆,0);
 const merge=requestBreakdown(messages([{role:'memory',text:'旧总结'}]));assert.equal(merge.counts.聊天原文,0);assert.ok(merge.counts.已选总结记忆>0);
 assert.match(requestView(messages([{role:'memory',text:'旧总结'}])),/本次选中的已确认总结记忆/);
});
test('memory stage labels and key presets appear in the requested locations',()=>{
 assert.equal(summaryLevelLabel(0),'手动记忆');assert.equal(summaryLevelLabel(3),'三次总结');
 const view=settingsView(structuredClone(DEFAULTS),[],'',[]);
 assert.ok(view.indexOf('API 密钥预设')<view.indexOf('总结 API'));
 assert.ok(view.includes('自动总结与分级')&&view.includes('300秒'));
 assert.match(renderMemory({kind:'fixed',title:'标题',summary:'正文',sources:[1,2,3,4],level:3,details:{}},DEFAULTS),/三次总结.*第1-4楼/);
});
