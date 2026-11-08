const fs=require('node:fs');
const path=require('node:path');
const productName='Roda de ultilidade';
function resolveStartupPath(env,executable){
 const launched=path.resolve(env.PORTABLE_EXECUTABLE_FILE||executable);
 for(let directory=path.dirname(launched);path.dirname(directory)!==directory;directory=path.dirname(directory)){
  if(path.basename(directory).toLowerCase()==='dist'){
   const latest=path.join(directory,'current','win-unpacked',productName+'.exe');
   if(fs.existsSync(latest))return latest;
   break;
  }
 }
 return launched;
}
function createStartup(app,env=process.env,executable=process.execPath){
 const options={name:'K4 Wheel',path:resolveStartupPath(env,executable),args:['--startup']};
 return {
  get(){if(!app.isPackaged)return false;const state=app.getLoginItemSettings(options);return Array.isArray(state.launchItems)?state.launchItems.some(item=>item.name===options.name&&item.scope==='user'&&item.enabled):state.openAtLogin===true;},
  sync(){
   if(!app.isPackaged)return false;
   const state=app.getLoginItemSettings(options);
   const item=Array.isArray(state.launchItems)?state.launchItems.find(entry=>entry.name===options.name&&entry.scope==='user'&&entry.enabled):null;
   if(!item)return false;
   const samePath=typeof item.path==='string'&&path.resolve(item.path).toLowerCase()===path.resolve(options.path).toLowerCase();
   const sameArgs=Array.isArray(item.args)&&JSON.stringify(item.args)===JSON.stringify(options.args);
   if(samePath&&sameArgs)return false;
   app.setLoginItemSettings({...options,openAtLogin:true});
   return true;
  },
  set(enabled){
   if(typeof enabled!=='boolean')throw Error('Opção de inicialização inválida.');
   if(!app.isPackaged){if(enabled)throw Error('Use o EXE instalado ou portátil para iniciar com o Windows.');return;}
   app.setLoginItemSettings({...options,openAtLogin:enabled});
   if(this.get()!==enabled)throw Error('O Windows não confirmou a alteração da inicialização.');
  }
 };
}
module.exports={createStartup};
