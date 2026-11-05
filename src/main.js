const {app,BrowserWindow,ipcMain,globalShortcut,Tray,Menu,nativeImage,screen,shell,dialog,session}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {defaults,validate,save}=require('./config');
const {detectSteamRoot,scanSteam,launchSteamGame}=require('./steam');
const middleMouse=require('./middle-mouse');
const outsideClick=require('./outside-click');
const startup=require('./startup').createStartup(app);
app.on('before-quit',()=>outsideClick.stop());
let wheel,settings,tray,config,file;
let hideTimer,closingWheel=false;
let hotkeyCapture=false,hotkeyCaptureTimer;
let steamSnapshot,steamRefresh,lastSteamScan=0;
async function getSteam(force=false) {
 if(steamRefresh)return steamRefresh;
 if(!force && steamSnapshot && Date.now()-lastSteamScan<30000)return steamSnapshot;
 steamRefresh=(async()=>{const root=await detectSteamRoot(config.steamPath || '');steamSnapshot=await scanSteam(root);lastSteamScan=Date.now();return steamSnapshot;})();
 try{return await steamRefresh;}finally{steamRefresh=null;}
}
const smoke=process.argv.includes('--smoke-test');
if(smoke) app.setPath('userData',path.join(app.getPath('temp'),'k4-wheel-smoke'));
if(!app.requestSingleInstanceLock()) app.quit();
else {
app.on('second-instance',()=>wheel && showWheel());
function makeWindow(page,opts) {
 const win=new BrowserWindow({icon:path.join(__dirname,'assets','k4-wheel.ico'),...opts,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',e=>e.preventDefault());
 win.webContents.on('will-prevent-unload',event=>{const choice=dialog.showMessageBoxSync(win,{type:'question',buttons:['Continuar editando','Descartar alterações'],defaultId:0,cancelId:0,message:'Há alterações não salvas.'});if(choice===1)event.preventDefault();});
 win.loadFile(path.join(__dirname,page)); return win;
}
function showWheel() {
 clearTimeout(hideTimer);closingWheel=false;
 const area=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
 const sizes={large:700,medium:580,small:480,compact:380};
 const size=Math.min(sizes[config.wheelSize || 'large'],area.width,area.height);
 wheel.setBounds({width:size,height:size,x:Math.round(area.x+(area.width-size)/2),y:Math.round(area.y+(area.height-size)/2)});
 wheel.setAlwaysOnTop(true,'screen-saver');wheel.show();wheel.focus();wheel.webContents.send('config-changed',config);
 wheel.webContents.send('wheel-visibility',true);
 outsideClick.start(point=>{if(wheel&&!wheel.isDestroyed()&&wheel.isVisible()&&outsideClick.isOutside(screen.screenToDipPoint(point),wheel.getBounds()))hideWheel();});
}
function hideWheel(){
 if(!wheel||wheel.isDestroyed()||!wheel.isVisible()||closingWheel)return;
 closingWheel=true;wheel.webContents.send('wheel-visibility',false);
 outsideClick.stop();
 hideTimer=setTimeout(()=>{if(wheel&&!wheel.isDestroyed())wheel.hide();closingWheel=false;},310);
}
function toggle(){wheel.isVisible()&&!closingWheel?hideWheel():showWheel();}
function openSettings(){hideWheel();if(settings&&!settings.isDestroyed()){settings.show();settings.focus();return;} settings=makeWindow('settings.html',{width:1060,height:800,minWidth:760,minHeight:600,backgroundColor:'#0b101b',title:'Roda de ultilidade · Configurações',autoHideMenuBar:true});settings.on('closed',()=>{endHotkeyCapture().catch(err=>dialog.showErrorBox('Atalho indisponível',err.message));});}
async function register(key){try{if(key==='MouseMiddle'){await middleMouse.start(()=>{if(!app.quitting)toggle();});return true;}return globalShortcut.register(key,toggle);}catch{return false;}}
async function unregister(key){if(key==='MouseMiddle')await middleMouse.stop();else globalShortcut.unregister(key);}
async function endHotkeyCapture(){
 if(!hotkeyCapture)return;
 clearTimeout(hotkeyCaptureTimer);hotkeyCapture=false;
 if(!app.quitting&&!await register(config.hotkey))throw Error('Não foi possível reativar o atalho anterior. Escolha outro nas configurações.');
}
function trusted(event){return [wheel,settings].some(w=>w&&!w.isDestroyed()&&event.sender===w.webContents&&event.senderFrame===w.webContents.mainFrame&&event.senderFrame.url===pathToFileURL(path.join(__dirname,w===wheel?'wheel.html':'settings.html')).href);}
function handle(name,fn){ipcMain.handle(name,async(e,...args)=>{if(!trusted(e))throw Error('Origem inválida.');try{return {ok:true,value:await fn(e,...args)};}catch(err){if(name==='launch'||name==='launch-steam'&&e.sender===wheel.webContents)showWheel();return {ok:false,error:err.message};}});}
app.whenReady().then(async()=>{
 file=path.join(app.getPath('userData'),'config.json');
 try{config=fs.existsSync(file)?validate(JSON.parse(fs.readFileSync(file,'utf8'))):defaults();}catch(err){dialog.showErrorBox('Configuração não carregada',`O arquivo original foi preservado em ${file}.\n${err.message}\nPadrão carregado apenas na memória.`);config=defaults();}
 session.defaultSession.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
 wheel=makeWindow('wheel.html',{width:700,height:700,show:false,frame:false,transparent:true,resizable:false,skipTaskbar:true,alwaysOnTop:true,hasShadow:false});
 wheel.on('blur',hideWheel);
 wheel.on('close',e=>{if(!app.quitting){e.preventDefault();hideWheel();}});
 const icon=nativeImage.createFromPath(path.join(__dirname,'assets','k4-wheel.ico'));
 if(icon.isEmpty())throw Error('Ícone da bandeja não encontrado. Reinstale o Roda de ultilidade.');
 tray=new Tray(icon);tray.setToolTip('Roda de ultilidade');tray.setContextMenu(Menu.buildFromTemplate([{label:'Abrir roda',click:showWheel},{label:'Configurações',click:openSettings},{type:'separator'},{label:'Sair',click:()=>app.quit()}]));tray.on('click',toggle);
 handle('get-config',()=>({...config,startWithWindows:startup.get()}));
 handle('hide',hideWheel);
 handle('settings',()=>openSettings());
 handle('begin-hotkey-capture',async e=>{
  if(e.sender!==settings?.webContents)throw Error('Abra as configurações para mudar o atalho.');
  if(hotkeyCapture)return;
  hotkeyCapture=true;await unregister(config.hotkey);
  hotkeyCaptureTimer=setTimeout(()=>{endHotkeyCapture().catch(err=>dialog.showErrorBox('Atalho indisponível',err.message));},60000);
 });
 handle('end-hotkey-capture',async e=>{if(e.sender!==settings?.webContents)throw Error('Origem inválida.');await endHotkeyCapture();});
 handle('get-steam',()=>getSteam());
 handle('refresh-steam',()=>getSteam(true));
 handle('launch-steam',async(_e,id)=>{hideWheel();const root=await detectSteamRoot(config.steamPath || '');await launchSteamGame(root,id);});
 handle('save-config',async(e,input)=>{
  if(e.sender!==settings?.webContents)throw Error('Abra as configurações para editar.');
  if(hotkeyCapture)throw Error('Conclua ou cancele a captura antes de salvar.');
  const clean=validate(input),old=config.hotkey;
  const oldStartup=startup.get();
  const newStartup=input.startWithWindows===undefined?oldStartup:input.startWithWindows;
  if(typeof newStartup!=='boolean')throw Error('Opção de inicialização inválida.');
  if(clean.steamPath && clean.steamPath!==config.steamPath && !await detectSteamRoot(clean.steamPath))throw Error('Escolha a pasta que contém steam.exe.');
  if(clean.hotkey!==old&&!await register(clean.hotkey))throw Error('Atalho ocupado ou inválido. O anterior foi mantido.');
  try{if(newStartup!==oldStartup)startup.set(newStartup);save(file,clean);}catch(err){if(clean.hotkey!==old)await unregister(clean.hotkey);if(startup.get()!==oldStartup)startup.set(oldStartup);throw err;}
  if(clean.hotkey!==old)await unregister(old);
  if(clean.steamPath!==config.steamPath)lastSteamScan=0;
  config=clean;wheel.webContents.send('config-changed',config);return config;
 });
 handle('pick',async(e,type)=>{if(e.sender!==settings?.webContents)throw Error('Origem inválida.');const r=await dialog.showOpenDialog(settings,{properties:[type==='folder'?'openDirectory':'openFile'],...(type==='folder'?{}:{filters:[{name:'Programas Windows',extensions:['exe']}]})});return r.canceled?null:r.filePaths[0];});
 handle('launch',async(e,id)=>{
  if(e.sender!==wheel.webContents)throw Error('Origem inválida.');
  const item=config.categories.flatMap(c=>c.items).find(i=>i.id===id);if(!item)throw Error('Atalho não encontrado.');validate(config);hideWheel();
  if(item.type==='url'){await shell.openExternal(item.target);return;}
  const stat=await fs.promises.stat(item.target);
  if(item.type==='folder'){if(!stat.isDirectory())throw Error('Escolha uma pasta.');const err=await shell.openPath(item.target);if(err)throw Error(err);return;}
  if(!stat.isFile())throw Error('Programa não encontrado.');
  const interpreters=['cmd.exe','powershell.exe','pwsh.exe','wscript.exe','cscript.exe','mshta.exe'];
  if(item.type==='command'||interpreters.includes(path.basename(item.target).toLowerCase())){
    const result=await dialog.showMessageBox({type:'warning',buttons:['Cancelar','Executar'],defaultId:0,cancelId:0,title:'Executar comando?',message:item.name,detail:JSON.stringify([item.target,...item.args])});if(result.response!==1)return;
  }
  await new Promise((resolve,reject)=>{const child=spawn(item.target,item.args,{cwd:item.type==='exe'?path.dirname(item.target):undefined,shell:false,detached:true,stdio:'ignore',windowsHide:false});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});
 });
 if(!await register(config.hotkey))dialog.showErrorBox('Atalho indisponível','Abra Configurações pela bandeja e escolha outra combinação.');
 await new Promise(r=>wheel.webContents.isLoading()?wheel.webContents.once('did-finish-load',r):r());if(!process.argv.includes('--startup'))showWheel();
 if(smoke){setTimeout(async()=>{try{const result=await wheel.webContents.executeJavaScript(`({segments:document.querySelectorAll('.category').length,bridge:!!window.k4,transparent:getComputedStyle(document.body).backgroundColor})`);await wheel.capturePage().then(i=>fs.writeFileSync(path.join(app.getPath('temp'),'k4-wheel-smoke.png'),i.toPNG()));fs.writeFileSync(path.join(app.getPath('temp'),'k4-wheel-smoke.json'),JSON.stringify(result));}finally{app.quit();}},1800);}
});
app.on('before-quit',()=>{app.quitting=true;globalShortcut.unregisterAll();middleMouse.stop();});
app.on('window-all-closed',()=>{});
}

