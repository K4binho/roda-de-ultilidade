const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(app.getPath('temp'),'k4-animation-')));
require('../src/outside-click').start=()=>{}; // Isola animacao dos cliques reais durante o teste.
require('../src/main');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 try{
  await delay(1500);const w=BrowserWindow.getAllWindows()[0];w.removeAllListeners('blur');w.webContents.setBackgroundThrottling(false);app.emit('second-instance');
  const js=code=>w.webContents.executeJavaScript(code);
  w.webContents.send('wheel-visibility',true);await delay(400);
  assert.equal(await js(`document.body.classList.contains('is-open')`),true);
  const motion=await js(`({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,transition:getComputedStyle(document.querySelector('main')).transitionDuration,animation:getComputedStyle(document.querySelector('.item')).animationName})`);
  assert.notEqual(motion.transition,'0s');assert.equal(motion.animation,'item-expand');
  assert.equal(await js("getComputedStyle(document.querySelector('main')).animationName"),'bubble-in');
  w.webContents.debugger.attach('1.3');
  await w.webContents.debugger.sendCommand('DOM.enable');
  await w.webContents.debugger.sendCommand('CSS.enable');
  const {root}=await w.webContents.debugger.sendCommand('DOM.getDocument');
  const {nodeId}=await w.webContents.debugger.sendCommand('DOM.querySelector',{nodeId:root.nodeId,selector:'.item'});
  await w.webContents.debugger.sendCommand('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']});await delay(350);
  assert.equal(await js("getComputedStyle(document.querySelector('.item')).scale"),'1.05');
  await w.webContents.debugger.sendCommand('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]});await delay(350);
  assert.equal(await js("getComputedStyle(document.querySelector('.item')).scale"),'1');
  w.webContents.debugger.detach();
  await js(`{const cats=[...document.querySelectorAll('.category')];const enter=cats[2].onmouseenter;cats.forEach(c=>{c.onmouseenter=null;c.onmouseleave=null;});enter();}`);await delay(250);
  assert.equal(await js(`document.querySelector('.item').getAttribute('aria-label')`),'Pesquisar');
  await js(`window.k4.call('hide')`);await delay(50);
  assert.equal(await js(`document.body.classList.contains('is-closing')`),true);
  assert.equal(w.isVisible(),true);await delay(350);assert.equal(w.isVisible(),false);
  const result={passed:true,motion,checks:['entrada','expansao','hover abre categoria','saida antes de ocultar janela'],limitation:'blur desligado apenas neste teste isolado'};
  fs.writeFileSync(path.join(__dirname,'../docs/animation-runtime-result.json'),JSON.stringify(result,null,2));console.log(result);
 }catch(e){console.error(e);app.exit(1);return;}
 for(const w of BrowserWindow.getAllWindows())w.destroy();app.quit();
});






