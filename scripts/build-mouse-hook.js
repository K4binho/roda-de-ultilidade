const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
if(process.platform!=='win32')throw Error('O suporte ao botão do scroll é compilado no Windows.');
const windows=process.env.WINDIR||'C:\\Windows';
const compiler=['Framework64','Framework'].map(folder=>path.join(windows,'Microsoft.NET',folder,'v4.0.30319','csc.exe')).find(file=>fs.existsSync(file));
if(!compiler)throw Error('Compilador .NET Framework não encontrado no Windows.');
const folder=path.join(__dirname,'..','src','native');
const result=spawnSync(compiler,['/nologo','/optimize+','/target:exe','/platform:anycpu','/out:'+path.join(folder,'K4MouseHook.exe'),path.join(folder,'MouseHook.cs')],{windowsHide:true,stdio:'inherit',shell:false});
if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
