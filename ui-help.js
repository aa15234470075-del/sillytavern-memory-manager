// Native disclosure: keyboard accessible, no additional popup or event handlers.
export function help(title,body,open=false){return `<details class="smm-help" ${open?'open':''}><summary><span class="smm-help-icon" aria-hidden="true">i</span><span>${title}</span></summary><div>${body}</div></details>`;}
