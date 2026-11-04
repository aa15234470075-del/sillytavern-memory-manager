import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingHideFloors} from '../memory-tools.js';
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const batch=(a,b,extra={})=>({approved:true,level:1,floors:range(a,b),...extra});
test('later saves catch earlier retained tails while keeping latest five and tolerating repeated saves',()=>{
 const batches=[batch(0,10),batch(11,20,{hideAfter:true})];
 assert.deepEqual(pendingHideFloors([batches[0]],range(0,10),5),range(0,5));
 const hidden=new Set(range(0,5));const next=pendingHideFloors(batches,range(11,20),5).filter(f=>!hidden.has(f));
 assert.deepEqual(next,range(6,15));next.forEach(f=>hidden.add(f));assert.deepEqual(pendingHideFloors(batches,range(11,20),5).filter(f=>!hidden.has(f)),[]);
 assert.deepEqual(pendingHideFloors([...batches,batch(21,30)],range(21,30),5),range(0,25));
});
test('catchup excludes declined hiding, unsaved batches, ignored holes and future ranges',()=>{
 const batches=[batch(0,4,{hideAfter:false}),batch(5,9,{approved:false}),batch(10,14,{level:2}),batch(15,19,{hideAfter:true}),batch(40,50)];
 assert.deepEqual(pendingHideFloors(batches,range(20,29),5),range(15,24));
 assert.deepEqual(pendingHideFloors([batch(0,9)],[],5),[]);
 assert.deepEqual(pendingHideFloors([batch(0,9)],range(10,11),5),range(0,6));
 assert.deepEqual(pendingHideFloors([batch(0,9)],range(10,11),0),range(0,11));
});
