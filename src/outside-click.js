const {spawn}=require('node:child_process');
const path=require('node:path');
let child;
function isOutside(point,bounds){return point.x<bounds.x||point.y<bounds.y||point.x>=bounds.x+bounds.width||point.y>=bounds.y+bounds.height;}
function stop(){const current=child;child=null;if(current)current.kill();}
function start(onClick){
 if(child||process.platform!=='win32')return;
 const exe=path.join(__dirname,'native','K4MouseHook.exe').replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
 const current=spawn(exe,['--outside'],{windowsHide:true,shell:false,stdio:['pipe','pipe','ignore']});child=current;
 let buffer='';current.stdout.setEncoding('utf8');
 current.stdout.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);const m=/^click:(-?\d+):(-?\d+)$/.exec(line);if(m&&child===current)onClick({x:Number(m[1]),y:Number(m[2])});}});
 current.on('error',()=>{if(child===current)child=null;});
 current.on('exit',()=>{if(child===current)child=null;});
}
module.exports={start,stop,isOutside};
