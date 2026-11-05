const {app,BrowserWindow,nativeImage,Tray}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const temp=fs.mkdtempSync(path.join(app.getPath('temp'),'k4-steam-ui-'));
app.setPath('userData',path.join(temp,'profile'));
const initial=require('../src/config').defaults();initial.hotkey='Ctrl+Shift+Alt+F8';require('../src/config').save(path.join(temp,'profile','config.json'),initial);
require('../src/main');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<80;i++){if(await fn())return;await delay(100);}throw Error('Tempo esgotado esperando interface.');}
app.whenReady().then(async()=>{
 const passed=[];
 try {
 await until(()=>BrowserWindow.getAllWindows()[0]?.webContents && !BrowserWindow.getAllWindows()[0].webContents.isLoading());
 const wheel=BrowserWindow.getAllWindows()[0];
 await until(()=>wheel.webContents.executeJavaScript(`document.querySelectorAll('.category').length===5`));
 const real=await wheel.webContents.executeJavaScript(`window.k4.call('refresh-steam')`);
 passed.push('Detecção real: '+real.games.length+' jogos e '+real.libraries.length+' bibliotecas acessíveis');
 let requestedGame;
 if(process.argv.includes('--launch-real')){
  requestedGame=real.games.find(g=>g.id==='391220');assert.ok(requestedGame,'Rise of the Tomb Raider deve estar instalado para este teste opcional.');
  await wheel.webContents.executeJavaScript(`window.k4.call('launch-steam','391220')`);passed.push('Pedido real de abertura enviado à Steam pelo IPC: '+requestedGame.name);
 }
 await wheel.webContents.executeJavaScript(`document.querySelector('[aria-label="Steam"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
 await until(()=>wheel.webContents.executeJavaScript(`document.querySelector('#steam-controls span').textContent.includes('${real.games.length} jogos')`));
 assert.equal(await wheel.webContents.executeJavaScript(`document.querySelector('#steam-controls').hidden`),real.games.length<=8);
 wheel.show();wheel.focus();await delay(150);await wheel.webContents.capturePage().then(image=>fs.writeFileSync(path.join(__dirname,'../docs/steam-roda.png'),image.toPNG()));
 await wheel.webContents.executeJavaScript(`window.k4.call('settings')`);
 await until(()=>BrowserWindow.getAllWindows().length===2 && BrowserWindow.getAllWindows().find(w=>w!==wheel)?.webContents.isLoading()===false);
 const settings=BrowserWindow.getAllWindows().find(w=>w!==wheel);
 await until(()=>settings.webContents.executeJavaScript(`!!document.querySelector('#steam-tab')`));
 await settings.webContents.executeJavaScript(`document.querySelector('#steam-tab').click()`);
 await until(()=>settings.webContents.executeJavaScript(`document.querySelectorAll('.steam-game').length===${real.games.length}`));
 settings.show();settings.focus();await delay(150);await settings.webContents.capturePage().then(image=>fs.writeFileSync(path.join(__dirname,'../docs/steam-configuracoes.png'),image.toPNG()));
 passed.push('Steam aparece na roda e como aba nas configurações com lista real');
 const icon=nativeImage.createFromPath(path.join(__dirname,'../src/assets/k4-wheel.ico'));
 assert.equal(icon.isEmpty(),false);assert.ok(icon.getSize().width>=16);
 const probe=new Tray(icon);assert.equal(probe.isDestroyed(),false);assert.equal(probe.getBounds().width>0,true);probe.destroy();passed.push('ICO legível pelo Electron e bandeja registrada com dimensões válidas');
 const root=path.join(temp,'Steam fixture');fs.mkdirSync(path.join(root,'steamapps','common'),{recursive:true});fs.writeFileSync(path.join(root,'steam.exe'),'fixture');
 for(let i=1;i<=19;i++){fs.mkdirSync(path.join(root,'steamapps','common','Game '+i));fs.writeFileSync(path.join(root,'steamapps','appmanifest_'+i+'.acf'),`"AppState" { "appid" "${i}" "name" "Jogo ${String(i).padStart(2,'0')}" "StateFlags" "4" "installdir" "Game ${i}" }`);}
 const config=await settings.webContents.executeJavaScript(`window.k4.call('get-config')`);config.steamPath=root;
 await settings.webContents.executeJavaScript(`window.k4.call('save-config',${JSON.stringify(config)})`);
 await wheel.webContents.executeJavaScript(`window.k4.call('refresh-steam')`);
 await wheel.webContents.executeJavaScript(`document.querySelector('[aria-label="Steam"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
 await until(()=>wheel.webContents.executeJavaScript(`document.querySelector('#steam-controls span').textContent==='1/3 · 19 jogos'`));
 assert.equal(await wheel.webContents.executeJavaScript(`document.querySelectorAll('.item').length`),8);
 assert.equal(await wheel.webContents.executeJavaScript(`document.querySelector('#steam-controls').hidden`),false);
 assert.equal(await wheel.webContents.executeJavaScript(`document.querySelector('#steam-controls button[title="Página anterior"]').hidden`),true);
 await wheel.webContents.executeJavaScript(`document.querySelector('#steam-controls button[title="Próxima página"]').click();document.querySelector('#steam-controls button[title="Próxima página"]').click()`);
 assert.equal(await wheel.webContents.executeJavaScript(`document.querySelectorAll('.item').length`),3);
 assert.equal(await wheel.webContents.executeJavaScript(`document.querySelector('#steam-controls button[title="Próxima página"]').hidden`),true);
 assert.ok((await wheel.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.item')).map(e=>e.getAttribute('aria-label'))`)).includes('Jogo 19'));
 assert.equal(await wheel.webContents.executeJavaScript(`document.querySelector('#steam-controls input')===null`),true);passed.push('Biblioteca de 19 jogos: três páginas acessíveis sem campo de busca');
 assert.equal(await wheel.webContents.executeJavaScript(`window.k4.call('launch-steam','9999999999').then(()=>false,()=>true)`),true);passed.push('IPC rejeita AppID não instalado');
 const report={platform:process.platform,electron:process.versions.electron,passed,realGameLaunchRequested:requestedGame?.name||false};
 fs.writeFileSync(path.join(__dirname,'../docs/steam-runtime-result.json'),JSON.stringify(report,null,2));console.log(passed.join('\n'));
 }catch(err){console.error(err);app.exit(1);return;}
 finally{for(const w of BrowserWindow.getAllWindows())w.destroy();app.quit();}
});

