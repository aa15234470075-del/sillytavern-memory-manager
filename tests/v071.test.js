import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,sourceSnapshot,sourceSnapshotAsync} from '../core.js';
import {automaticMerge} from '../summary-rules.js';
import {localKeywords,localKeywordsAsync} from '../keywords.js';
import {issueView} from '../review-ui.js';
import {countControls} from '../summary-ui.js';
import {requestView,requestBreakdown} from '../request-view.js';
import {buildSummaryMessages} from '../summary-request.js';

test('one saved batch of five entries triggers one second-stage group; reservations exclude duplicates',()=>{
 const memories=Array.from({length:10},(_,i)=>({id:'m'+i,status:'active',kind:'short',level:1,sources:[i]}));
 const s={...DEFAULTS,autoSecondary:true,secondaryCount:5};
 const first=automaticMerge(memories,[],s);assert.equal(first.parents.length,5);
 const reserved=new Set(first.parents.map(m=>m.id));
 const second=automaticMerge(memories.filter(m=>!reserved.has(m.id)),[],s);
 assert.deepEqual(second.parents.map(m=>m.id),['m5','m6','m7','m8','m9']);
 assert.equal(automaticMerge(memories.map(m=>({...m,kind:'fixed'})),[],s),null);
});
test('large source extraction and request preserve full Unicode content; previews remain lazy',async()=>{
 const chat=Array.from({length:60},(_,i)=>({mes:'<CONTENT>'+('城门约定，铜印交付。🙂'.repeat(1800))+'</CONTENT>',is_user:i%2===0}));
 const source=await sourceSnapshotAsync(chat,0,59,DEFAULTS);
 assert.deepEqual(source,sourceSnapshot(chat,0,59,DEFAULTS));
 const messages=buildSummaryMessages(DEFAULTS,source,{character:null,worldBooks:[],memories:[]});
 const sent=JSON.parse(messages[1].content).sources;
 assert.equal(sent.length,60);for(let i=0;i<60;i++)assert.equal(sent[i].text,source[i].text);
 assert.ok(requestBreakdown(messages).total>1000000);
 assert.ok(requestView(messages).length<3000);assert.ok(!requestView(messages).includes('铜印交付'));
 const controller=new AbortController();controller.abort();await assert.rejects(sourceSnapshotAsync(chat,0,59,DEFAULTS,controller.signal),{name:'AbortError'});
});
test('local keyword chunks yield the same concrete candidates as synchronous extraction',async()=>{
 const memory={title:'青石桥的铜印',summary:'阿宁在青石桥交付铜印，约定明日入宫。'.repeat(4000)};
 let feedback=0;const words=await localKeywordsAsync(memory,()=>feedback++);
 assert.deepEqual(words,localKeywords(memory));assert.ok(words.includes('铜印'));assert.ok(feedback>0);
});
test('review summary stays compact but retains all original evidence on expansion',()=>{
 const message='核对时间地点。'.repeat(100),suggestion='回看实际发生时间。'.repeat(100);
 const view=issueView({message,suggestion,quote:'原句'});
 assert.ok(view.includes('<details>'));assert.ok(view.includes(message));assert.ok(view.includes(suggestion));
 assert.ok(view.split('<details>')[0].length<300);
 assert.match(countControls({...DEFAULTS,memoryCountMode:'events'}),/<label hidden>指定条数<input disabled/);
 assert.doesNotMatch(countControls({...DEFAULTS,memoryCountMode:'count'}),/<label hidden>指定条数/);
});
