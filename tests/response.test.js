import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS as USER_DEFAULTS,filterText,parseJson,validateDraft} from '../core.js';
import {formatExample,repairMessages} from '../formats.js';
import {requestBreakdown} from '../request-view.js';
// These provenance scenarios explicitly enable quote extraction.
const DEFAULTS={...USER_DEFAULTS,modes:{...USER_DEFAULTS.modes,quotes:'separate'}};
test('escaped speech and trailing comma do not confuse the JSON scanner',()=>{
 const raw='```json\n'+JSON.stringify({memories:[{summary:'他说："先走"，又说："回来"。',sources:[0]}]}).replace(/}]}/,'},]}')+'\n```<Memory>ignore</Memory>';
 assert.equal(validateDraft(raw,[{floor:0,text:'原文'}],DEFAULTS)[0].summary,'他说："先走"，又说："回来"。');
 assert.deepEqual(parseJson('{"issues":[],"note":"a\\\"b",}'),{issues:[],note:'a"b'});
});
test('all output formats enter the same provenance validator',()=>{
 for(const outputMode of ['json','tags','plain']){const s={...DEFAULTS,outputMode};const raw=formatExample(s);const result=validateDraft(raw,[{floor:0,text:'原文'},{floor:1,text:'原文'}],s);assert.equal(result.length,1);assert.deepEqual(result[0].sources,[0,1]);}
});
test('format repair contains only response and format instructions, no source',()=>{
 const messages=repairMessages('broken',Error('syntax'),DEFAULTS);assert.equal(JSON.parse(messages[1].content).originalResponse,'broken');assert.ok(!messages[1].content.includes('sources'));
 const info=requestBreakdown([{role:'system',content:'规则'},{role:'user',content:JSON.stringify({sources:[{floor:0,text:'内容'}],reference:{worldBooks:[],character:{name:'测试'},memories:[]},purpose:'整理原文'})}]);assert.ok(info.counts['人设']>0);assert.ok(info.total>0);
});
test('read fenced result and ignore appended instructions without executing them',()=>{
 const result={memories:[{title:'铜印',summary:'阿宁收到铜印。',sources:[4],details:{quotes:['我收下了。','不存在的引文']}}]};
 const raw='```json\n'+JSON.stringify(result)+'\n```\n<Memory><!-- updateRow(0,0,{}) --></Memory>';
 const items=validateDraft(raw,[{floor:4,role:'assistant',text:'阿宁说：“我收下了。”'}],DEFAULTS);
 assert.equal(items.length,1);assert.equal(items[0].details.quotes,'我收下了。');
});
test('allow trailing commas but preserve commas and escapes inside strings',()=>{
 assert.deepEqual(parseJson('说明\n{"issues":[],"note":"a,}\\\"b",}\n结束'),{issues:[],note:'a,}"b'});
 assert.throws(()=>parseJson('{"memories":['));
 assert.throws(()=>parseJson('{"issues":[]}\n{"issues":[1]}'),/多份/);
});
test('source and summary validation are never relaxed',()=>{
 assert.throws(()=>validateDraft('```json\n{"memories":[{"summary":"事实","sources":[99]}]}\n```',[{floor:4,role:'assistant',text:'事实'}],DEFAULTS),/来源/);
 assert.throws(()=>validateDraft('{"memories":[{"sources":[4]}]}',[{floor:4,role:'assistant',text:'事实'}],DEFAULTS),/摘要/);
});
test('blacklist and whitelist combine and users retain their own full input',()=>{
 const s={...DEFAULTS,filterMode:'combined',sourceTag:'content',excludeTags:'thinking'};
 assert.equal(filterText('<content>正<thinking>隐</thinking>文</content>',s).text,'正文');
 assert.equal(filterText('用户全文',s,true).text,'用户全文');
 assert.equal(filterText('无标签',s).missing,true);
});
