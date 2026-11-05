import test from 'node:test';
import assert from 'node:assert/strict';
import {parseResponse,recoverValueQuotes,JSON_RECOVERED} from '../response.js';
import {validateDraft,DEFAULTS} from '../core.js';
test('paired unescaped dialogue quotes are recovered without changing string content',()=>{
 const raw='```json\n{"memories":[{"summary":"他说"上楼摸摸"后停下，又说"慢点吃"给对方听。","sources":[0]}]}\n```';
 const parsed=parseResponse(raw);assert.equal(parsed.memories[0].summary,'他说"上楼摸摸"后停下，又说"慢点吃"给对方听。');assert.equal(parsed[JSON_RECOVERED],4);
 const items=validateDraft(raw,[{floor:0,role:'assistant',text:'他说"上楼摸摸"后停下，又说"慢点吃"给对方听。'}],DEFAULTS);assert.match(items[0].validationWarnings[0],/仅在本地/);
});
test('quote compatibility refuses incomplete, ambiguous, key and multi-result repair',()=>{
 for(const raw of ['{"memories":[{"summary":"他说"正文"后停下。","sources":[0]}', '{"memories":[{"summary":"a" "b","sources":[0]}]}','{"memo"ries":[]}','{"memories":[{"summary":"无成对"引号","sources":[0]}]}'])assert.throws(()=>validateDraft(raw,[{floor:0,role:'assistant',text:'材料'}],DEFAULTS),/JSON|结果|字段/);
 const a='{"memories":[{"summary":"他说"甲"后停。","sources":[0]}]}',b=a.replace('甲','乙');assert.throws(()=>parseResponse('```json\n'+a+'\n```\n```json\n'+b+'\n```'),/多份/);
 assert.equal(recoverValueQuotes('{"memories":[]}'),null);
});
