const {app,BrowserWindow,globalShortcut}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {defaults,save}=require('../src/config');
const temp=fs.mkdtempSync(path.join(app.getPath('temp'),'k4-hotkey-'));app.setPath('userData',temp);
const initial=defaults();initial.hotkey='Ctrl+Alt+Shift+F12';save(path.join(temp,'config.json'),initial);
require('../src/main');const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<70;i++){if(await fn())return;await delay(100);}throw Error('Tempo esgotado.');}
app.whenReady().then(async()=>{
 try{
  await until(()=>BrowserWindow.getAllWindows()[0]?.webContents.isLoading()===false);const wheel=BrowserWindow.getAllWindows()[0];
  await wheel.webContents.executeJavaScript(`window.k4.call('settings')`);await until(()=>BrowserWindow.getAllWindows().length===2&&BrowserWindow.getAllWindows().find(w=>w!==wheel).webContents.isLoading()===false);
  const settings=BrowserWindow.getAllWindows().find(w=>w!==wheel),passed=[];
  assert.equal(await wheel.webContents.executeJavaScript(`window.k4.call('begin-hotkey-capture').then(()=>false,()=>true)`),true);
  await until(()=>settings.webContents.executeJavaScript(`!!document.querySelector('#change-hotkey')&&document.querySelector('#hotkey').value==='${initial.hotkey}'`));
  async function begin(){settings.show();settings.focus();await delay(100);await settings.webContents.executeJavaScript(`document.querySelector('#change-hotkey').click()`);await until(()=>settings.webContents.executeJavaScript(`!document.querySelector('#cancel-hotkey').hidden`));}
  async function key(keyCode,modifiers=[]){settings.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});settings.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await delay(100);}
  async function value(){return settings.webContents.executeJavaScript(`document.querySelector('#hotkey').value`);}
  await begin();assert.equal(globalShortcut.isRegistered(initial.hotkey),false);
  await key('F8',['control','shift']);await until(()=>globalShortcut.isRegistered(initial.hotkey));assert.equal(await value(),'Ctrl+Shift+F8');
  await settings.webContents.executeJavaScript(`document.querySelector('#save').click()`);await until(()=>globalShortcut.isRegistered('Ctrl+Shift+F8'));assert.equal(globalShortcut.isRegistered(initial.hotkey),false);assert.equal(JSON.parse(fs.readFileSync(path.join(temp,'config.json'))).hotkey,'Ctrl+Shift+F8');passed.push('Mudar atalho captura Ctrl+Shift+F8; suspensão temporária, restauração e persistência após salvar');
  await begin();await key('F23');await until(()=>globalShortcut.isRegistered('Ctrl+Shift+F8'));assert.equal(await value(),'F23');await settings.webContents.executeJavaScript(`document.querySelector('#save').click()`);await until(()=>globalShortcut.isRegistered('F23'));passed.push('Uma tecla isolada é capturada e registrada globalmente');
  settings.show();settings.focus();await delay(200);for(let attempt=0;attempt<3;attempt++){try{const image=await settings.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true});fs.writeFileSync(path.join(__dirname,'../docs/mudar-atalho.png'),image.toPNG());break;}catch(e){if(attempt===2)throw e;await delay(200);}}
  await begin();await key('Escape');await until(()=>globalShortcut.isRegistered('F23'));assert.equal(await value(),'F23');passed.push('Esc cancela sem alterar o atalho');
  const occupied='Ctrl+Alt+Shift+F11';assert.equal(globalShortcut.register(occupied,()=>{}),true);await begin();await key('F11',['control','alt','shift']);await until(()=>globalShortcut.isRegistered('F23'));await settings.webContents.executeJavaScript(`document.querySelector('#save').click()`);await until(()=>settings.webContents.executeJavaScript(`document.querySelector('#status').textContent.includes('ocupado')`));assert.equal(JSON.parse(fs.readFileSync(path.join(temp,'config.json'))).hotkey,'F23');assert.equal(globalShortcut.isRegistered('F23'),true);globalShortcut.unregister(occupied);passed.push('Combinação ocupada é rejeitada e mantém o atalho anterior');
  await begin();await key('F23');await until(()=>globalShortcut.isRegistered('F23'));await settings.webContents.executeJavaScript(`document.querySelector('#save').click()`);await delay(100);
  await begin();settings.webContents.sendInputEvent({type:'mouseDown',x:200,y:200,button:'middle',clickCount:1});settings.webContents.sendInputEvent({type:'mouseUp',x:200,y:200,button:'middle',clickCount:1});await until(async()=>await value()==='Botão do scroll');await until(()=>globalShortcut.isRegistered('F23'));
  await settings.webContents.executeJavaScript(`document.querySelector('#save').click()`);await until(()=>require('../src/middle-mouse').isRunning()&&JSON.parse(fs.readFileSync(path.join(temp,'config.json'))).hotkey==='MouseMiddle');assert.equal(globalShortcut.isRegistered('F23'),false);passed.push('Clique do meio capturado pela interface, persistido e suporte nativo ativado');
  await begin();assert.equal(require('../src/middle-mouse').isRunning(),false);await key('Escape');await until(()=>require('../src/middle-mouse').isRunning());
  await begin();await key('F23');await until(()=>require('../src/middle-mouse').isRunning());await settings.webContents.executeJavaScript(`document.querySelector('#save').click()`);await until(()=>globalShortcut.isRegistered('F23')&&!require('../src/middle-mouse').isRunning());passed.push('Scroll suspenso ao capturar, restaurado no cancelamento e liberado ao voltar ao teclado');
  await begin();wheel.show();wheel.focus();await until(()=>globalShortcut.isRegistered('F23'));passed.push('Sair da janela cancela a captura e restaura o atalho');
  await begin();settings.destroy();await until(()=>globalShortcut.isRegistered('F23'));passed.push('Fechar configurações durante captura restaura o atalho');
  fs.writeFileSync(path.join(__dirname,'../docs/hotkey-runtime-result.json'),JSON.stringify({platform:process.platform,passed},null,2));console.log(passed.join('\n'));
 }catch(e){console.error(e);app.exit(1);return;}finally{for(const w of BrowserWindow.getAllWindows())w.destroy();app.quit();}
});
