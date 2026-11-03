const steps=[
 ['settings','[data-setting=pluginEnabled]','先认识设置','这里集中设置插件行为。总开关控制插件；横杠缩小、叉号只关闭面板，不关闭插件。下面先认识重要设置，再看总结流程。'],
 ['settings','[data-setting=baseUrl]','配置API连接','填写地址、密钥和模型。密钥默认保存在本浏览器；检查和格式修复可以独立配置。'],
 ['settings','[data-setting=sourceTag]','选择正文标签','白名单选择读取内容，黑名单排除思考等内容；可同时使用。'],
 ['settings','[data-setting=autoSummary]','自动总结与长期记忆','自动总结按新增消息数触发；自动二、三次整理按已保存份数触发。长期记忆靠关键词命中发送，短期记忆直接衔接当前剧情。'],
 ['settings','[data-setting=outputMode]','输出与检查','可以选择JSON、专用标签或简单分段。首版AI检查可选；按意见重写后不会自动再次检查。'],
 ['settings','[data-setting=promptVariant]','提示词与外观','三阶段提示词分别用于首次、二次、三次总结，默认使用加长版。外观支持跟随酒馆、不透明底色和实时美化预览。设置改完点击底部保存。'],
 ['summary','.smm-request-stats','从总结页开始','在这里选择发送哪些资料并查看字符数。原文是剧情依据，人设和世界书不能当成已发生事件。资料优先级按总结阶段区分。'],
 ['summary','#smm-start','选择总结方式','手动填写楼层范围；自动模式查看状态与控制；高楼层使用批量。可先预览原文和提示词，选择按事件或时间拆分。批量连续生成，草稿可以稍后一起确认。'],
 ['draft','.smm-body','核对并确认草稿','生成结果进入待确认。折叠标题旁可多选，重新生成可参考AI意见或自己的意见。底部确认保存始终可见；多批草稿分别保留，可切换或全部保存。'],
 ['organize','.smm-body','整理已有记忆','首次记忆可再次整理成二次，二次整理成三次。长期记忆靠关键词触发；缺失时可手动、脚本或API补齐。'],
 ['memories','.smm-body','查看已保存记忆','短期、长期、固定记忆分开放。折叠标题可选择、展开可编辑；长期缺关键词会提示补齐。记忆整理页可把首次结果整理为二次、二次整理为三次。'],
 ['logs','.smm-log-switch','查看任务与记忆发送','任务记录查看范围、成功失败和请求阶段；记忆发送记录只显示插件选择的记忆。引导可在设置重新开启。']
];
export function startTour(navigate,finish){
 let index=0,el=document.createElement('section'),target;el.id='smm-tour';el.setAttribute('role','dialog');el.setAttribute('aria-label','新手引导');document.body.append(el);
 const show=async()=>{target?.classList.remove('smm-tour-target');const [tab,selector,title,text]=steps[index];await navigate(tab);target=document.querySelector('#smm-panel '+selector);for(let p=target;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;target?.classList.add('smm-tour-target');target?.scrollIntoView({block:'center'});
 el.replaceChildren();const titleEl=document.createElement('h3');titleEl.textContent=(index+1)+'/'+steps.length+' · '+title;const p=document.createElement('p');p.textContent=text;el.append(titleEl,p);
 for(const [label,fn] of [['跳过',close],['上一步',()=>{if(index>0){index--;void show();}}],[index===steps.length-1?'完成':'下一步',()=>{if(index===steps.length-1)close();else{index++;void show();}}]]){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.append(b);}
 };function close(){target?.classList.remove('smm-tour-target');el.remove();finish();}void show();return close;
}
