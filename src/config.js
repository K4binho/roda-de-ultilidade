const fs = require('node:fs');
const path = require('node:path');
const {normalize:normalizeHotkey}=require('./hotkey');
const colors = ['#48a8ff','#bd7aff','#ff718d','#ffb85c','#e4dc63','#58dca1'];
function defaults() {
  return {version:1, hotkey:'Ctrl+Alt+Space', steamPath:'', wheelSize:'large', categories:[
    {id:'apps',name:'Aplicativos',color:colors[0],items:[{id:'notepad',name:'Bloco de notas',type:'exe',target:path.join(process.env.WINDIR || 'C:\\Windows','System32','notepad.exe'),args:[]}]},
    {id:'folders',name:'Pastas',color:colors[1],items:[{id:'home',name:'Minha pasta',type:'folder',target:require('node:os').homedir(),args:[]}]},
    {id:'web',name:'Internet',color:colors[2],items:[{id:'search',name:'Pesquisar',type:'url',target:'https://www.google.com',args:[]}]},
    {id:'tools',name:'Ferramentas',color:colors[5],items:[]}
  ]};
}
function validate(c) {
  if(!c || c.version!==1)throw Error('Configuração inválida.');
  const hotkey=normalizeHotkey(c.hotkey);
  if (!Array.isArray(c.categories) || c.categories.length < 1 || c.categories.length > 10) throw Error('Use de 1 a 10 categorias.');
  if(c.wheelSize!==undefined && !['large','medium','small','compact'].includes(c.wheelSize))throw Error('Tamanho da roda inválido.');
  if(c.steamPath !== undefined && (typeof c.steamPath !== 'string' || c.steamPath.length>4096 || c.steamPath.includes('\0') || (c.steamPath && !path.isAbsolute(c.steamPath))))throw Error('Pasta Steam inválida.');
  const ids = new Set();
  function label(x) {if(typeof x !== 'string' || !x.trim() || x.length > 40) throw Error('Nomes devem ter de 1 a 40 caracteres.');}
  function id(x) {if(typeof x !== 'string' || !x || x.length>100 || ids.has(x)) throw Error('Identificadores inválidos ou duplicados.'); ids.add(x);}
  for(const cat of c.categories) {
    id(cat.id); label(cat.name);
    if(!/^#[0-9a-f]{6}$/i.test(cat.color) || !Array.isArray(cat.items) || cat.items.length>12) throw Error('Cor inválida ou mais de 12 atalhos por categoria.');
    for(const item of cat.items) {
      id(item.id); label(item.name);
      if(!['exe','folder','url','command'].includes(item.type) || typeof item.target !== 'string' || !item.target.trim() || item.target.length>4096 || item.target.includes('\0')) throw Error('Destino inválido.');
      if(!Array.isArray(item.args) || item.args.length>50 || item.args.some(a=>typeof a!=='string'||a.length>4096||a.includes('\0'))) throw Error('Argumentos devem ser uma lista de textos.');
      if(item.type==='url') {const u=new URL(item.target); if(!['https:','http:'].includes(u.protocol)||u.username||u.password) throw Error('Use URL HTTP ou HTTPS sem credenciais.');}
      else if(!path.isAbsolute(item.target)) throw Error('Escolha um caminho absoluto.');
      if(['exe','command'].includes(item.type) && path.extname(item.target).toLowerCase()!=='.exe') throw Error('Programas precisam ser arquivos .exe.');
    }
  }
  return {...JSON.parse(JSON.stringify(c)),hotkey};
}
function save(file,c) {const clean=validate(c); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file+'.tmp',JSON.stringify(clean,null,2),'utf8'); fs.renameSync(file+'.tmp',file); return clean;}
module.exports={defaults,validate,save};
