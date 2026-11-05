const path=require('node:path'),{spawn}=require('node:child_process');
let child,starting;
function start(onMiddle){
 if(starting)return starting;
 if(child)return Promise.resolve();
 if(process.platform!=='win32')return Promise.reject(Error('Botão do scroll disponível somente no Windows.'));
 const executable=path.join(__dirname,'native','K4MouseHook.exe').replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
 const processChild=spawn(executable,[],{windowsHide:true,shell:false,stdio:['pipe','pipe','ignore']});child=processChild;
 starting=new Promise((resolve,reject)=>{
  let buffer='',ready=false;
  const timer=setTimeout(()=>{processChild.kill();reject(Error('O botão do scroll não pôde ser ativado.'));},5000);
  processChild.once('error',error=>{clearTimeout(timer);if(child===processChild)child=null;reject(error);});
  processChild.once('exit',()=>{clearTimeout(timer);if(child===processChild)child=null;if(!ready)reject(Error('O suporte ao scroll foi encerrado antes de iniciar.'));});
  processChild.stdout.setEncoding('utf8');
  processChild.stdout.on('data',chunk=>{
   buffer+=chunk;let newline;
   while((newline=buffer.indexOf('\n'))!==-1){
    const line=buffer.slice(0,newline).trim();buffer=buffer.slice(newline+1);
    if(line==='ready'){ready=true;clearTimeout(timer);resolve();}
    else if(line==='middle'&&ready&&child===processChild)onMiddle();
    else if(line.startsWith('error:')){clearTimeout(timer);reject(Error('Falha ao ativar botão do scroll: '+line.slice(6)));}
   }
  });
 }).finally(()=>{starting=null;});
 return starting;
}
async function stop(){
 const current=child;child=null;if(!current)return;
 await new Promise(resolve=>{
  if(current.exitCode!==null)return resolve();
  const timer=setTimeout(()=>{current.kill();resolve();},700);
  current.once('exit',()=>{clearTimeout(timer);resolve();});
  current.stdin.on('error',()=>{});current.stdin.end('stop\n');
 });
}
module.exports={start,stop,isRunning:()=>!!child};
