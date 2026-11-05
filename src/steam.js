const fs = require('node:fs/promises');
const path = require('node:path');
const {execFile, spawn} = require('node:child_process');
const {promisify} = require('node:util');
const execFileAsync = promisify(execFile);

// Valve KeyValues text, without evaluating file contents or using object prototypes.
function parseVdf(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    if (/\s|\uFEFF/.test(text[i])) { i++; continue; }
    if (text.slice(i, i + 2) === '//') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if ('{}'.includes(text[i])) { tokens.push({kind:text[i++]}); continue; }
    let value = '';
    if (text[i] === '"') {
      i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\' && ['\\','"'].includes(text[i+1])) i++;
        value += text[i++];
      }
      if (text[i++] !== '"') throw Error('Texto VDF incompleto.');
    } else {
      while (i < text.length && !/[\s{}]/.test(text[i])) value += text[i++];
    }
    tokens.push({kind:'text', value});
  }
  let cursor = 0;
  function object(nested = false, depth = 0) {
    if (depth > 20) throw Error('VDF muito profundo.');
    const result = Object.create(null);
    while (cursor < tokens.length) {
      const key = tokens[cursor++];
      if (key.kind === '}' && nested) return result;
      if (key.kind !== 'text') throw Error('Chave VDF inválida.');
      const value = tokens[cursor++];
      if (value?.kind === '{') result[key.value] = object(true, depth + 1);
      else if (value?.kind === 'text') result[key.value] = value.value;
      else throw Error('Valor VDF inválido.');
    }
    if (nested) throw Error('Bloco VDF incompleto.');
    return result;
  }
  return object();
}
async function readVdf(file) {
  if ((await fs.stat(file)).size > 4 * 1024 * 1024) throw Error('Arquivo Steam muito grande.');
  return parseVdf(await fs.readFile(file,'utf8'));
}
async function isDirectory(file) { try { return (await fs.stat(file)).isDirectory(); } catch { return false; } }
async function isFile(file) { try { return (await fs.stat(file)).isFile(); } catch { return false; } }
async function detectSteamRoot(manual = '') {
  if (manual) return await isFile(path.join(manual,'steam.exe')) ? manual : null;
  const candidates = [];
  if (process.platform === 'win32') {
    const reg = path.join(process.env.WINDIR || 'C:\\Windows','System32','reg.exe');
    const queries = [ ['HKCU\\Software\\Valve\\Steam','SteamPath'], ['HKLM\\SOFTWARE\\Valve\\Steam','InstallPath'] ];
    for (const [key,value] of queries) {
      try {
        const {stdout} = await execFileAsync(reg,['query',key,'/v',value],{windowsHide:true,timeout:3000});
        const found = stdout.match(/REG_SZ\s+([^\r\n]+)/i);
        if(found) candidates.push(found[1].trim());
      } catch { /* Steam may not be registered in this hive. */ }
    }
  }
  for(const folder of [process.env['ProgramFiles(x86)'],process.env.ProgramFiles,'C:\\Program Files (x86)']) if(folder)candidates.push(path.join(folder,'Steam'));
  for(const root of candidates) if(await isFile(path.join(root,'steam.exe')))return path.normalize(root);
  return null;
}
async function scanSteam(root) {
  const result = {root:root || '', games:[], libraries:[], warnings:[]};
  if(!root) {result.warnings.push('Steam não encontrada. Selecione a pasta da Steam nas configurações.');return result;}
  const libraries = new Map();
  const addLibrary = folder => {const normalized=path.resolve(folder);libraries.set(process.platform==='win32'?normalized.toLowerCase():normalized,normalized);};
  addLibrary(root);
  try {
    const folders = (await readVdf(path.join(root,'steamapps','libraryfolders.vdf'))).libraryfolders;
    for(const [key,value] of Object.entries(folders || {})) {
      const folder = typeof value === 'string' ? value : value?.path;
      if(/^\d+$/.test(key) && typeof folder === 'string' && path.isAbsolute(folder)) addLibrary(folder);
    }
  } catch (err) { if(err.code !== 'ENOENT')result.warnings.push('Não foi possível ler a lista de bibliotecas Steam.'); }
  const games = new Map();
  for(const library of libraries.values()) {
    const steamapps = path.join(library,'steamapps');
    let entries;
    try {entries = await fs.readdir(steamapps);}catch {result.warnings.push(`Biblioteca indisponível: ${library}`);continue;}
    result.libraries.push(library);
    for(const entry of entries.filter(f=>/^appmanifest_\d+\.acf$/i.test(f))) {
      try {
        const state = (await readVdf(path.join(steamapps,entry))).AppState;
        if(!state || typeof state !== 'object')throw Error('AppState ausente.');
        const id = state?.appid;
        if(!/^\d{1,10}$/.test(id || '') || Number(id)<1 || entry.toLowerCase() !== `appmanifest_${id}.acf`) continue;
        if(!Number.isSafeInteger(Number(state.StateFlags)) || !(Number(state.StateFlags) & 4)) continue;
        if(typeof state.name !== 'string' || !state.name.trim() || typeof state.installdir !== 'string' || !state.installdir.trim())continue;
        const common = path.resolve(steamapps,'common'),installPath = path.resolve(common,state.installdir);
        const relative = path.relative(common,installPath);
        if(!relative || relative.startsWith('..') || path.isAbsolute(relative) || !await isDirectory(installPath))continue;
        if(id === '228980') continue; // Steamworks Common Redistributables is not a launchable game.
        games.set(id,{id,name:state.name.trim().slice(0,200),installPath,library});
      } catch {result.warnings.push(`Manifesto ignorado: ${entry}`);}
    }
  }
  result.games = [...games.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  return result;
}
async function launchSteamGame(root, id, spawnProgram = spawn) {
  if(typeof id !== 'string' || !/^[1-9]\d{0,9}$/.test(id))throw Error('Jogo Steam inválido.');
  if(!root || !await isFile(path.join(root,'steam.exe')))throw Error('Cliente Steam não encontrado. Atualize a biblioteca.');
  const installed = await scanSteam(root);
  if(!installed.games.some(game=>game.id === id))throw Error('Este jogo não está mais instalado. Atualize a biblioteca Steam.');
  await new Promise((resolve,reject)=>{
    const child = spawnProgram(path.join(root,'steam.exe'),['-applaunch',id],{shell:false,detached:true,stdio:'ignore',windowsHide:true});
    child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});
  });
}
module.exports = {parseVdf,detectSteamRoot,scanSteam,launchSteamGame};
