const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('k4',{
 call:async(name,...args)=>{if(!['get-config','hide','settings','save-config','pick','launch','get-steam','refresh-steam','launch-steam','begin-hotkey-capture','end-hotkey-capture'].includes(name))throw Error('Operação inválida.');const r=await ipcRenderer.invoke(name,...args);if(!r.ok)throw Error(r.error);return r.value;},
 onConfig:fn=>ipcRenderer.on('config-changed',(_e,c)=>fn(c)),
 onVisibility:fn=>ipcRenderer.on('wheel-visibility',(_e,visible)=>fn(visible))
});
