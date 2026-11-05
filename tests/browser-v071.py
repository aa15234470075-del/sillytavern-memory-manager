# Isolated browser regression: all chat content and network responses below are synthetic fixtures.
# Run with Python Playwright and Microsoft Edge installed. No real account/API is contacted.
import json,threading,http.server,functools
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
(root/'output').mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:'+str(server.server_port)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless=True)
 results=[]
 for width in [390,1280]:
  page=browser.new_page(viewport={'width':width,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:d.accept());page.goto(url+'/package.json')
  page.evaluate("""()=>{document.body.innerHTML='<div id="extensionsMenu"></div>';const l=document.createElement('link');l.rel='stylesheet';l.href='/style.css';document.head.append(l);const ns='st_memory_manager';const c={chat:Array.from({length:30},(_,i)=>({name:i%2?'Role':'User',is_user:i%2===0,mes:i%2?'<CONTENT>真实原话。阿宁持有铜印。':'你好'})),chatId:'flow-test',characterId:0,characters:[{name:'Mock',avatar:'mock.png',data:{extensions:{world:'Test Book'}}}],name2:'Mock',chatMetadata:{[ns]:{schema:1,memories:[],batches:[],hidden:[],recall:{},revision:0,options:{baseUrl:'bad-old',filterVersion:1,batchSize:0}}},extensionSettings:{[ns]:{baseUrl:'https://old.invalid',customCss:'bad-old-css',attics:{'mock.png':{memories:[]}}}},eventTypes:{CHAT_CHANGED:'CHAT_CHANGED',MESSAGE_RECEIVED:'received',GENERATION_AFTER_COMMANDS:'inject',CHAT_COMPLETION_PROMPT_READY:'ready'},eventSource:{on:(name,fn)=>{window.handlers[name]=fn}},getRequestHeaders:()=>({'Content-Type':'application/json'}),saveMetadata:async()=>{window.savedStore=structuredClone(c.chatMetadata)},saveSettingsDebounced:()=>{},setExtensionPrompt:(_id,text)=>window.injected=text};window.handlers={};window.SillyTavern={getContext:()=>c};}""")
  page.route('**/script.js',lambda r:r.fulfill(content_type='text/javascript',body='export function isGenerating(){return false}'))
  page.route('**/scripts/world-info.js',lambda r:r.fulfill(content_type='text/javascript',body='export const world_info={};export async function loadWorldInfo(){return {entries:{0:{uid:0,content:"WORLD_EVIDENCE 有效世界书内容",key:["铜印"],disable:false}}}}'))
  page.route('**/scripts/chats.js',lambda r:r.fulfill(content_type='text/javascript',body='export async function hideChatMessageRange(start,end){for(let i=start;i<=end;i++)window.SillyTavern.getContext().chat[i].is_system=true}'))
  page.route('**/api/chats/get',lambda r:r.fulfill(json=[{'chat_metadata':page.evaluate('window.savedStore')}]))
  behavior={'drift':False,'fail':False,'multi':False};repair_calls=[];calls={'summary':0,'check':0};check_sizes=[];held=[];hold={'value':False}
  def generate(route):
   data=route.request.post_data_json;payload=json.loads(data['messages'][-1]['content'])
   if 'items' in payload:
    content=json.dumps({'items':[{'id':m['id'],'keywords':['铜印','阿宁']} for m in payload['items']]},ensure_ascii=False)
   elif 'originalResponse' in payload:
    repair_calls.append(data);content=json.dumps({'memories':[{'summary':'修复后的有效记忆','sources':list(range(10))}]},ensure_ascii=False)
   elif 'draft' in payload:
    calls['check']+=1;check_sizes.append(len(payload['draft']));content=json.dumps({'issues':[{'id':payload['draft'][0]['id'],'message':'核对时间','suggestion':'不要推断日期','quote':'阿宁持有铜印','field':'summary'}]},ensure_ascii=False)
   else:
    calls['summary']+=1;floors=[s['floor'] for s in payload['sources']];content=json.dumps({'memories':[{'title':'测试记忆'+str(calls['summary']),'summary':'阿宁持有铜印，等待赴约。','sources':floors,'brief':'等待赴约','keywords':['铜印','赴约'],'suggestedKind':'long','details':{'quotes':['真实原话。']}}]},ensure_ascii=False)
   if behavior['multi'] and 'sources' in payload and payload['sources'][0]['role']!='memory':
    parsed=json.loads(content);parsed['memories'].extend([{**parsed['memories'][0],'title':'额外测试记忆'+str(i)} for i in range(4)]);content=json.dumps(parsed,ensure_ascii=False)
   if behavior['fail'] and 'sources' in payload:
    route.abort('failed');return
   if behavior['drift'] and 'sources' in payload:content='# 角色卡\n普通 Markdown 角色信息，不是所选输出格式'
   response={'choices':[{'message':{'content':content},'finish_reason':'stop'}]};held.append((route,response)) if hold['value'] or calls['summary']>=hold.get('after',100000) else route.fulfill(json=response)
  page.route('**/api/backends/chat-completions/generate',generate)
  page.route('**/api/backends/chat-completions/status',lambda r:r.fulfill(json={'data':[{'id':'mock-model'}]}))
  page.evaluate("import('/index.js')");page.locator('#smm-entry').click()
  page.wait_for_timeout(650)
  if page.locator('[data-choice=later]').count():page.locator('[data-choice=later]').click()
  def drawers():page.evaluate("document.querySelectorAll('#smm-panel details').forEach(d=>d.open=true)")
  page.get_by_role('button',name='设置',exact=True).click();drawers()
  assert page.locator('[data-action=configuration-clean]').count()==0
  assert page.locator('#smm-entry .fa-layer-group').count()==1
  assert page.locator('[data-setting=autoSummary]').is_checked()
  assert page.locator('[data-setting=check]').is_checked()
  assert page.locator('[data-setting=promptVariant]').input_value()=='extended'
  assert page.locator('[data-setting=themePreset]').input_value()=='tavern'
  assert page.locator('[data-mode=quotes]').input_value()=='off'
  # Built-in archive restores requested options without touching API credentials.
  page.locator('[data-setting=baseUrl]').fill('https://example.invalid/v1');page.locator('[data-setting=model]').fill('mock-model');page.locator('#smm-key').fill('fake-test-only')
  page.get_by_role('button',name='保存设置',exact=True).click();drawers()
  page.locator('#smm-profiles').select_option('smm-builtin-default-v057');page.wait_for_function('document.querySelector("#smm-profiles").value==="smm-builtin-default-v057"');drawers()
  assert page.locator('[data-setting=baseUrl]').input_value()=='https://example.invalid/v1'
  assert page.locator('#smm-key').input_value()=='fake-test-only'
  page.locator('[data-setting=autoSummary]').uncheck();page.locator('[data-setting=autoSecondary]').uncheck();page.locator('[data-setting=autoTertiary]').uncheck();page.locator('[data-setting=check]').uncheck();page.locator('[data-setting=autoHide]').uncheck()
  page.get_by_role('button',name='保存设置',exact=True).click()
  # Tutorial groups settings first, remains centered, and never calls a model.
  page.locator('header [data-action=tour]').click();page.locator('#smm-tour h3').wait_for();before=calls.copy()
  for step in range(1,14):
   page.wait_for_function('(n)=>document.querySelector("#smm-tour h3")?.textContent.startsWith(n+"/13")',arg=step)
   rect=page.locator('#smm-tour').bounding_box();assert abs(rect['y']+rect['height']/2-450)<3,rect
   if step<=6:assert page.locator('[data-setting=baseUrl]').count()==1
   if step==7:assert page.locator('#smm-start').count()==1
   page.locator('#smm-tour').get_by_role('button',name='完成' if step==13 else '下一步',exact=True).click()
  assert calls==before
  # Drag stays in place across steps; new tour centers again.
  page.locator('header [data-action=tour]').click();page.locator('#smm-tour h3').wait_for()
  rect=page.locator('#smm-tour').bounding_box();handle=page.locator('#smm-tour header').bounding_box()
  page.mouse.move(handle['x']+40,handle['y']+10);page.mouse.down();page.mouse.move(handle['x']+65,handle['y']+45);page.mouse.up()
  moved=page.locator('#smm-tour').bounding_box();assert abs(moved['y']-rect['y'])>10,(rect,moved)
  page.locator('#smm-tour').get_by_role('button',name='下一步',exact=True).click()
  assert abs(page.locator('#smm-tour').bounding_box()['y']-moved['y'])<3
  page.locator('#smm-tour').get_by_role('button',name='跳过',exact=True).click()
  # World books persist through unrelated settings save, request contains actual entries.
  page.route('**/scripts/world-info.js',lambda r:r.fulfill(content_type='text/javascript',body='export const world_info={};export async function loadWorldInfo(){return {entries:{0:{uid:0,content:"WORLD_EVIDENCE 有效世界书内容",key:["铜印"],disable:false}}}}'))
  # Force fresh world module: imported earlier only if references were generated.
  page.evaluate('window.SillyTavern.getContext().characters[0].data={extensions:{world:"Test Book"}}')
  page.get_by_role('button',name='总结',exact=True).click();drawers();page.locator('[data-action=books]').click();page.locator('[data-book="Test Book"]').check()
  page.get_by_role('button',name='设置',exact=True).click();drawers();page.locator('[data-action=settings-save]').click()
  assert page.evaluate('window.SillyTavern.getContext().extensionSettings.st_memory_manager.booksByCharacter["mock.png"]')==['Test Book']
  assert page.locator('.smm-settings-profiles').evaluate('(e)=>e.previousElementSibling.classList.contains("smm-plugin-control")')
  assert page.locator('.smm-migration-notice').count()==0
  assert page.locator('[data-setting=excludeTags]').input_value()=='think,thinking,details,summary'
  for tag in ['bbi_image','image','###']:assert page.locator('[data-tag-preset=excludeTags][data-tag="'+tag+'"]').count()==1
  page.locator('[data-setting=themePreset]').select_option('paper')
  assert page.locator('[data-action=settings-open]').evaluate('(e)=>getComputedStyle(e).borderTopStyle')=='solid'
  assert page.locator('[data-setting=themePreset]').evaluate('(e)=>getComputedStyle(e).color')=='rgb(51, 47, 43)'
  page.get_by_role('button',name='总结',exact=True).click();drawers();page.locator('[data-action=usage-preview]').click()
  page.wait_for_function('document.querySelector("#smm-request-usage").innerText.includes("合计")')
  page.locator('#smm-prompt-preview details').evaluate_all('(ds)=>ds.forEach(d=>d.open=true)');page.wait_for_function('document.querySelector("#smm-prompt-preview").textContent.includes("WORLD_EVIDENCE")')
  assert 'WORLD_EVIDENCE' in page.locator('#smm-prompt-preview').text_content(), page.locator('#smm-prompt-preview').text_content()
  assert '世界书0 字符' not in page.locator('#smm-request-usage').inner_text()
  # Two batches generate without saving the first. Both survive a chat reload.
  page.get_by_role('button',name='总结',exact=True).click();drawers();page.locator('#smm-batch-start').fill('0');page.locator('#smm-batch-end').fill('9');page.locator('[data-setting=batchSize]').fill('5');page.locator('[data-setting=batchClassification]').select_option('manual');page.locator('#smm-batch-hide').uncheck()
  page.get_by_role('button',name='开始批量总结',exact=True).click()
  page.locator('[data-action=approve-all]').wait_for();page.wait_for_function('document.querySelector("#smm-floating-progress")?.hidden===true')
  assert calls['summary']==2,calls
  assert page.evaluate('window.SillyTavern.getContext().chatMetadata.st_memory_manager.memories.length')==0
  assert page.locator('.smm-batch-report').count()==0
  assert '2份' in page.locator('#smm-panel .smm-body').inner_text()
  captured=page.evaluate('({metadata:window.SillyTavern.getContext().chatMetadata,settings:window.SillyTavern.getContext().extensionSettings})');page.reload()
  page.evaluate("""()=>{document.body.innerHTML='<div id="extensionsMenu"></div>';const l=document.createElement('link');l.rel='stylesheet';l.href='/style.css';document.head.append(l);const ns='st_memory_manager';const c={chat:Array.from({length:30},(_,i)=>({name:i%2?'Role':'User',is_user:i%2===0,mes:i%2?'<CONTENT>真实原话。阿宁持有铜印。':'你好'})),chatId:'flow-test',characterId:0,characters:[{name:'Mock',avatar:'mock.png',data:{extensions:{world:'Test Book'}}}],name2:'Mock',chatMetadata:{[ns]:{schema:1,memories:[],batches:[],hidden:[],recall:{},revision:0,options:{baseUrl:'bad-old',filterVersion:1,batchSize:0}}},extensionSettings:{[ns]:{baseUrl:'https://old.invalid',customCss:'bad-old-css',attics:{'mock.png':{memories:[]}}}},eventTypes:{CHAT_CHANGED:'CHAT_CHANGED',MESSAGE_RECEIVED:'received',GENERATION_AFTER_COMMANDS:'inject',CHAT_COMPLETION_PROMPT_READY:'ready'},eventSource:{on:(name,fn)=>{window.handlers[name]=fn}},getRequestHeaders:()=>({'Content-Type':'application/json'}),saveMetadata:async()=>{window.savedStore=structuredClone(c.chatMetadata)},saveSettingsDebounced:()=>{},setExtensionPrompt:(_id,text)=>window.injected=text};window.handlers={};window.SillyTavern={getContext:()=>c};}""")
  page.evaluate('(saved)=>{const c=window.SillyTavern.getContext();c.chatMetadata=saved.metadata;c.extensionSettings=saved.settings}',captured)
  page.evaluate("import('/index.js')");page.locator('#smm-entry').click();page.get_by_role('button',name='待确认',exact=True).click();page.locator('[data-action=approve-all]').wait_for()
  # Confirm stays pinned while the memory body scrolls.
  for pos in [0,99999]:
   page.locator('#smm-panel .smm-body').evaluate('(e,n)=>e.scrollTop=n',pos)
   b=page.locator('.smm-save [data-action=approve]').bounding_box();r=page.locator('#smm-panel').bounding_box();assert b['y']+b['height']<=r['y']+r['height'] and b['y']>=r['y']
  page.locator('[data-action=pending-select]').click();page.locator('[data-action=approve-all]').click()
  page.wait_for_function('window.SillyTavern.getContext().chatMetadata.st_memory_manager.memories.length===2')
  page.wait_for_function('!document.querySelector("[data-action=approve-all]")')
  assert page.locator('#smm-floating-progress').is_hidden()
  page.get_by_role('button',name='总结',exact=True).click();assert page.locator('#smm-start').input_value()=='10';assert page.locator('#smm-batch-start').input_value()=='10';assert '第10-' in page.locator('#smm-auto-status').text_content()
  # Legacy stale automatic cursor ignores old holes; ignore merges the progress ranges.
  page.evaluate("""()=>{const s=window.SillyTavern.getContext().chatMetadata.st_memory_manager;s.batches=[{level:1,approved:true,floors:[1,2,3,4,6,7,8,9],selectedFloors:[0,1,2,3,4,5,6,7,8,9],ids:[]}];s.options.autoStartFloor=0;window.handlers.CHAT_CHANGED();}""")
  page.get_by_role('button',name='总结',exact=True).click();assert '第10-' in page.locator('#smm-auto-status').text_content()
  page.locator('[data-action=ignore-floors]').click();assert page.locator('dialog textarea').input_value()=='0,5';page.locator('dialog').get_by_role('button',name='确定',exact=True).click();page.locator('[data-action=ignore-reset]').wait_for()
  assert page.evaluate('JSON.stringify(window.SillyTavern.getContext().chatMetadata.st_memory_manager.ignoredFloors)')=='[0,5]'
  assert '已保存总结：第0-9楼' in page.locator('.smm-progress-board').first.inner_text()
  assert page.evaluate('window.SillyTavern.getContext().chat.filter(m=>m.is_system).length')==0
  page.locator('[data-action=ignore-reset]').click();page.wait_for_function('!document.querySelector("[data-action=ignore-reset]")')
  page.locator('[data-count-mode]').select_option('time');assert page.locator('[data-count-mode]').input_value()=='time'
  # Failed batch pauses; retry continues all remaining batches into independent drafts.
  drawers();page.locator('#smm-batch-start').fill('10');page.locator('#smm-batch-end').fill('19');page.locator('[data-setting=batchSize]').fill('5');behavior['fail']=True
  before=calls['summary'];page.get_by_role('button',name='开始批量总结',exact=True).click();page.get_by_role('button',name='重试失败批',exact=True).wait_for();assert calls['summary']==before+1
  behavior['fail']=False;page.get_by_role('button',name='重试失败批',exact=True).click();page.locator('[data-action=approve-all]').wait_for();assert calls['summary']==before+3
  assert page.locator('#smm-floating-progress').is_hidden()
  page.locator('[data-action=approve-all]').click();page.wait_for_function('window.SillyTavern.getContext().chatMetadata.st_memory_manager.memories.length===4')
  # Save batch one while the second model response is still in flight.
  page.get_by_role('button',name='总结',exact=True).click();drawers();page.locator('#smm-batch-start').fill('20');page.locator('#smm-batch-end').fill('29');page.locator('[data-setting=batchSize]').fill('5');hold['after']=calls['summary']+2
  page.get_by_role('button',name='开始批量总结',exact=True).click()
  for _ in range(100):
   if held:break
   page.wait_for_timeout(50)
  assert len(held)==1
  page.locator('.smm-save [data-action=approve]').click();page.wait_for_function('window.SillyTavern.getContext().chatMetadata.st_memory_manager.memories.length===5')
  del hold['after'];route,response=held.pop();route.fulfill(json=response)
  page.locator('.smm-save [data-action=approve]').wait_for();page.wait_for_function('document.querySelector("#smm-floating-progress")?.hidden===true');page.locator('.smm-save [data-action=approve]').click();page.wait_for_function('window.SillyTavern.getContext().chatMetadata.st_memory_manager.memories.length===6')
  page.get_by_role('button',name='设置',exact=True).click();drawers();page.locator('[data-setting=fontPreset]').select_option('tavern');page.locator('[data-setting=themePreset]').select_option('tavern')
  assert page.locator('#smm-panel').evaluate('e=>!getComputedStyle(e).backgroundColor.includes("rgba")')
  # Feature UI verification on the same fully exercised isolated chat.
  assert page.locator('[data-setting=outputTokens]').count()==1
  assert page.locator('[data-setting=earlyDraft]').is_checked()==False
  page.locator('[data-setting=outputTokens]').fill('2048');page.locator('[data-setting=earlyDraft]').check();page.locator('[data-setting=check]').check()
  page.locator('[data-setting=autoSummary]').uncheck();page.locator('[data-setting=autoSecondary]').uncheck();page.locator('[data-setting=autoTertiary]').uncheck()
  page.locator('[data-action=settings-save]').click()
  page.locator('[data-tab=memories]').click();page.locator('[data-source-sort]').select_option('desc')
  page.locator('[data-action=rehearsal]').click();page.locator('.smm-rehearsal [data-start]').fill('1');page.locator('.smm-rehearsal [data-end]').fill('3');page.locator('.smm-rehearsal [data-run]').click()
  assert '最终记忆文本' in page.locator('.smm-rehearsal [data-results]').inner_text();page.locator('.smm-rehearsal [data-close]').click()
  page.evaluate('(()=>{const ms=window.SillyTavern.getContext().chatMetadata.st_memory_manager.memories;if(!ms.some(m=>m.kind==="long")&&ms.length)ms[0].kind="long"})()');page.locator('[data-action=keyword-health]').click();assert page.locator('.smm-keywords [data-health]').count()>0;page.locator('.smm-keywords [data-generate]').click();page.locator('.smm-keywords > footer [data-cancel]').click()
  page.locator('[data-tab=summary]').click();drawers();page.locator('#smm-start').fill('0');page.locator('#smm-end').fill('3');hold['value']=True
  page.locator('[data-action=summarize]').click()
  for _ in range(100):
   if held:break
   page.wait_for_timeout(30)
  route,response=held.pop();assert route.request.post_data_json['max_tokens']==2048;route.fulfill(json=response)
  for _ in range(100):
   if held:break
   page.wait_for_timeout(30)
  assert page.locator('[data-tab=draft]').get_attribute('class')=='active'
  assert page.locator('.smm-save [data-action=approve]').is_disabled()
  assert '检查中' in page.locator('.smm-save-preview').inner_text()
  route,response=held.pop();route.fulfill(json=response);hold['value']=False
  page.wait_for_function('document.querySelector(".smm-save [data-action=approve]")?.disabled===false')
  assert page.locator('.smm-review-mark').count()>0
  assert '本次保存' in page.locator('.smm-save-preview').inner_text()
  page.locator('[data-action=regenerate]').click();page.locator('[data-choice=review]').click()
  page.wait_for_function('!!document.querySelector("[data-action=version-select]")')
  assert '草稿差异对照' not in page.locator('.smm-body').inner_text()
  # Early preview also queues batch drafts exactly once and never stalls for save.
  page.locator('[data-action=discard]').click()
  page.locator('[data-tab=summary]').click();drawers();page.locator('#smm-batch-start').fill('0');page.locator('#smm-batch-end').fill('9');page.locator('[data-setting=batchSize]').fill('5');page.locator('[data-setting=batchClassification]').select_option('manual');page.locator('#smm-batch-hide').uncheck()
  hold['value']=True;page.locator('[data-action=batch-start]').click()
  for i in range(4):
   for _ in range(100):
    if held:break
    page.wait_for_timeout(30)
   assert len(held)==1,(i,len(held))
   if i==1:assert page.locator('.smm-save [data-action=approve]').is_disabled()
   route,response=held.pop();route.fulfill(json=response)
  hold['value']=False
  page.wait_for_function('document.querySelector("#smm-floating-progress")?.hidden===true')
  assert page.locator('[data-action=pending-select]').count()==1
  assert page.locator('.smm-save [data-action=approve]').is_enabled()
  page.locator('[data-tab=memories]').click();assert page.locator('[data-source-sort]').input_value()=='desc'
  # Clean pending drafts, then exercise deletion through actual checkbox/action/save path.
  page.evaluate("""()=>{const c=window.SillyTavern.getContext(),s=c.chatMetadata.st_memory_manager;localStorage.removeItem('st_memory_manager:session:character:mock.png::flow-test');const opts={...s.options,autoSummary:false,autoSecondary:false,autoTertiary:false,check:false,earlyDraft:false,autoHide:false,startFloor:26,autoStartFloor:26};s.options=opts;s.memories=[{id:'first',title:'前段',summary:'先前事实',details:{},keywords:[],sources:Array.from({length:20},(_,i)=>i),kind:'short',status:'active',level:1},{id:'last',title:'删除测试20-25',summary:'末段事实',details:{},keywords:[],sources:[20,21,22,23,24,25],kind:'short',status:'active',level:1}];s.batches=[{level:1,approved:true,floors:s.memories[0].sources,ids:['first']},{level:1,approved:true,floors:s.memories[1].sources,ids:['last']}];c.extensionSettings.st_memory_manager.autoSecondary=false;c.extensionSettings.st_memory_manager.autoTertiary=false;window.handlers.CHAT_CHANGED();}""")
  page.locator('[data-tab=memories]').click();drawers();page.locator('[data-pick=last]').check();page.locator('[data-action=memory-delete]').click()
  page.wait_for_function('window.SillyTavern.getContext().chatMetadata.st_memory_manager.memories.length===1')
  page.locator('[data-tab=summary]').click();drawers()
  assert page.locator('#smm-start').input_value()=='20'
  assert page.locator('#smm-batch-start').input_value()=='20'
  assert '第20-' in page.locator('#smm-auto-status').text_content()
  page.evaluate('window.handlers.CHAT_CHANGED()');page.locator('[data-tab=summary]').click();drawers()
  assert page.locator('#smm-start').input_value()=='20'
  # Inactive count never blocks generation; switching back restores the explicit field.
  page.locator('[data-count-mode]').select_option('events')
  assert page.locator('[data-count-value]').is_hidden() and page.locator('[data-count-value]').is_disabled()
  page.locator('[data-count-mode]').select_option('count');assert page.locator('[data-count-value]').is_visible()
  page.locator('[data-count-value]').fill('5');page.locator('[data-count-mode]').select_option('events')
  # One batch creates five entries; saving it triggers consolidation despite another pending batch.
  page.evaluate("""()=>{const s=window.SillyTavern.getContext().chatMetadata.st_memory_manager;localStorage.removeItem('st_memory_manager:session:character:mock.png::flow-test');s.memories=[];s.batches=[];Object.assign(s.options,{startFloor:0,autoStartFloor:0,autoSecondary:true,secondaryCount:5,autoTertiary:false,autoSummary:false,check:false});window.handlers.CHAT_CHANGED();}""")
  page.locator('[data-tab=summary]').click();drawers();page.locator('#smm-batch-start').fill('0');page.locator('#smm-batch-end').fill('9');page.locator('[data-setting=batchSize]').fill('5');page.locator('[data-setting=batchClassification]').select_option('manual');page.locator('#smm-batch-hide').uncheck()
  behavior['multi']=True;before_summary=calls['summary'];before_check=calls['check']
  page.locator('[data-action=batch-start]').click();page.locator('[data-action=approve-all]').wait_for();page.wait_for_function('document.querySelector("#smm-floating-progress")?.hidden===true')
  assert calls['summary']==before_summary+2
  page.locator('.smm-save [data-action=approve]').click()
  page.wait_for_function('window.SillyTavern.getContext().chatMetadata.st_memory_manager.memories.length===5')
  page.wait_for_function('document.querySelector("#smm-panel .smm-body")?.textContent.includes("二次总结") && !!document.querySelector("[data-action=pending-select]")')
  for _ in range(100):
   if calls['summary']>=before_summary+3:break
   page.wait_for_timeout(20)
  page.wait_for_function('document.querySelector("#smm-floating-progress")?.hidden===true')
  page.wait_for_timeout(200)
  assert calls['summary']==before_summary+3,(calls,before_summary)
  assert calls['check']==before_check
  assert page.locator('[data-action=pending-select]').count()==1
  behavior['multi']=False
  # Local keywords produce visible candidates without calling any API.
  page.locator('[data-tab=memories]').click();drawers();before_api=calls.copy()
  page.evaluate('(()=>{const ms=window.SillyTavern.getContext().chatMetadata.st_memory_manager.memories;if(!ms.some(m=>m.kind==="long")&&ms.length)ms[0].kind="long"})()');page.locator('[data-action=keyword-health]').click();page.locator('.smm-keywords [data-generate]').click()
  page.wait_for_function('document.querySelector(".smm-keywords [role=alert]")?.textContent.includes("已补候选")')
  assert page.locator('.smm-keywords textarea').first.input_value()
  assert calls==before_api
  # Hold the keyword response to verify top-layer visibility and interactive cancel control.
  page.locator('.smm-keywords [data-method]').select_option('api');hold['value']=True
  page.locator('.smm-keywords [data-generate]').click()
  for _ in range(100):
   if held:break
   page.wait_for_timeout(20)
  assert len(held)==1
  assert page.locator('#smm-floating-progress').evaluate('(e)=>e.matches(":popover-open") && e.parentElement.matches(".smm-keywords")')
  assert page.locator('#smm-floating-progress [data-cancel]').evaluate('(e)=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e}')
  route,response=held.pop();route.fulfill(json=response);hold['value']=False
  page.locator('.smm-keywords > footer [data-cancel]').click()
  page.evaluate('window.SillyTavern.getContext().chatMetadata.st_memory_manager.memories.forEach(m=>m.kind="short")')
  page.locator('[data-action=rehearsal]').click();page.locator('.smm-rehearsal [data-run]').click()
  assert page.locator('.smm-rehearsal [data-order]').count()==0
  text=page.locator('.smm-rehearsal [data-results]').inner_text()
  assert all(k in text for k in ['短期记忆','长期记忆','固定记忆','首次总结'])
  page.locator('.smm-rehearsal-body').evaluate('(e)=>e.scrollTop=e.scrollHeight')
  assert page.locator('.smm-rehearsal [data-close]').is_visible()
  page.locator('.smm-rehearsal [data-close]').click()
  # Verify actual toast timer selection through UI actions.
  page.evaluate("""()=>{const original=window.setTimeout;window.toastTimers=new Map();window.setTimeout=(f,ms,...args)=>{const id=original(f,ms,...args);window.toastTimers.set(id,ms);return id;}}""")
  page.locator('[data-tab=summary]').click();drawers();page.locator('[data-action=summary-refresh]').click()
  assert page.evaluate('window.toastTimers.get(document.getElementById("st_memory_manager-toast").timer)')==3500
  page.locator('#smm-start').fill('-1');page.locator('[data-action=usage-preview]').click()
  assert page.evaluate('window.toastTimers.get(document.getElementById("st_memory_manager-toast").timer)')==5000
  # Closed task log entries contain no eager serialized source; opening reads only that entry.
  page.locator('[data-tab=logs]').click();page.locator('[data-log-body]').first.wait_for(state='attached')
  assert page.locator('[data-log-body]').first.text_content()=='展开后读取完整内容…'
  first=page.locator('[data-log-body]').first
  first.evaluate('(e)=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==="DETAILS")p.open=true}')
  page.wait_for_function('document.querySelector("[data-log-body]")?.dataset.loaded==="true"')
  page.screenshot(path=str(root/'output'/f'v071-regression-{width}.png'))
  assert errors==[],errors
  results.append({'width':width,'calls':calls,'defaults':True,'continuousBatches':True,'saveAll':True,'ignoreGaps':True,'autoCursor':True,'tourCenteredSettingsFirst':True,'fixedFooter':True})
  page.close()
 browser.close();(root/'output'/'v071-browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(results,ensure_ascii=False))
server.shutdown()
