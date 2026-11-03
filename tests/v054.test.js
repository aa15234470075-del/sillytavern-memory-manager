import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,filterText,validateDraft,eligibleRange,newStore} from '../core.js';
import {floorLabel} from '../memory-tools.js';
import {automaticMerge} from '../summary-rules.js';

test('unclosed uppercase content preserves body and strips both closed and open excluded blocks',()=>{
 const settings={...DEFAULTS,sourceTag:'content,context',excludeTags:'think,thinking,details,summary'};
 assert.deepEqual(filterText('<THINK>hidden</THINK><CONTENT>实际剧情',settings),{text:'实际剧情',missing:false,partialTag:true});
 assert.equal(filterText('<CONTENT>事实<THINK>不发送</THINK>后续事实</CONTENT><summary>装饰</summary>',settings).text,'事实后续事实');
 assert.equal(filterText('<CONTENT>事实<THINK>不发送',settings).text,'事实');
});

test('source mismatch compatibility warns once per item and never verifies user speech',()=>{
 const raw=JSON.stringify({memories:[{summary:'角色持有铜印',sources:[90],details:{quotes:['用户所说的话']}}]});
 const sources=[{floor:1,role:'user',text:'用户所说的话'},{floor:2,role:'assistant',text:'角色持有铜印'}];
 assert.throws(()=>validateDraft(raw,sources,DEFAULTS),/来源校验/);
 const [item]=validateDraft(raw,sources,{...DEFAULTS,allowSourceMismatch:true});
 assert.deepEqual(item.sources,[1,2]);assert.equal(item.validationWarnings.length,1);
 assert.equal(item.details.quotes,undefined);assert.equal(item.quoteChecks[0].verified,false);
 assert.equal(floorLabel([14,16,18,20]),'第14-20楼');assert.equal(floorLabel([7]),'第7-7楼');
});

test('automatic threshold uses its own start and size while hiding tail remains independent',()=>{
 const store=newStore(),chat=Array(30).fill({});
 assert.equal(eligibleRange(chat,store,{...DEFAULTS,keepRecent:0},20,10).complete,true);
 store.batches.push({approved:true,level:1,floors:[20,21,22,23,24,25,26,27,28,29]});
 assert.equal(eligibleRange(chat,store,{...DEFAULTS,keepRecent:0},20,10),null);
 const manual={id:'m',level:0,status:'active',kind:'short',sources:[1]};
 assert.equal(automaticMerge([manual],[{approved:true,level:1,ids:['m'],created:1}],{autoSecondary:true,secondaryCount:2}),null);
});
