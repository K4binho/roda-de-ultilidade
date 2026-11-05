const {app,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.setPath('userData',fs.mkdtempSync(path.join(app.getPath('temp'),'k4-first-')));
const config=require('../src/config').defaults();config.hotkey='MouseMiddle';require('../src/config').save(path.join(app.getPath('userData'),'config.json'),config);
require('../src/middle-mouse').start=()=>delay(2000);
require('../src/outside-click').start=()=>{};
require('../src/main');
app.whenReady().then(async()=>{try{
 for(let i=0;i<60&&!BrowserWindow.getAllWindows()[0];i++)await delay(50);
 const w=BrowserWindow.getAllWindows()[0];while(w.webContents.isLoading())await delay(20);
 assert.equal(await w.webContents.executeJavaScript("window.k4.call('get-config').then(c=>c.hotkey)"),'MouseMiddle');
 await w.webContents.executeJavaScript("window.k4.call('settings')");let s;for(let i=0;i<60;i++){s=BrowserWindow.getAllWindows().find(x=>x!==w);if(s&&!s.webContents.isLoading())break;await delay(50);}
 await delay(150);
 assert.equal(await s.webContents.executeJavaScript("document.querySelector('#category-name').value"),'Aplicativos');
 await s.webContents.executeJavaScript("document.querySelector('#category-name').value='Salvo';document.querySelector('#category-name').dispatchEvent(new Event('input'));document.querySelector('#save').click()");await delay(200);
 assert.equal(await s.webContents.executeJavaScript("dirty"),false);
 let blocked=false;s.webContents.on('will-prevent-unload',()=>blocked=true);s.close();await delay(200);assert.equal(blocked,false);assert.equal(s.isDestroyed(),true);
 console.log('Primeira abertura durante hook lento carregou; salvar seguido de fechar nao pediu descarte.');
 }catch(e){console.error(e);app.exit(1);return;}app.quit();});

