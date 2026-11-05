let steamSettings={games:[],libraries:[],warnings:[]},steamSettingsBusy=false;
function renderSteamSettings(){
 const term=$('#steam-search').value.toLocaleLowerCase('pt-BR');
 const games=steamSettings.games.filter(g=>g.name.toLocaleLowerCase('pt-BR').includes(term));
 $('#steam-root').textContent='Pasta: '+(config.steamPath||steamSettings.root||'não encontrada (detecção automática)');
 $('#steam-summary').textContent=games.length+' de '+steamSettings.games.length+' jogos · '+steamSettings.libraries.length+' bibliotecas acessíveis';
 $('#steam-games').replaceChildren();
 if(!games.length)node('div',{className:'empty',textContent:term?'Nenhum jogo corresponde à busca.':'Nenhum jogo instalado detectado. Se necessário, selecione a pasta que contém steam.exe e salve.'},$('#steam-games'));
 for(const game of games){
  const row=node('div',{className:'steam-game'},$('#steam-games'));
  const detail=node('div',{},row);node('strong',{textContent:game.name},detail);node('small',{textContent:game.installPath,title:game.installPath},detail);
  const play=node('button',{textContent:'Jogar',className:'primary'},row);play.dataset.appid=game.id;
  play.onclick=async()=>{play.disabled=true;try{await window.k4.call('launch-steam',game.id);status('Abertura solicitada à Steam: '+game.name);}catch(e){status(e.message,true);}finally{play.disabled=false;}};
 }
 $('#steam-warnings').textContent=steamSettings.warnings.join('\n');
}
async function loadSteamSettings(force=false){
 if(steamSettingsBusy)return;steamSettingsBusy=true;$('#refresh-steam').disabled=true;$('#steam-summary').textContent='Lendo bibliotecas Steam…';
 try{steamSettings=await window.k4.call(force?'refresh-steam':'get-steam');renderSteamSettings();}catch(e){status(e.message,true);}finally{steamSettingsBusy=false;$('#refresh-steam').disabled=false;}
}
$('#steam-search').oninput=renderSteamSettings;
$('#refresh-steam').onclick=()=>loadSteamSettings(true);
$('#steam-folder').onclick=async()=>{try{const folder=await window.k4.call('pick','folder');if(folder){config.steamPath=folder;changed();$('#steam-root').textContent='Pasta escolhida: '+folder+' · Salve para aplicar.';}}catch(e){status(e.message,true);}};
$('#steam-auto').onclick=()=>{config.steamPath='';changed();$('#steam-root').textContent='Detecção automática · Salve para aplicar.';};
