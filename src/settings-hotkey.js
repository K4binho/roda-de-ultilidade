let capturingHotkey=false,capturePending=false,captureTimeout,captureLostFocus=false;
const changeHotkey=$('#change-hotkey'),cancelHotkey=$('#cancel-hotkey'),hotkeyHint=$('#hotkey-hint');
async function finishHotkeyCapture(value,message){
 if(!capturingHotkey)return;
 capturingHotkey=false;clearTimeout(captureTimeout);
 changeHotkey.textContent='Mudar atalho';changeHotkey.disabled=false;cancelHotkey.hidden=true;$('#save').disabled=false;
 if(value){$('#hotkey').value=value==='MouseMiddle'?'Botão do scroll':value;changed();}
 hotkeyHint.textContent=message;
 try{await window.k4.call('end-hotkey-capture');}catch(e){status(e.message,true);}
}
changeHotkey.onclick=async()=>{
 if(capturingHotkey||capturePending)return;
 capturePending=true;captureLostFocus=false;changeHotkey.disabled=true;
 try{
  await window.k4.call('begin-hotkey-capture');
  if(captureLostFocus){await window.k4.call('end-hotkey-capture');changeHotkey.disabled=false;return;}
  capturingHotkey=true;changeHotkey.disabled=false;changeHotkey.textContent='Pressione o atalho…';cancelHotkey.hidden=false;$('#save').disabled=true;
  hotkeyHint.textContent='Pressione uma tecla, combinação ou aperte a rodinha do mouse. Esc cancela. O botão escolhido fica reservado à roda.';
  changeHotkey.focus();captureTimeout=setTimeout(()=>finishHotkeyCapture(null,'Tempo esgotado. O atalho anterior foi mantido.'),30000);
 }catch(e){changeHotkey.disabled=false;status(e.message,true);}finally{capturePending=false;}
};
cancelHotkey.onclick=()=>finishHotkeyCapture(null,'Captura cancelada. O atalho anterior foi mantido.');
document.addEventListener('keydown',event=>{
 if(!capturingHotkey)return;
 event.preventDefault();event.stopImmediatePropagation();
 try{
  const value=K4Hotkey.fromEvent(event);
  if(value==='cancel'){finishHotkeyCapture(null,'Captura cancelada. O atalho anterior foi mantido.');return;}
  if(value)finishHotkeyCapture(value,'Capturado: '+value+'. Clique em Salvar alterações para aplicar.');
  else if(!event.repeat)hotkeyHint.textContent=[event.ctrlKey?'Ctrl':null,event.altKey?'Alt':null,event.shiftKey?'Shift':null].filter(Boolean).join(' + ')+' · pressione a tecla final. Esc cancela.';
 }catch(e){hotkeyHint.textContent=e.message;}
},true);
window.addEventListener('blur',()=>{captureLostFocus=true;finishHotkeyCapture(null,'Captura cancelada ao sair da janela.');});
let consumeMiddleClick=false;
document.addEventListener('pointerdown',event=>{
 if(!capturingHotkey)return;
 if(event.button===1){event.preventDefault();event.stopImmediatePropagation();consumeMiddleClick=true;setTimeout(()=>{consumeMiddleClick=false;},1000);finishHotkeyCapture('MouseMiddle','Capturado: botão do scroll. Clique em Salvar alterações para aplicar.');return;}
 if(!event.target.closest('.hotkey-setting'))finishHotkeyCapture(null,'Captura cancelada.');
},true);
document.addEventListener('mousedown',event=>{if(event.button===1&&(capturingHotkey||consumeMiddleClick))event.preventDefault();},true);
document.addEventListener('auxclick',event=>{if(event.button===1&&consumeMiddleClick){event.preventDefault();consumeMiddleClick=false;}},true);
