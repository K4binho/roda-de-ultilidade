const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {defaults,save}=require('../src/config');
const temp=fs.mkdtempSync(path.join(app.getPath('temp'),'k4-colors-'));app.setPath('userData',temp);
const initial=defaults();initial.hotkey='Ctrl+Shift+Alt+F5';initial.wheelSize='compact';
const item=initial.categories[0].items[0];initial.categories[0].items=[{...item,id:'obs',name:'OBS Studio'},{...item,id:'discord',name:'Discord'}];save(path.join(temp,'config.json'),initial);
require('../src/main');const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<60;i++){if(await fn())return;await delay(100);}throw Error('Tempo esgotado.');}
app.whenReady().then(async()=>{try{
 await until(()=>BrowserWindow.getAllWindows()[0]?.webContents.isLoading()===false);const wheel=BrowserWindow.getAllWindows()[0];
 // Isolate pointer tests from unrelated desktop focus changes during automation.
 wheel.removeAllListeners('blur');
 await until(()=>wheel.webContents.executeJavaScript(`document.querySelectorAll('.outline').length===2`));
 const colors=await wheel.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.outline')).map(e=>({id:e.dataset.itemId,color:getComputedStyle(e).stroke,d:e.getAttribute('d')}))`);
 assert.deepEqual(colors.map(c=>c.id),['obs','discord']);assert.notEqual(colors[0].color,colors[1].color);assert.notEqual(colors[0].d,colors[1].d);
 await wheel.webContents.executeJavaScript(`document.querySelector('[aria-label="Discord"]').dispatchEvent(new MouseEvent('mouseenter'))`);
 assert.equal(await wheel.webContents.executeJavaScript(`getComputedStyle(document.querySelector('#center strong')).color`),colors[1].color);
 wheel.show();await wheel.webContents.executeJavaScript(`document.querySelector('svg').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:190,clientY:190}))`);assert.equal(wheel.isVisible(),true);
 await wheel.webContents.executeJavaScript(`document.querySelector('svg').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:2,clientY:2}))`);await until(()=>!wheel.isVisible());
 wheel.show();await wheel.webContents.executeJavaScript(`document.querySelector('#settings').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:20,clientY:360}))`);assert.equal(wheel.isVisible(),true);
 wheel.show();wheel.focus();await delay(300);for(let attempt=0;attempt<3;attempt++){try{const image=await wheel.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true});fs.writeFileSync(path.join(__dirname,'../docs/cores-obs-discord.png'),image.toPNG());break;}catch(e){if(attempt===2)throw e;wheel.show();await delay(200);}}
 await wheel.webContents.executeJavaScript(`window.k4.call('settings')`);await until(()=>BrowserWindow.getAllWindows().length===2&&BrowserWindow.getAllWindows().find(w=>w!==wheel).webContents.isLoading()===false);const settings=BrowserWindow.getAllWindows().find(w=>w!==wheel);
 initial.categories[0].items=initial.categories[0].items.slice(0,1);await settings.webContents.executeJavaScript(`window.k4.call('save-config',${JSON.stringify(initial)})`);await until(()=>wheel.webContents.executeJavaScript(`document.querySelectorAll('.outline').length===1`));
 initial.categories[0].items=[];await settings.webContents.executeJavaScript(`window.k4.call('save-config',${JSON.stringify(initial)})`);await until(()=>wheel.webContents.executeJavaScript(`document.querySelectorAll('.outline').length===0`));
 assert.equal(await wheel.webContents.executeJavaScript(`document.querySelectorAll('.category').length`),5);
 console.log('Dois atalhos = duas cores; hover/centro correspondente; um atalho = uma cor; vazio = zero arcos; categorias preservadas; clique externo fecha e clique interno/controles preserva.');
 }catch(e){console.error(e);app.exit(1);return;}finally{for(const w of BrowserWindow.getAllWindows())w.destroy();app.quit();}});
