import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,eligibleRange,newStore,validateDraft} from '../core.js';
import {automaticStart,coveredFloors,countInstruction} from '../session-state.js';
import {defaultProfileOptions} from '../default-settings.js';
test('user dictated defaults contain no connection data and retain explicit review',()=>{
 const d=defaultProfileOptions();assert.equal(d.autoSummary,true);assert.equal(d.autoApprove,false);assert.equal(d.check,true);assert.equal(d.autoSecondary,true);assert.equal(d.autoTertiary,true);assert.equal(d.secondaryCount,5);assert.equal(d.tertiaryCount,4);assert.equal(d.promptVariant,'extended');assert.equal(d.themePreset,'tavern');assert.equal(d.modes.quotes,'off');for(const k of ['time','place','promises','unresolved'])assert.equal(d.modes[k],'separate');for(const k of ['baseUrl','model','repairModel','startFloor','autoStartFloor'])assert.ok(!(k in d));assert.equal(d.timeout,300);assert.equal(d.retries,0);
 const result=validateDraft(JSON.stringify({memories:[{summary:'持有铜印',sources:[1],details:{quotes:['持有铜印']}}]}),[{floor:1,role:'assistant',text:'持有铜印'}],DEFAULTS);assert.deepEqual(result[0].quoteChecks,[]);
});
test('automatic cursor follows approved selected ranges despite old unreadable holes',()=>{
 const st=newStore();st.batches=[{approved:true,level:1,floors:[1,2,4],selectedFloors:[0,1,2,3,4]}];assert.equal(automaticStart(st,0),5);assert.deepEqual(coveredFloors(st),[1,2,4]);st.ignoredFloors=[0,3];assert.deepEqual([...coveredFloors(st)].sort((a,b)=>a-b),[0,1,2,3,4]);assert.equal(eligibleRange(Array(15).fill({}),st,{...DEFAULTS,keepRecent:0},automaticStart(st,0),10).start,5);assert.match(countInstruction('time',1),/不编造日期/);
});
