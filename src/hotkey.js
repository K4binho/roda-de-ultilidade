(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.K4Hotkey=api;})(globalThis,()=>{
 const modifiers={ctrl:'Ctrl',control:'Ctrl',alt:'Alt',shift:'Shift'};
 const keys=['Space','Tab','Enter','Backspace','Delete','Insert','Home','End','PageUp','PageDown','Up','Down','Left','Right','PrintScreen','ScrollLock','Pause','Capslock','Numlock'];
 function normalize(value){
  if(typeof value!=='string'||!value.trim()||value.length>80)throw Error('Atalho inválido. Pressione uma tecla ou combinação.');
  if(['mousemiddle','botão do scroll'].includes(value.toLowerCase()))return 'MouseMiddle';
  const parts=value.split('+'),key=parts.pop();
  if(!key||parts.some(p=>!modifiers[p.toLowerCase()]))throw Error('Combinação inválida. Use Ctrl, Alt ou Shift com uma tecla.');
  const mods=parts.map(p=>modifiers[p.toLowerCase()]);if(new Set(mods).size!==mods.length)throw Error('Modificador repetido.');
  let name=keys.find(k=>k.toLowerCase()===key.toLowerCase());
  if(/^[a-z0-9]$/i.test(key))name=key.toUpperCase();
  else if(/^F(?:[1-9]|1\d|2[0-4])$/i.test(key))name=key.toUpperCase();
  else if(/^num[0-9]$/i.test(key))name=key.toLowerCase();
  else if([',','.','-','=',';','/','\\','[',']',"'",'`','numadd','numsub','nummult','numdiv','numdec'].includes(key))name=key;
  if(!name)throw Error('Tecla não suportada. Tente uma letra, número, tecla F ou navegação. Esc cancela a captura.');
  return [...['Ctrl','Alt','Shift'].filter(m=>mods.includes(m)),name].join('+');
 }
 function fromEvent(e){
  if(e.repeat)return null;
  if(['Control','Alt','Shift','Meta','AltGraph'].includes(e.key))return null;
  if(e.metaKey||e.getModifierState?.('AltGraph'))throw Error('Use Ctrl, Alt ou Shift sem a tecla Windows ou AltGr.');
  if(e.key==='Escape')return 'cancel';
  let key;
  if(/^Key[A-Z]$/.test(e.code))key=e.code.slice(3);
  else if(/^Digit\d$/.test(e.code))key=e.code.slice(5);
  else if(/^Numpad\d$/.test(e.code))key='num'+e.code.slice(6);
  else key=({Space:'Space',ArrowUp:'Up',ArrowDown:'Down',ArrowLeft:'Left',ArrowRight:'Right',NumpadAdd:'numadd',NumpadSubtract:'numsub',NumpadMultiply:'nummult',NumpadDivide:'numdiv',NumpadDecimal:'numdec',NumpadEnter:'Enter',Comma:',',Period:'.',Minus:'-',Equal:'=',Semicolon:';',Slash:'/',Backslash:'\\',BracketLeft:'[',BracketRight:']',Quote:"'",Backquote:'`'})[e.code]||e.key;
  return normalize([e.ctrlKey?'Ctrl':null,e.altKey?'Alt':null,e.shiftKey?'Shift':null,key].filter(Boolean).join('+'));
 }
 return {normalize,fromEvent};
});
