import test from 'node:test';
import assert from 'node:assert/strict';
import {PROMPT_LIBRARY,summaryPrompt,DEFAULTS} from '../core.js';
test('two prompt sets route all three levels and preserve selected format',()=>{
 for(const [i,key] of ['shortPrompt','longPrompt','tertiaryPrompt'].entries()){
  const a=PROMPT_LIBRARY.original[key],b=PROMPT_LIBRARY.extended[key];
  assert.ok(b.length>=a.length*1.9&&b.length<=a.length*2.4);
  assert.ok(summaryPrompt({...DEFAULTS,promptVariant:'extended'},'',i+1).startsWith(b));
  assert.ok(summaryPrompt({...DEFAULTS,promptVariant:'original'},'',i+1).startsWith(a));
 }
 assert.ok(summaryPrompt({...DEFAULTS,promptVariant:'custom',longPrompt:'自定义二级'},'',2).startsWith('自定义二级'));
});
