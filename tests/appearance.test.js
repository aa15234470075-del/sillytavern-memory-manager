import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAppearance,appearanceCss} from '../appearance.js';

test('appearance controls clamp imported values and reject CSS-bearing color values',()=>{
 const v=normalizeAppearance({fontSize:999,levels:{1:{size:-5,background:'red;}body{display:none}',fill:'invalid',align:'invalid'}}});
 assert.equal(v.fontSize,24);assert.equal(v.levels[1].size,10);assert.equal(v.levels[1].fill,'theme');
 assert.doesNotMatch(appearanceCss(v),/display:none/);assert.equal(v.levels[1].background,'#426b91');
 assert.match(appearanceCss({levels:{1:{size:22,fill:'outline',colors:true,text:'#123456'}}}),/--smm-nav-min-width:77px/);
 assert.match(appearanceCss({levels:{1:{colors:true,text:'#123456'}}}),/color:#123456/);
});
