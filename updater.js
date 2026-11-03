// Use the same update API as SillyTavern's extension manager.
export async function updatePlugin(headers,{moduleUrl=import.meta.url,extensionTypes,fetcher=fetch}={}){
 const path=new URL(moduleUrl).pathname;
 const match=path.match(/\/scripts\/extensions\/(third-party\/[^/]+)\//);
 if(!match)throw Error('未识别插件安装目录，不能更新此安装');
 const id=decodeURIComponent(match[1]),name=id.slice('third-party/'.length);
 const types=extensionTypes??(await import('/scripts/extensions.js')).extensionTypes;
 const type=types?.[id]??types?.[name];
 if(!['global','local'].includes(type))throw Error('当前酒馆没有提供此扩展的安装类型，无法更新');
 const response=await fetcher('/api/extensions/update',{method:'POST',headers,body:JSON.stringify({extensionName:name,global:type==='global'}),signal:AbortSignal.timeout(300000)});
 if(!response.ok)throw Error('更新失败（HTTP '+response.status+'）：请确认酒馆账号拥有更新权限、扩展通过Git安装且服务器能访问GitHub');
 const result=await response.json();
 if(typeof result.isUpToDate!=='boolean'||!result.shortCommitHash)throw Error('更新接口未返回有效结果，请检查酒馆服务端日志');
 return result;
}
