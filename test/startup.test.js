const {test}=require('node:test'),assert=require('node:assert/strict');
const {createStartup}=require('../src/startup');
test('Windows informa entrada habilitada mesmo com openAtLogin falso',()=>{
 const app={isPackaged:true,getLoginItemSettings:()=>({openAtLogin:false,launchItems:[{name:'K4 Wheel',scope:'user',enabled:true,args:[]}]})};
 assert.equal(createStartup(app).get(),true);
 app.getLoginItemSettings=()=>({launchItems:[{name:'Outro app',scope:'user',enabled:true}]});assert.equal(createStartup(app).get(),false);
});
test('inicializacao usa EXE portatil original e permite ativar e desativar',()=>{
 let state=false,last;const app={isPackaged:true,getLoginItemSettings:()=>({openAtLogin:state}),setLoginItemSettings:o=>{last=o;state=o.openAtLogin;}};
 const service=createStartup(app,{PORTABLE_EXECUTABLE_FILE:'E:\\Meus Apps\\K4.exe'},'C:\\Temp\\K4.exe');
 assert.equal(service.get(),false);service.set(true);assert.equal(service.get(),true);assert.equal(last.path,'E:\\Meus Apps\\K4.exe');assert.deepEqual(last.args,['--startup']);service.set(false);assert.equal(service.get(),false);assert.throws(()=>service.set('true'));
});
test('instalado usa seu proprio caminho; modo desenvolvimento nao registra',()=>{
 let last;const app={isPackaged:true,getLoginItemSettings:()=>({openAtLogin:true}),setLoginItemSettings:o=>last=o};
 createStartup(app,{},'C:\\Apps\\K4.exe').set(true);assert.equal(last.path,'C:\\Apps\\K4.exe');
 const dev=createStartup({isPackaged:false});assert.equal(dev.get(),false);assert.throws(()=>dev.set(true));dev.set(false);
});
