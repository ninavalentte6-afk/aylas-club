
let filter='all';
const tile=(m,i)=>`<div class="tile g${i%8} ${m.access!=='free'?'dim':''}" data-id="${m.id}" role="button" tabindex="0" aria-label="${esc(m.title)}" ${m.url?`style="background-image:url('${esc(m.url)}');background-size:cover;background-position:center"`:''}>${m.access==='free'?`<span class="tag pre">${ic('image')}Prévia grátis</span>`:m.type==='video'?`<span class="tag pre">${ic('play')}${m.dur}</span>`:''}${m.access!=='free'?`<span class="lock">${ic('lock')}</span>`:''}</div>`;
function render(){
 const pl=activePlans(),sel=pl.find(p=>p.id===S.selected)||pl[0];if(!sel){$('#app').innerHTML='<p class="empty">Nenhum plano ativo. Ative um plano no painel administrativo.</p>';return}
 const items=S.media.slice(0,6).filter(m=>filter==='all'||m.type===filter),free=S.reels.filter(r=>r.free).length,total=S.photos+S.videos;
 $('#app').innerHTML=`<div class="cover" style="background:${BANNERS[S.banner]}"></div>
 <div class="prof"><div class="avatar" aria-label="Foto de perfil">AC</div><div class="pinfo"><h1>${esc(S.name)} ${ic('badge','verified')}</h1><p class="mut sm">@${esc(S.handle)} · <span class="online">● online agora</span></p></div>
 <div class="pact"><button class="ib ${S.heart?'on':''}" id="heart" aria-label="Favoritar">${ic('heart')}</button><button class="ib" id="share" aria-label="Compartilhar">${ic('share')}</button><button class="btn" data-subscribe="${sel.id}">Assinar a partir de ${brl(fromPrice())}/mês</button></div></div>
 <div class="cols"><div>
  <div class="card"><p>${esc(S.bio)}</p><div class="stats"><div><b>${S.photos}</b><span>Fotos</span></div><div><b>${S.videos}</b><span>Vídeos</span></div><div><b>${esc(S.likes)}</b><span>Curtidas</span></div></div></div>
  <div class="sec"><h2>${ic('video')} Reels</h2><span class="mut sm">${free} prévias grátis · ${S.reels.length-free} para assinantes</span></div>
  <div class="rail" id="rail">${S.reels.map((r,i)=>`<div class="rcard g${i%8} ${r.free?'':'dim'}" data-r="${i}" role="button" tabindex="0">${r.free?`<span class="tag">PRÉVIA GRÁTIS</span><span class="pbtn">${ic('play','pl')}${ic('pause','pa')}</span><i class="prog"></i>`:`<span class="lock">${ic('lock')}Só assinantes</span>`}<div class="meta"><span>${ic('eye')} ${r.views}</span><span>${r.dur}</span></div></div>`).join('')}</div>
  <div class="sec"><div class="chips" role="tablist">${[['all','Tudo'],['photo','Fotos'],['video','Vídeos']].map(c=>`<button class="chip ${filter===c[0]?'on':''}" data-f="${c[0]}">${c[1]}</button>`).join('')}</div></div>
  <div class="grid3">${items.length?items.map(tile).join(''):'<p class="empty">Nada por aqui ainda.</p>'}</div>
  <button class="cta" data-subscribe="${sel.id}">${ic('lock')} Assine para desbloquear +${total-free} mídias</button>
 </div>
 <aside class="card plans"><h3>Assinatura</h3><p class="mut sm">Cancele quando quiser. Acesso imediato a todo o conteúdo.</p>
  ${pl.map(p=>`<button class="plan ${p.id===sel.id?'on':''}" data-p="${p.id}">${p.popular?'<span class="pop">MAIS POPULAR</span>':''}<span><b>${esc(p.name)}</b><small class="mut sm">${planLine(p)}</small></span><b>${brl(p.price)}</b></button>`).join('')}
  <ul class="ben"><li>${ic('check')}+${S.photos-2} fotos e +${S.videos-1} vídeos</li><li>${ic('check')}Conteúdo novo toda semana</li><li>${ic('check')}Mensagens diretas</li><li>${ic('check')}Pagamento seguro</li></ul>
  <button class="btn full" data-subscribe="${sel.id}">Assinar ${esc(sel.name)} · ${brl(sel.price)}</button></aside></div>`}
$('#app').addEventListener('click',e=>{const t=e.target;let el;
 if(el=t.closest('.rcard')){const r=S.reels[+el.dataset.r];if(r.free){const on=el.classList.contains('playing');$$('.rcard.playing').forEach(x=>x.classList.remove('playing'));if(!on){void el.offsetWidth;el.classList.add('playing')}}else subscribeModal(sel())}
 else if(el=t.closest('.tile')){const m=S.media.find(x=>x.id===el.dataset.id);m.access==='free'?lightbox(m):subscribeModal(sel())}
 else if(el=t.closest('[data-f]')){filter=el.dataset.f;render()}
 else if(el=t.closest('[data-p]')){S.selected=el.dataset.p;save();render()}
 else if(t.closest('#heart')){S.heart=!S.heart;save();render();toast(S.heart?'Perfil favoritado.':'Removido dos favoritos.')}
 else if(t.closest('#share'))share()});
const sel=()=>S.selected;
loadRemoteState().then(render).catch(err=>{console.error(err);$('#app').innerHTML=`<div class="card"><h2>Estamos preparando o Ayla's Club</h2><p class="mut">Não foi possível carregar os dados. Confira a configuração do Supabase e tente novamente.</p></div>`;});
