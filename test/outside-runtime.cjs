const {app,BrowserWindow,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(app.getPath('temp'),'k4-outside-')));
let click;const watcher=require('../src/outside-click');watcher.start=fn=>{click=fn;};
require('../src/main');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 try{
  await delay(1500);const w=BrowserWindow.getAllWindows()[0];w.removeAllListeners('blur');app.emit('second-instance');await delay(400);
  const b=w.getBounds();click(screen.dipToScreenPoint({x:b.x+100,y:b.y+100}));assert.equal(w.isVisible(),true);
  click(screen.dipToScreenPoint({x:b.x-50,y:b.y-50}));await delay(400);assert.equal(w.isVisible(),false);
  console.log('Clique externo fecha sem blur; clique interno preserva janela; conversao DIP aplicada. Evento nativo simulado neste teste.');
 }catch(e){console.error(e);app.exit(1);return;}
 for(const w of BrowserWindow.getAllWindows())w.destroy();app.quit();
});
