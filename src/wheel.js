const svg=document.querySelector('svg'),NS='http://www.w3.org/2000/svg';
const STEAM='__steam__',PAGE_SIZE=8;
const ITEM_COLORS=['#48a8ff','#bd7aff','#ff718d','#ffb85c','#e4dc63','#58dca1','#60dfed','#f589e9','#a4bdff','#ed8b67','#b1e365','#7c9dff'];
let config,active,steam={games:[],warnings:[]},steamLoaded=false,page=0,renderVersion=0;
let hoverTimer,visibilityVersion=0;
const toolbar=document.createElement('div');toolbar.id='steam-controls';toolbar.hidden=true;
const previous=document.createElement('button');previous.textContent='‹';previous.title='Página anterior';
const pageLabel=document.createElement('span');pageLabel.setAttribute('aria-live','polite');
const next=document.createElement('button');next.textContent='›';next.title='Próxima página';
const refresh=document.createElement('button');refresh.textContent='↻';refresh.title='Atualizar jogos Steam';
toolbar.append(previous,pageLabel,next,refresh);document.querySelector('main').append(toolbar);
previous.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};refresh.onclick=()=>loadSteam(true);
function point(r,a){return [350+r*Math.cos(a),350+r*Math.sin(a)];}
function sector(inner,outer,start,end){const p=point(outer,start),q=point(outer,end),r=point(inner,end),s=point(inner,start);return 'M '+p+' A '+outer+' '+outer+' 0 '+(end-start>Math.PI?1:0)+' 1 '+q+' L '+r+' A '+inner+' '+inner+' 0 '+(end-start>Math.PI?1:0)+' 0 '+s+' Z';}
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;}
function centerLabel(name,color='#66c0f4'){const label=document.querySelector('#center strong');label.textContent=name;label.style.color=color;label.title=name;}
function resetCenter(){const cat=config?.categories.find(c=>c.id===active);centerLabel(active===STEAM?'Steam':cat?.name||'Escolha uma categoria',active===STEAM?'#66c0f4':cat?.color);}
function segment(data,i,n,inner,outer,cls,action){
 const step=Math.PI*2/n,start=-Math.PI/2+i*step+.018,end=start+step-.036,mid=(start+end)/2;
 const g=el('g',{class:cls,tabindex:0,role:'button','aria-label':data.name},svg);
 if(cls==='item')g.style.animationDelay=(i*8)+'ms';
 g.style.setProperty('--color',data.color);g.style.setProperty('--tint',data.color+'38');el('title',{},g).textContent=data.name;
 el('path',{d:sector(inner,outer,start,end)},g);
 const radius=(inner+outer)/2,half=Math.min((end-start)*.43,Math.PI*.46),reverse=Math.sin(mid)>0;
 const from=point(radius,mid+(reverse?half:-half)),to=point(radius,mid+(reverse?-half:half));
 const guide=el('path',{id:'label-'+renderVersion+'-'+(cls==='item'?'item':'cat')+'-'+i,d:'M '+from+' A '+radius+' '+radius+' 0 0 '+(reverse?0:1)+' '+to,class:'label-guide'},svg.querySelector('defs'));
 const text=el('text',{class:'arc-label'},g);
 const fontSize=(cls==='item'?13:14)*Math.min(1.45,700/window.innerWidth);text.style.fontSize=fontSize+'px';
 const label=el('textPath',{href:'#'+guide.id,startOffset:'50%'},text);label.textContent=data.name;
 const available=radius*half*2*.91;
 let shortened=data.name;
 while(text.getComputedTextLength()>available && shortened.length>1){shortened=shortened.slice(0,-1);label.textContent=shortened.trimEnd()+'…';}
 g.onclick=action;g.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();action();}};
 g.onmouseenter=()=>{centerLabel(data.name,data.color);if(cls.startsWith('category')&&active!==data.id){clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(active!==data.id)action();},140);}};
 g.onfocus=()=>centerLabel(data.name,data.color);g.onmouseleave=()=>{clearTimeout(hoverTimer);resetCenter();};g.onblur=resetCenter;
}
function error(err){document.querySelector('#status').textContent=err.message;}
async function loadSteam(force=false){
 refresh.disabled=true;
 try{const nextSteam=await window.k4.call(force?'refresh-steam':'get-steam');const changed=!steamLoaded||JSON.stringify(nextSteam.games)!==JSON.stringify(steam.games);steam=nextSteam;steamLoaded=true;if(changed)render();}
 catch(err){error(err);}finally{refresh.disabled=false;}
}
function render(){
 if(!config)return;
 resetCenter();
 svg.replaceChildren();renderVersion++;el('defs',{},svg);document.querySelector('#hotkey').textContent=config.hotkey==='MouseMiddle'?'Scroll':config.hotkey;
 const categories=[...config.categories,{id:STEAM,name:'Steam',color:'#66c0f4',items:steam.games}];
 const cat=categories.find(c=>c.id===active),isSteam=active===STEAM;
 toolbar.hidden=!isSteam;document.querySelector('.hint').hidden=isSteam;
 categories.forEach((c,i)=>segment(c,i,categories.length,91,197,'category'+(c===cat?' selected':''),()=>{active=c.id;page=0;document.querySelector('#status').textContent='';render();if(c.id===STEAM)loadSteam(true);}));
 if(cat){
  let items=cat.items;
  if(isSteam){
   const count=items.length,pages=Math.max(1,Math.ceil(count/PAGE_SIZE));page=Math.min(Math.max(0,page),pages-1);
   toolbar.hidden=pages<=1;previous.hidden=page===0;next.hidden=page===pages-1;pageLabel.hidden=pages<=1;
   previous.disabled=page===0;next.disabled=page===pages-1;pageLabel.textContent=(page+1)+'/'+pages+' · '+count+' jogos';
   items=items.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  }
  if(items.length)items.forEach((item,i)=>{
   const color=ITEM_COLORS[((isSteam?page*PAGE_SIZE:0)+i)%ITEM_COLORS.length];
   segment({...item,color},i,items.length,205,286,'item',()=>window.k4.call(isSteam?'launch-steam':'launch',item.id).catch(error));
   const start=-Math.PI/2+i*2*Math.PI/items.length;
   el('path',{d:sector(294,295,start+.018,start+2*Math.PI/items.length-.018),class:'outline',style:'stroke:'+color,'data-item-id':item.id},svg);
  });
  else el('text',{x:350,y:105,class:'empty'},svg).textContent=isSteam?(steamLoaded?(steam.root?'Nenhum jogo instalado encontrado':'Selecione a pasta Steam nas configurações'):'Lendo biblioteca Steam…'):'Categoria vazia · adicione atalhos nas configurações';
 }else el('text',{x:350,y:105,class:'empty'},svg).textContent='Escolha uma categoria';
}
window.k4.call('get-config').then(c=>{config=c;active=c.categories[0].id;render();}).catch(error);
window.k4.onConfig(c=>{config=c;if(active!==STEAM&&!c.categories.some(x=>x.id===active))active=c.categories[0].id;document.querySelector('#status').textContent='';render();if(active===STEAM)loadSteam(true);});
document.querySelector('#center').onclick=()=>{active=null;render();};document.querySelector('#settings').onclick=()=>window.k4.call('settings');document.onkeydown=e=>{if(e.key==='Escape')window.k4.call('hide');};
window.addEventListener('resize',render);
window.k4.onVisibility(visible=>{
 const version=++visibilityVersion;
 document.body.classList.toggle('is-closing',!visible);
 if(!visible){clearTimeout(hoverTimer);document.body.classList.remove('is-open');return;}
 requestAnimationFrame(()=>requestAnimationFrame(()=>{if(version===visibilityVersion)document.body.classList.add('is-open');}));
});
document.addEventListener('pointerdown',event=>{
 if(event.target.closest('button,#steam-controls,.item,.category'))return;
 const bounds=svg.getBoundingClientRect(),scale=Math.min(bounds.width,bounds.height)/700;
 const x=event.clientX-(bounds.left+bounds.width/2),y=event.clientY-(bounds.top+bounds.height/2);
 if(Math.hypot(x,y)>295*scale)window.k4.call('hide').catch(error);
});



