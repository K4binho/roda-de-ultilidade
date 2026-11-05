const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {defaults,save}=require('../src/config');
const temp=fs.mkdtempSync(path.join(app.getPath('temp'),'k4-appearance-'));
app.setPath('userData',temp);const initial=defaults();initial.hotkey='Ctrl+Shift+Alt+F7';save(path.join(temp,'config.json'),initial);
require('../src/main');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<80;i++){if(await fn())return;await delay(100);}throw Error('Interface não ficou pronta.');}
app.whenReady().then(async()=>{
 try{
  await until(()=>BrowserWindow.getAllWindows()[0]?.webContents.isLoading()===false);
  const wheel=BrowserWindow.getAllWindows()[0];await until(()=>wheel.webContents.executeJavaScript(`document.querySelectorAll('.category').length===5`));
  await wheel.webContents.executeJavaScript(`window.k4.call('settings')`);
  await until(()=>BrowserWindow.getAllWindows().length===2&&BrowserWindow.getAllWindows().find(w=>w!==wheel).webContents.isLoading()===false);
  const settings=BrowserWindow.getAllWindows().find(w=>w!==wheel);
  await until(()=>settings.webContents.executeJavaScript(`document.querySelector('#wheel-size').value==='large'`));
  const passed=[];
  for(const [name,size]of Object.entries({large:700,medium:580,small:480,compact:380})){
   await settings.webContents.executeJavaScript(`{const select=document.querySelector('#wheel-size');select.value='${name}';select.dispatchEvent(new Event('change'));document.querySelector('#save').click();}`);
   await until(()=>JSON.parse(fs.readFileSync(path.join(temp,'config.json'))).wheelSize===name);
   app.emit('second-instance');assert.equal(wheel.getBounds().width,size);
   await wheel.webContents.executeJavaScript(`document.querySelector('[aria-label="Steam"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
   await until(()=>wheel.webContents.executeJavaScript(`document.querySelectorAll('.item').length>0`));
   wheel.show();wheel.focus();await delay(150);
   const geometry=await wheel.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.arc-label')).map(e=>({length:e.getComputedTextLength(),space:document.getElementById(e.querySelector('textPath').getAttribute('href').slice(1)).getTotalLength()}))`);
   assert.ok(geometry.length>=5);assert.ok(geometry.every(g=>g.length<=g.space*.92));
   assert.equal(await wheel.webContents.executeJavaScript(`document.querySelector('#steam-controls input')===null`),true);
   await wheel.webContents.executeJavaScript(`document.querySelector('.item').dispatchEvent(new MouseEvent('mouseenter'))`);
   assert.equal(await wheel.webContents.executeJavaScript(`document.querySelector('#center strong').textContent===document.querySelector('.item').getAttribute('aria-label')`),true);
   await delay(150);
   await wheel.capturePage().then(image=>fs.writeFileSync(path.join(__dirname,'../docs/roda-'+name+'.png'),image.toPNG()));
   await wheel.webContents.executeJavaScript(`document.querySelector('.item').dispatchEvent(new MouseEvent('mouseleave'))`);
   assert.equal(await wheel.webContents.executeJavaScript(`document.querySelector('#center strong').textContent`),'Steam');
   passed.push(name+': '+size+' px, persistência, rótulos em arcos, centro contextual e ausência de busca');
  }
  fs.writeFileSync(path.join(__dirname,'../docs/appearance-result.json'),JSON.stringify({platform:process.platform,passed},null,2));console.log(passed.join('\n'));
 }catch(err){console.error(err);app.exit(1);return;}
 finally{for(const w of BrowserWindow.getAllWindows())w.destroy();app.quit();}
});
