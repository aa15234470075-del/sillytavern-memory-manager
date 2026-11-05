// Workflow rules are shared by UI, request assembly and automatic summary scheduling.
export function summaryLevelLabel(level){return ({0:'手动记忆',1:'首次总结',2:'二次总结',3:'三次总结'})[level]||'首次总结';}
export function summaryLengthRule(settings,temporary=''){
 const ranges={concise:'100–200',standard:'200–400',detailed:'400–600'};
 return `【高优先级：摘要篇幅】每条记忆的summary剧情摘要默认使用${ranges[settings.detail]||ranges.standard}个中文字符；独立栏目、来源编号和格式符号不计入摘要范围。此规则优先于内置提示词或事实提取细则里的泛泛详略描述。用户在本次补充要求、长期补充要求或启用的自定义预设中明确提出特殊篇幅或详略要求时，本条默认范围作废，改遵从用户要求。不得为凑字数编造事实，也不得截断原文输入。`;
}
export function automaticMerge(memories,batches,settings){
 for(const level of [2,3]){
  if(!settings[level===2?'autoSecondary':'autoTertiary'])continue;
  const count=Number(settings[level===2?'secondaryCount':'tertiaryCount']);if(!Number.isInteger(count)||count<2)continue;
  const eligible=memories.filter(m=>m.status==='active'&&(m.level??1)===level-1&&m.kind!=='fixed'&&!m.imported&&m.sources?.length);
  const ordered=eligible.map((m,i)=>({m,i})).sort((a,b)=>(a.m.created||0)-(b.m.created||0)||a.i-b.i).map(x=>x.m);
  if(ordered.length>=count)return {level,parents:ordered.slice(0,count)};
 }
 return null;
}
