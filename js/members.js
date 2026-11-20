const user=S.user||{email:'',plan:S.selected};
const plan=S.plans.find(p=>p.id===user.plan)||S.plans[0];
let f='all',q='',album=null,newOnly=false,ri=0,playing=false;
$('#si').innerHTML=ic('search');$('#planpill').innerHTML=ic('crown')+'Plano '+esc(plan.name);
const renew=new Date(Date.now()+42*864e5).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
const nNew=()=>S.media.filter(m=>m.isNew).length;
$('#app').innerHTML=`<section class="welcome"><div><p class="mut sm">Bem-vindo de volta</p><h1>${nNew()} novidades para você</h1><p class="mut sm">Sua assinatura renova em 42 dias · ${renew}</p></div><button class="btn white" id="news">${ic('play')} Ver novidades</button></section>
<div class="sec"><h2>${ic('video')} Reels</h2><span class="mut sm">${S.reels.length} vídeos liberados · role para ver o próximo</span></div><div class="reelwrap" id="reel"></div>
<div class="sec"><h2>Álbuns</h2></div><div class="albums" id="albums"></div>
<div class="sec" id="gridsec"><h2>Todas as mídias</h2><div class="chips">${[['all','Tudo'],['photo','Fotos'],['video','Vídeos'],['extra','Extras']].map(c=>`<button class="chip ${c[0]==='all'?'on':''}" data-f="${c[0]}">${c[1]}</button>`).join('')}</div></div>
<div id="active" class="chips" style="margin-bottom:12px"></div><div class="grid4" id="grid" style="padding-bottom:50px"></div>`;
function drawReel(){if(!S.reels.length){$('#reel').innerHTML='<p class="empty">Ainda não há vídeos publicados.</p>';return}const r=S.reels[ri],lk=!!S.liked[r.id],sv=!!S.saved[r.id],nc=(S.comments[r.id]||[]).length,nx=[1,2,3,4].map(k=>(ri+k)%S.reels.length);
 $('#reel').innerHTML=`<div class="reel g${ri%8} ${playing?'playing':''}" id="rv" role="button" tabindex="0" aria-label="Reproduzir ou pausar"><div class="bars">${S.reels.slice(0,6).map((_,i)=>`<i class="${i<=ri%6?'on':''}"></i>`).join('')}</div><span class="pbtn">${ic('play','pl')}${ic('pause','pa')}</span><i class="prog"></i>
 <div class="act"><button data-a="like" class="${lk?'on':''}" aria-label="Curtir">${ic('heart')}<span>${fmtK(r.likes+(lk?1:0))}</span></button><button data-a="cm" aria-label="Comentar">${ic('msg')}<span>${nc}</span></button><button data-a="sh" aria-label="Compartilhar">${ic('send')}</button><button data-a="sv" class="${sv?'on':''}" aria-label="Salvar">${ic('mark')}</button></div>
 <div class="cap"><b>Ayla's Club</b><p class="sm">${esc(r.title)}</p><p class="sm mut">${ic('music')} Áudio original · ${r.dur}</p></div></div>
 <div class="rnav"><button class="ib" data-n="-1" aria-label="Vídeo anterior">${ic('up')}</button><button class="ib" data-n="1" aria-label="Próximo vídeo">${ic('down')}</button></div>
 <div class="next"><span>Próximos</span><div>${nx.map(i=>`<i class="g${i%8}" data-go="${i}" title="${esc(S.reels[i].title)}"></i>`).join('')}</div></div>`}
function drawAlbums(){$('#albums').innerHTML=ALBUMS.map((a,i)=>`<button class="alb ${album===a?'on':''}" data-al="${esc(a)}"><div class="cv g${(i*2)%8}">${ic('folder')}</div><b>${a}</b><small class="mut sm">${S.media.filter(m=>m.album===a).length} mídias</small></button>`).join('')}
function drawGrid(){const it=S.media.filter(m=>(f==='all'||(f==='extra'?m.access==='extra':m.type===f))&&(!album||m.album===album)&&(!newOnly||m.isNew)&&(!q||(m.title+' '+m.album).toLowerCase().includes(q)));
 $$('[data-f]').forEach(c=>c.classList.toggle('on',c.dataset.f===f));
 $('#active').innerHTML=(album?`<button class="chip on" data-clr="album">Álbum: ${esc(album)} ✕</button>`:'')+(newOnly?`<button class="chip on" data-clr="new">Novidades ✕</button>`:'');
 $('#grid').innerHTML=it.length?it.map(m=>{const i=+m.id.slice(1),ex=m.access==='extra',un=!ex||S.unlocked[m.id];
  return `<div class="tile g${i%8} ${un?'':'dim'}" data-id="${m.id}" role="button" tabindex="0" aria-label="${esc(m.title)}">${m.isNew?'<span class="tag new">NOVO</span>':''}${un?'':`<span class="lock">${ic('lock')}<span class="gold" data-u="${m.id}">Desbloquear ${brl(m.price)}</span></span>`}<span class="ft">${ic(m.type==='video'?'play':'image')}${ex?'Extra':m.type==='video'?m.dur:'Foto'}</span></div>`}).join(''):`<p class="empty">Nenhuma mídia encontrada. Limpe a busca ou os filtros.</p>`}
function comments(){const r=S.reels[ri],l=S.comments[r.id]||[];const m=modal(`<h2>Comentários</h2><p class="mut sm">${esc(r.title)}</p><div id="cl">${l.length?l.map(c=>`<div class="row"><span><b>${esc(c.a)}</b><br>${esc(c.t)}</span></div>`).join(''):'<p class="empty">Seja o primeiro a comentar.</p>'}</div><form id="cf" style="display:flex;gap:8px;margin-top:12px"><input id="ct" required maxlength="200" placeholder="Escreva um comentário"><button class="btn sm">Enviar</button></form>`);
 $('#cf',m).onsubmit=e=>{e.preventDefault();(S.comments[r.id]=S.comments[r.id]||[]).push({a:'Você',t:$('#ct',m).value});save();closeModal();drawReel();comments()}}
document.addEventListener('click',e=>{const t=e.target;let el;
 if(el=t.closest('[data-u]')){e.stopPropagation();const m=S.media.find(x=>x.id===el.dataset.u);const md=modal(`<h2>Desbloquear extra</h2><p class="mut" style="margin:6px 0 14px">${esc(m.title)} · ${brl(m.price)}</p><p class="sm mut">O desbloqueio será ativado após a integração de pagamentos.</p><button class="btn full" id="ok" style="margin-top:14px">Continuar</button>`);$('#ok',md).onclick=()=>{toast('O desbloqueio será ativado após a integração de pagamentos.');}}
 else if(el=t.closest('#grid .tile')){const m=S.media.find(x=>x.id===el.dataset.id);if(m.access!=='extra'||S.unlocked[m.id])lightbox(m)}
 else if(el=t.closest('[data-a]')){e.stopPropagation();const a=el.dataset.a,r=S.reels[ri];if(a==='like'){S.liked[r.id]=!S.liked[r.id];save();drawReel()}else if(a==='sv'){S.saved[r.id]=!S.saved[r.id];save();drawReel();toast(S.saved[r.id]?'Reel salvo.':'Removido dos salvos.')}else if(a==='cm')comments();else share()}
 else if(el=t.closest('#rv')){playing=!playing;drawReel()}
 else if(el=t.closest('[data-n]')){ri=(ri+ +el.dataset.n+S.reels.length)%S.reels.length;playing=false;drawReel()}
 else if(el=t.closest('[data-go]')){ri=+el.dataset.go;playing=false;drawReel()}
 else if(el=t.closest('[data-al]')){album=album===el.dataset.al?null:el.dataset.al;drawAlbums();drawGrid();$('#gridsec').scrollIntoView()}
 else if(el=t.closest('[data-f]')){f=el.dataset.f;drawGrid()}
 else if(el=t.closest('[data-clr]')){el.dataset.clr==='album'?album=null:newOnly=false;drawAlbums();drawGrid()}
 else if(t.closest('#news')){newOnly=true;f='all';album=null;drawAlbums();drawGrid();$('#gridsec').scrollIntoView();toast(nNew()+' novidades na galeria.')}
 else if(t.closest('#avb'))$('#menu').hidden=!$('#menu').hidden;
 else if(t.closest('#out')){S.user=null;save();location.href='index.html'}
 else if(!t.closest('#menu'))$('#menu').hidden=true});
$('#q').addEventListener('input',e=>{q=e.target.value.trim().toLowerCase();drawGrid()});
drawReel();drawAlbums();drawGrid();
