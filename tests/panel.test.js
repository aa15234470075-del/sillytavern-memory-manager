import test from 'node:test';
import assert from 'node:assert/strict';
import {panelBounds} from '../panel.js';

test('window dimensions stay usable and on screen in portrait, landscape and keyboard-sized viewports',()=>{
 for(const view of [{width:390,height:844},{width:844,height:390},{width:320,height:568},{width:390,height:260},{width:1280,height:900}]){
  for(const settings of [{},{width:55,height:55,auto:false},{width:100,height:100,auto:false}]){
   const r=panelBounds(view,settings,{left:-999,top:99999});
   assert.ok(r.height>100);assert.ok(r.width>200);
   assert.ok(r.left>=0&&r.top>=0);assert.ok(r.left+r.width<=view.width);assert.ok(r.top+r.height<=view.height);
  }
 }
 const view={width:390,height:844};assert.ok(panelBounds(view,{height:100}).height>panelBounds(view,{height:55}).height);
 assert.ok(panelBounds({width:1280,height:900},{width:100,auto:false}).width>880);
});
