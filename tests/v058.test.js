import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorldBooks} from '../runtime.js';
import {filterText,DEFAULTS} from '../core.js';
import {defaultProfileOptions} from '../default-settings.js';
import {requestBreakdown} from '../request-view.js';
import {updatePlugin} from '../updater.js';

test('bound primary and additional books load full enabled content, deduplicate and fail visibly',async()=>{
 const c={characterId:0,characters:[{avatar:'test.png',data:{extensions:{world:'Primary'}}}]};const requested=[];
 const mod={world_info:{charLore:[{name:'test',extraBooks:['Extra','Primary']}]},loadWorldInfo:async name=>{requested.push(name);return {entries:{0:{uid:0,content:'完整世界书内容',key:['线索']},1:{uid:1,disable:true,content:'禁用内容'}}};}};
 const result=await readWorldBooks(c,mod,['Primary','Extra','Primary']);assert.deepEqual(result.names,['Primary','Extra']);assert.deepEqual(requested,['Primary','Extra']);assert.equal(result.books[0].entries[0].text,'完整世界书内容');assert.equal(result.books[0].entries.length,1);
 await assert.rejects(readWorldBooks(c,mod,['Unbound']),/不属于/);await assert.rejects(readWorldBooks(c,{...mod,loadWorldInfo:async()=>null},['Primary']),/无法读取/);
});
test('empty world material is zero characters, wrapped request totals remain exact',()=>{
 const messages=[{role:'system',content:'规则'},{role:'user',content:JSON.stringify({sources:[],reference:{worldBooks:[],character:null,memories:[]}})}];
 const b=requestBreakdown(messages);assert.equal(b.counts.世界书,0);assert.equal(b.counts.其他旧记忆,0);assert.equal(Object.values(b.counts).reduce((a,b)=>a+b,0),b.total);
});
test('new blacklist choices preserve story and defaults retain only four floors',()=>{
 assert.equal(defaultProfileOptions().keepRecent,4);assert.equal(DEFAULTS.excludeTags,'think,thinking,details,summary');
 const s={...DEFAULTS,excludeTags:DEFAULTS.excludeTags+',bbi_image,image,###'};
 assert.equal(filterText('<CONTENT>###正文<image>图片提示</image><bbi_image>图片提示2</bbi_image>继续</CONTENT>',s).text,'正文继续');
 assert.equal(filterText('<CONTENT>###正文</CONTENT>',DEFAULTS).text,'###正文');
});
test('updater uses exact extension folder, detected installation scope and propagates failure',async()=>{
 let request;const opts={moduleUrl:'https://example.test/scripts/extensions/third-party/st-memory-manager/updater.js',extensionTypes:{'third-party/st-memory-manager':'global'},fetcher:async(url,options)=>{request={url,...options};return {ok:true,json:async()=>({isUpToDate:true,shortCommitHash:'abcdef0'})};}};
 assert.equal((await updatePlugin({'X-CSRF-Token':'test-only'},opts)).isUpToDate,true);assert.equal(request.url,'/api/extensions/update');assert.deepEqual(JSON.parse(request.body),{extensionName:'st-memory-manager',global:true});
 await assert.rejects(updatePlugin({}, {...opts,fetcher:async()=>({ok:false,status:403})}),/403/);
 await assert.rejects(updatePlugin({}, {...opts,extensionTypes:{}}),/安装类型/);
});
