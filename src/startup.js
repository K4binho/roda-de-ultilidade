function createStartup(app,env=process.env,executable=process.execPath){
 const options={name:'K4 Wheel',path:env.PORTABLE_EXECUTABLE_FILE||executable,args:['--startup']};
 return {
  get(){if(!app.isPackaged)return false;const state=app.getLoginItemSettings(options);return Array.isArray(state.launchItems)?state.launchItems.some(item=>item.name===options.name&&item.scope==='user'&&item.enabled):state.openAtLogin===true;},
  set(enabled){
   if(typeof enabled!=='boolean')throw Error('Opção de inicialização inválida.');
   if(!app.isPackaged){if(enabled)throw Error('Use o EXE instalado ou portátil para iniciar com o Windows.');return;}
   app.setLoginItemSettings({...options,openAtLogin:enabled});
   if(this.get()!==enabled)throw Error('O Windows não confirmou a alteração da inicialização.');
  }
 };
}
module.exports={createStartup};
