import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileCoverage,rewindStarts} from '../coverage.js';
import {coveredFloors,nextFloor} from '../session-state.js';
import {DEFAULTS,summaryPrompt,PROMPT_LIBRARY,validateDraft} from '../core.js';
import {summarySchema} from '../output-contract.js';
import {buildSummaryMessages} from '../summary-request.js';
import {readWorldBooks} from '../runtime.js';
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
test('deleting final saved memory reopens source range and rewinds both pointers',()=>{
 const store={revision:0,memories:[{id:'first'}],options:{startFloor:26,autoStartFloor:26},batches:[{approved:true,level:1,floors:range(0,19),ids:['first']},{approved:true,level:1,floors:range(20,25),ids:['deleted']}]};
 const settings={startFloor:26,autoStartFloor:26};const rewind=reconcileCoverage(store);rewindStarts(settings,store,rewind);
 assert.equal(rewind,20);assert.equal(settings.startFloor,20);assert.equal(settings.autoStartFloor,20);assert.equal(nextFloor(store,settings.startFloor),20);assert.ok(!coveredFloors(store).includes(25));
});
test('merged descendants continue covering deleted ancestor memories',()=>{
 const store={revision:0,memories:[{id:'third',parentIds:['second']}],batches:[{approved:true,level:1,floors:range(0,5),ids:['first']},{approved:true,level:2,ids:['second'],parentIds:['first']},{approved:true,level:3,ids:['third'],parentIds:['second']}]};
 assert.equal(reconcileCoverage(store),null);assert.equal(store.batches[0].approved,true);
});
test('two complete prompt versions reinforce material isolation, serialization and dedup without trimming input',()=>{
 for(const key of ['shortPrompt','longPrompt','tertiaryPrompt'])assert.ok(PROMPT_LIBRARY.extended[key].length>=PROMPT_LIBRARY.original[key].length*2);
 const sources=[{floor:200,role:'assistant',text:'“好孩子”'.repeat(25000),raw:'raw retained'}];const m=buildSummaryMessages(DEFAULTS,sources,{character:null,worldBooks:[],memories:[]});
 assert.equal(JSON.parse(m[1].content).sources[0].text,sources[0].text);assert.deepEqual(JSON.parse(m[1].content).task.allowedSourceFloors,[200]);assert.match(summaryPrompt(DEFAULTS),/严格序列化/);assert.match(summaryPrompt(DEFAULTS),/去重与来源/);
 assert.equal(summarySchema({...DEFAULTS,summaryLevel:1}).additionalProperties,false);
});
test('invalid source is visibly unverified and out of range never preserved as a factual source',()=>{
 const items=validateDraft(JSON.stringify({memories:[{summary:'已有事实',sources:[200,210]}]}),[{floor:200,role:'assistant',text:'已有事实'}],{...DEFAULTS,allowSourceMismatch:true});
 assert.deepEqual(items[0].sources,[200]);assert.deepEqual(items[0].claimedSources,[200,210]);assert.equal(items[0].sourceVerified,false);assert.ok(items[0].validationWarnings.length);
});
test('worldbook entries respect disabled flags and select charLore using avatar with suffix',async()=>{
 const c={characterId:0,characters:[{name:'Name',avatar:'role.png'}]};
 const r=await readWorldBooks(c,{world_info:{charLore:[{name:'role.png',extraBooks:['Book']}]},loadWorldInfo:async()=>({entries:[{content:'保留正文',enabled:true},{content:'关闭正文',enabled:false}]})},['Book']);
 assert.equal(r.books[0].entries.length,1);assert.equal(r.books[0].entries[0].text,'保留正文');
});
