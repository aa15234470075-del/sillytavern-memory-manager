let installed=false;
export function installDialogLayout(){
 if(installed)return;installed=true;
 const seen=new WeakSet();
 const prepare=d=>{if(seen.has(d))return;seen.add(d);
  const root=d.querySelector(':scope > form')||d;
  const buttons=[...root.children].filter(e=>e.matches('footer,.smm-actions,button')&&!e.matches('[data-generate]'));
  if(!buttons.length)return;
  d.classList.add('smm-fixed-dialog');if(root!==d)root.classList.add('smm-dialog-form');
  const header=document.createElement('header'),body=document.createElement('section'),footer=document.createElement('footer');body.className='smm-dialog-body';footer.className='smm-dialog-footer';
  const title=root.querySelector(':scope > h3');if(title)header.append(title);
  for(const el of [...root.children])if(!buttons.includes(el))body.append(el);
  for(const el of buttons){if(el.matches('footer,.smm-actions'))footer.append(...el.childNodes);else footer.append(el);}
  root.append(header,body,footer);
 };
 const scan=()=>document.querySelectorAll('dialog.smm-editor').forEach(prepare);
 new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});scan();
}
