const steps=[
 ['memories','[data-action=settings-open]','欢迎使用','右上角齿轮打开设置；横杠缩小，叉号只关闭面板。插件总开关在设置顶部。'],
 ['settings','[data-setting=baseUrl]','配置API连接','填写地址、密钥和模型。密钥默认保存在本浏览器；检查和格式修复可以独立配置。'],
 ['settings','[data-setting=sourceTag]','选择正文标签','白名单选择读取内容，黑名单排除思考等内容；可同时使用。'],
 ['summary','.smm-request-stats','选择本次资料','勾选资料后才会发送并计入字符数。原文是剧情依据，人设和世界书不能当成已发生事件。'],
 ['summary','#smm-start','选择楼层与条数','楼层从0开始。选择范围和记忆条数策略，先查看提取正文与最终提示词。保存成功后起点自动推进。'],
 ['settings','[data-setting=outputMode]','输出与检查','可以选择JSON、专用标签或简单分段。首版AI检查可选；按意见重写后不会自动再次检查。'],
 ['draft','.smm-body','确认草稿','勾选框在折叠标题旁。可重新生成、按自己的意见重写，或保存到短期、长期、固定记忆。未勾选分类时处理当前列表全部。'],
 ['organize','.smm-body','整理已有记忆','首次记忆可再次整理成二次，二次整理成三次。长期记忆靠关键词触发；缺失时可手动、脚本或API补齐。'],
 ['summary','.smm-summary-board','自动与批量总结','自动参数在设置页，状态在总结页。高楼层可预览分批；失败后暂停，允许重试或跳过。'],
 ['logs','.smm-log-switch','查看任务与记忆发送','任务记录查看范围、成功失败和请求阶段；记忆发送记录只显示插件选择的记忆。引导可在设置重新开启。']
];
export function startTour(navigate,finish){
 let index=0,el=document.createElement('section'),target;el.id='smm-tour';el.setAttribute('role','dialog');el.setAttribute('aria-label','新手引导');document.body.append(el);
 const show=async()=>{target?.classList.remove('smm-tour-target');const [tab,selector,title,text]=steps[index];await navigate(tab);target=document.querySelector('#smm-panel '+selector);for(let p=target;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;target?.classList.add('smm-tour-target');target?.scrollIntoView({block:'center'});
 el.replaceChildren();const titleEl=document.createElement('h3');titleEl.textContent=(index+1)+'/'+steps.length+' · '+title;const p=document.createElement('p');p.textContent=text;el.append(titleEl,p);
 for(const [label,fn] of [['跳过',close],['上一步',()=>{if(index>0){index--;void show();}}],[index===steps.length-1?'完成':'下一步',()=>{if(index===steps.length-1)close();else{index++;void show();}}]]){const b=document.createElement('button');b.textContent=label;b.onclick=fn;el.append(b);}
 };function close(){target?.classList.remove('smm-tour-target');el.remove();finish();}void show();return close;
}
