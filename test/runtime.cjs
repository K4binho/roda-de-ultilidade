// Run explicitly with Electron; isolated userData prevents changes to real settings.
const {app,BrowserWindow,globalShortcut}=require('electron');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const temp=fs.mkdtempSync(path.join(app.getPath('temp'),'k4-runtime-'));
app.setPath('userData',temp);
const initial=require('../src/config').defaults();initial.hotkey='Ctrl+Shift+Alt+F9';require('../src/config').save(path.join(temp,'config.json'),initial);
require('../src/main');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const report=[];
 try {
 await delay(1500);const wheel=BrowserWindow.getAllWindows()[0];wheel.show();wheel.focus();
 assert.equal(wheel.isAlwaysOnTop(),true);assert.equal(wheel.isVisible(),true);assert.equal(globalShortcut.isRegistered(initial.hotkey),true);
 report.push('overlay visível, sempre no topo e atalho registrado');
 await wheel.webContents.executeJavaScript(`document.querySelectorAll('.category')[2].dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
 assert.equal(await wheel.webContents.executeJavaScript(`document.querySelector('.item').getAttribute('aria-label')`),'Pesquisar');report.push('clique na categoria abre submenu');
 wheel.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});await delay(400);assert.equal(wheel.isVisible(),false);report.push('Esc oculta roda com animação');
 await wheel.webContents.executeJavaScript(`window.k4.call('settings')`);await delay(500);
 const settings=BrowserWindow.getAllWindows().find(w=>w!==wheel);
 await settings.webContents.executeJavaScript(`document.querySelector('#category-name').value='Teste persistido';document.querySelector('#category-name').dispatchEvent(new Event('input'));document.querySelector('#save').click()`);await delay(300);
 assert.equal(JSON.parse(fs.readFileSync(path.join(temp,'config.json'))).categories[0].name,'Teste persistido');report.push('edição pela UI e persistência em disco');
 await settings.webContents.executeJavaScript(`{const input=document.querySelector('.item > label input');input.value='[';input.dispatchEvent(new Event('input'));document.querySelectorAll('nav button')[1].click();document.querySelectorAll('nav button')[0].click();document.querySelector('#save').click();}`);await delay(100);
 assert.match(await settings.webContents.executeJavaScript(`document.querySelector('#status').textContent`),/Corrija/);
 await settings.webContents.executeJavaScript(`{const input=document.querySelector('.item > label input');input.value='[]';input.dispatchEvent(new Event('input'));document.querySelector('#save').click();}`);await delay(100);report.push('argumentos inválidos preservados ao trocar categoria e impedidos de salvar');
 await settings.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true}).then(i=>fs.writeFileSync(path.join(__dirname,'../docs/configuracoes.png'),i.toPNG()));
 const c=await settings.webContents.executeJavaScript(`window.k4.call('get-config')`);c.categories[0].items[0].target=path.join(process.env.WINDIR,'System32','whoami.exe');
 await settings.webContents.executeJavaScript(`window.k4.call('save-config',${JSON.stringify(c)})`);
 await wheel.webContents.executeJavaScript(`window.k4.call('launch','notepad')`);report.push('execução real de whoami.exe via IPC e spawn sem shell');
 const nodePath=require('node:child_process').execFileSync(path.join(process.env.WINDIR,'System32','where.exe'),['node'],{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/)[0];
 const cwdFile=path.join(temp,'working-directory.txt');c.categories[0].items[0].target=nodePath;c.categories[0].items[0].args=['-e',`require('node:fs').writeFileSync(${JSON.stringify(cwdFile)},process.cwd())`];
 await settings.webContents.executeJavaScript(`window.k4.call('save-config',${JSON.stringify(c)})`);await wheel.webContents.executeJavaScript(`window.k4.call('launch','notepad')`);
 for(let i=0;i<30&&!fs.existsSync(cwdFile);i++)await delay(100);
 assert.equal(fs.readFileSync(cwdFile,'utf8').toLowerCase(),path.dirname(nodePath).toLowerCase());report.push('executável iniciado a partir da própria pasta, requisito do OBS e apps portáteis');
 const bad=await wheel.webContents.executeJavaScript(`window.k4.call('save-config',{}).then(()=>false,()=>true)`);assert.equal(bad,true);report.push('renderer da roda impedido de alterar configuração');
 const c2=await settings.webContents.executeJavaScript(`window.k4.call('get-config')`);c2.hotkey='Ctrl+Alt+F9';await settings.webContents.executeJavaScript(`window.k4.call('save-config',${JSON.stringify(c2)})`);assert.equal(globalShortcut.isRegistered(c2.hotkey),true);assert.equal(globalShortcut.isRegistered(initial.hotkey),false);report.push('troca de atalho registra novo e libera anterior');
 settings.destroy();wheel.show();await delay(100);await wheel.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true}).then(i=>fs.writeFileSync(path.join(__dirname,'../docs/roda.png'),i.toPNG()));
 fs.writeFileSync(path.join(__dirname,'../docs/runtime-result.json'),JSON.stringify({platform:process.platform,electron:process.versions.electron,passed:report},null,2));console.log(report.join('\n'));
 }catch(e){console.error(e);app.exit(1);return;}finally{for(const w of BrowserWindow.getAllWindows())w.destroy();app.quit();}
});




