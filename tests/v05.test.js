import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS as USER_DEFAULTS,summaryPrompt,priorityInstruction,sourceSnapshot,validateDraft} from '../core.js';
import {formatExample} from '../formats.js';
import {quoteChecks} from '../memory-tools.js';
// These provenance scenarios explicitly enable quote extraction.
const DEFAULTS={...USER_DEFAULTS,modes:{...USER_DEFAULTS.modes,quotes:'separate'}};
test('quotes require actual assistant provenance, never floor parity or user repetition',()=>{
 const sources=[{floor:2,role:'user',text:'用户的原话'},{floor:3,role:'assistant',text:'角色真正说出'}];
 const item=validateDraft(JSON.stringify({memories:[{summary:'事实',sources:[2,3],details:{quotes:['用户的原话','角色真正说出']}}]}),sources,DEFAULTS)[0];
 assert.equal(item.details.quotes,'角色真正说出');assert.equal(item.quoteChecks[0].verified,false);
 assert.equal(sourceSnapshot([{is_user:true,mes:'用户'},{is_system:true,mes:'系统'},{is_user:false,mes:'角色'}],0,2,{...DEFAULTS,filterMode:'off'})[1].role,'assistant');
});
test('selected memory sources preserve all original floors and only inherit verified quotes',()=>{
 const sources=[{floor:0,originalFloors:[0,2,4],role:'memory',text:'旧摘要\n角色说过\n用户复述',quotes:[{text:'角色说过',verified:true,floor:2}]}];
 const item=validateDraft(JSON.stringify({memories:[{summary:'新摘要',sources:[2,4],details:{quotes:['角色说过','用户复述']}}]}),sources,{...DEFAULTS,summaryLevel:2})[0];
 assert.deepEqual(item.sources,[2,4]);assert.equal(item.details.quotes,'角色说过');
 assert.throws(()=>validateDraft(JSON.stringify({memories:[{summary:'坏来源',sources:[3]}]}),sources,DEFAULTS),/来源/);
});
test('unsupported precise times warn without silently deleting the generated draft',()=>{
 const item=validateDraft(JSON.stringify({memories:[{summary:'256年03月08日00:25抵达',sources:[0],details:{}}]}),[{floor:0,role:'assistant',text:'256年03月07日23:58尚在水牢'}],DEFAULTS)[0];
 assert.equal(item.validationWarnings.length,1);assert.ok(item.validationWarnings[0].includes('00：25'));assert.ok(item.summary.includes('抵达'));
});
test('phase priorities vary independently and review never rewrites actual events as canon',()=>{
 assert.ok(priorityInstruction(DEFAULTS,2).includes('用户选中的已确认记忆'));
 assert.ok(priorityInstruction(DEFAULTS,1,true).includes('角色人设、世界书和用户固定记忆'));
 const s={...DEFAULTS,phasePriority:{...DEFAULTS.phasePriority,second:'canon'}};
 assert.ok(priorityInstruction(s,2).includes('最高核对优先级：角色人设'));
 assert.ok(summaryPrompt(DEFAULTS).includes('请求/计划前往不代表抵达'));
});
test('all three batch output modes preserve classification suggestions and long recall data',()=>{
 for(const outputMode of ['json','tags','plain']){
  const s={...DEFAULTS,outputMode,batchProcessing:true,batchClassification:'ai',summaryLevel:1};
  let raw=formatExample(s).replaceAll('short 或 long 或 fixed','long');
  const [item]=validateDraft(raw,[{floor:0,role:'assistant',text:'原文'},{floor:1,role:'assistant',text:'原文'}],s);
  assert.equal(item.suggestedKind,'long');assert.ok(item.brief);assert.ok(item.keywords.length);
 }
});
