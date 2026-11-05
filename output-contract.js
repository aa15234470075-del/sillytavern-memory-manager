import {statusUpdateSchema} from './status-updates.js?v=0.7.2';
export const JSON_RULES='【严格序列化】只返回一个完整JSON对象，不加Markdown代码围栏或说明。字符串中的对白优先使用中文引号“”；保留英文双引号时必须写成\\"，反斜线写成\\\\，换行写成\\n。不得将未转义的对白直接插进JSON字符串。不以省略号代替结构，不留下半个条目。';
export const DEDUP_RULES='【去重与来源】同一连续事件合成一条完整记忆；不同条目不能重复讲述同一段过程。摘要记录事实和因果，原话仅保留不可被转述替代的关键连续短句，不在摘要、原话和约定栏目重复整段对白。先保证独有事实完整，再减少重复措辞。sources只能使用本次输入floor或originalFloors中的整数，逐条核对事件和引文确实出现在对应楼层。任何先前对话不能搬到后续楼层冒充新事件。';
export function summarySchema(settings={}){
 const properties={statusUpdates:statusUpdateSchema,title:{type:'string'},summary:{type:'string'},details:{type:'object',properties:Object.fromEntries(Object.entries(settings.modes||{}).filter(([,v])=>v==='separate').map(([k])=>[k,{type:'string'}])),additionalProperties:false},sources:{type:'array',items:{type:'integer'}},excerpt:{type:'string'}};
 properties.keywords={type:'array',items:{type:'string'}};if(settings.summaryLevel!==1||settings.batchProcessing)properties.brief={type:'string'};
 if(settings.batchProcessing&&settings.batchClassification!=='manual')properties.suggestedKind={type:'string',enum:['short','long','fixed']};
 return {type:'object',properties:{memories:{type:'array',minItems:1,items:{type:'object',properties,required:Object.keys(properties),additionalProperties:false}}},required:['memories'],additionalProperties:false};
}
