const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {EventEmitter}=require('node:events');
const {parseVdf,scanSteam,detectSteamRoot,launchSteamGame}=require('../src/steam');
const {defaults,validate}=require('../src/config');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'k4-steam-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const root=path.join(dir,'Steam com espaço'),other=path.join(dir,'Outra biblioteca');
 for(const folder of [root,other])fs.mkdirSync(path.join(folder,'steamapps','common'),{recursive:true});
 fs.writeFileSync(path.join(root,'steam.exe'),'test fixture');
 fs.writeFileSync(path.join(root,'steamapps','libraryfolders.vdf'),'"libraryfolders" { "0" { "path" '+JSON.stringify(root)+' } "1" { "path" '+JSON.stringify(other)+' } "2" '+JSON.stringify(path.join(dir,'Disco ausente'))+' }');
 function game(library,id,name,flags=4,install='Game '+id){
  fs.mkdirSync(path.join(library,'steamapps','common',install),{recursive:true});
  fs.writeFileSync(path.join(library,'steamapps','appmanifest_'+id+'.acf'),'"AppState" { "appid" "'+id+'" "name" '+JSON.stringify(name)+' "StateFlags" "'+flags+'" "installdir" '+JSON.stringify(install)+' }');
 }
 return {dir,root,other,game};
}
test('VDF lê BOM, comentários, escapes, chaves literais e caminhos',()=>{
 const data=parseVdf('\uFEFF// comentário\n"libraryfolders" { "0" { "path" "C:\\\\Steam Library" "name" "Jogo \\"A\\"" } "__proto__" "seguro" }');
 assert.equal(data.libraryfolders['0'].path,'C:\\Steam Library');
 assert.equal(data.libraryfolders['0'].name,'Jogo "A"');
 assert.equal(Object.getPrototypeOf(data.libraryfolders),null);
 assert.equal(data.libraryfolders.__proto__,'seguro');
 assert.throws(()=>parseVdf('"x" { "a" "b"'));
 assert.throws(()=>parseVdf('"x" "incompleto'));
});
test('detecta todas as bibliotecas, remove duplicados e ignora incompletos/corrompidos',async t=>{
 const f=fixture(t);f.game(f.root,'100','Zelda');f.game(f.other,'200','Ação com espaços');f.game(f.other,'100','Zelda');f.game(f.root,'300','Baixando',1024);f.game(f.root,'228980','Steamworks Shared');
 fs.writeFileSync(path.join(f.root,'steamapps','appmanifest_400.acf'),'arquivo inválido');
 const result=await scanSteam(f.root);
 assert.deepEqual(result.games.map(g=>g.id),['200','100']);
 assert.equal(result.libraries.length,2);assert.ok(result.warnings.some(w=>w.includes('Disco ausente')));assert.ok(result.warnings.some(w=>w.includes('appmanifest_400')));
 assert.equal(await detectSteamRoot(f.root),f.root);assert.equal(await detectSteamRoot(f.dir),null);
});
test('não inclui pasta removida nem installdir que saia de common',async t=>{
 const f=fixture(t);f.game(f.root,'100','Removido');fs.rmSync(path.join(f.root,'steamapps','common','Game 100'),{recursive:true});
 f.game(f.root,'200','Traversal',4,'../escape');assert.equal((await scanSteam(f.root)).games.length,0);
});
test('ausência da Steam retorna estado vazio e explicação',async()=>{const r=await scanSteam(null);assert.equal(r.games.length,0);assert.match(r.warnings[0],/não encontrada/);});
test('abertura aceita somente jogo local e constrói argumentos sem shell',async t=>{
 const f=fixture(t);f.game(f.root,'100','Meu jogo');let invocation,unref=false;
 await launchSteamGame(f.root,'100',(...args)=>{invocation=args;const child=new EventEmitter();child.unref=()=>{unref=true;};process.nextTick(()=>child.emit('spawn'));return child;});
 assert.equal(invocation[0],path.join(f.root,'steam.exe'));assert.deepEqual(invocation[1],['-applaunch','100']);assert.equal(invocation[2].shell,false);assert.equal(unref,true);
 for(const id of ['100 & calc.exe','steam://run/100','0','999',100])await assert.rejects(()=>launchSteamGame(f.root,id));
 fs.rmSync(path.join(f.root,'steamapps','common','Game 100'),{recursive:true});await assert.rejects(()=>launchSteamGame(f.root,'100'),/não está mais instalado/);
});
test('erro ao criar processo é devolvido',async t=>{const f=fixture(t);f.game(f.root,'100','Jogo');await assert.rejects(()=>launchSteamGame(f.root,'100',()=>{const child=new EventEmitter();process.nextTick(()=>child.emit('error',Error('bloqueado')));return child;}),/bloqueado/);});
test('configuração anterior continua válida e caminho Steam relativo é rejeitado',()=>{const c=defaults();delete c.steamPath;assert.ok(validate(c));c.steamPath='relativo';assert.throws(()=>validate(c));});
