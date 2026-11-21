let filter='all';
const metricCount=m=>{
 if(m.kind!=='automatic')return String(Number(m.value)||0);
 const counts={photos:S.media.filter(x=>x.published&&x.type==='photo').length,
 videos:S.media.filter(x=>x.published&&x.type==='video').length,
 reels:S.reels.filter(x=>x.published).length,
 exclusive:S.media.filter(x=>x.published&&x.access!=='free').length};
 return String(counts[m.source]??0);
};
const tile=(m,i)=>`<div class="tile ${m.access!=='free'?'locked-preview':''}" data-id="${esc(m.id)}" role="button" tabindex="0" aria-label="${esc(m.title)}" ${m.access==='free'&&m.url?`style="background-image:url('${esc(m.url)}');background-size:cover;background-position:center"`:''}>${m.access==='free'?`<span class="tag pre">${m.type==='video'?ic('play')+ 'Vídeo grátis':ic('image')+'Prévia grátis'}</span>`:`<span class="lock">${ic('lock')}Conteúdo exclusivo</span><span class="locked-copy">Assinatura necessária</span>`}</div>`;
function render(){
 const pl=activePlans(),sel=pl.find(p=>p.id===S.selected)||pl[0];
 const items=S.media.filter(m=>m.published&&(filter==='all'||m.type===filter)).slice(0,12),free=S.reels.filter(r=>r.free&&r.published).length;
 const metrics=(S.metrics||[]).filter(m=>m.visible!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
 $('#app').innerHTML=`<div class="cover" style="background:${BANNERS[S.banner]}"></div>
 <div class="prof"><div class="avatar" aria-label="Foto de perfil">AC</div><div class="pinfo"><h1>${esc(S.name)} ${ic('badge','verified')}</h1><p class="mut sm">@${esc(S.handle)}</p></div>
 <div class="pact"><button class="ib" id="share" aria-label="Compartilhar">${ic('share')}</button>${sel?`<button class="btn" data-subscribe="${sel.id}">Assinar a partir de ${brl(fromPrice())}/mês</button>`:''}</div></div>
 <div class="cols"><div>
  <div class="card"><p>${esc(S.bio)}</p><div class="stats"><div><b>${S.photos}</b><span>Fotos</span></div><div><b>${S.videos}</b><span>Vídeos</span></div></div></div>
  ${metrics.length?`<div class="stats metric-stats">${metrics.map(m=>`<div><b>${esc(metricCount(m))}</b><span>${esc(m.label)}</span></div>`).join('')}</div>`:''}
  <div class="sec"><h2>${ic('video')} Reels</h2><span class="mut sm">${free} prévias grátis · ${S.reels.filter(r=>r.published&&!r.free).length} para assinantes</span></div>
  <div class="rail" id="rail">${S.reels.filter(r=>r.published).map((r,i)=>r.free&&r.url?`<div class="rcard reel-video-card"><b class="meta">${esc(r.title)}</b><video src="${esc(r.url)}" controls playsinline preload="metadata" style="width:100%;height:100%;max-height:340px;object-fit:cover;border-radius:14px;background:#000"></video></div>`:`<div class="rcard ${r.free?'':'dim'} locked-preview" data-r="${i}" role="button" tabindex="0"><span class="lock">${ic('lock')}${r.free?'Prévia indisponível':'Só assinantes'}</span><div class="locked-copy">${r.free?'Vídeo não disponível no momento':'Assine para assistir'}</div><div class="meta">${esc(r.title)}</div></div>`).join('')}</div>
  <div class="sec"><div class="chips" role="tablist">${[['all','Tudo'],['photo','Fotos'],['video','Vídeos']].map(c=>`<button class="chip ${filter===c[0]?'on':''}" data-f="${c[0]}">${c[1]}</button>`).join('')}</div></div>
  <div class="grid3">${items.length?items.map(tile).join(''):'<p class="empty">Nada por aqui ainda.</p>'}</div>
  ${sel?`<button class="cta" data-subscribe="${sel.id}">${ic('lock')} Assine para aceder a conteúdos exclusivos</button>`:''}
 </div>
 ${sel?`<aside class="card plans"><h3>Assinatura</h3><p class="mut sm">A contratação e a ativação do acesso serão disponibilizadas após a integração do gateway.</p>
  ${pl.map(p=>`<button class="plan ${p.id===sel.id?'on':''}" data-p="${p.id}"><span><b>${esc(p.name)}</b><small class="mut sm">${planLine(p)}</small></span><b>${brl(p.price)}</b></button>`).join('')}
  <ul class="ben"><li>${ic('check')}Planos e preços cadastrados no sistema</li><li>${ic('check')}Conteúdos exclusivos para assinantes</li><li>${ic('check')}Acesso após confirmação legítima do pagamento</li></ul>
  <button class="btn full" data-subscribe="${sel.id}">Assinar ${esc(sel.name)} · ${brl(sel.price)}</button></aside>`:''}</div>`;
}
$('#app').addEventListener('click',e=>{const t=e.target;let el;
 if(el=t.closest('[data-r]')){subscribeModal(sel())}
 else if(el=t.closest('.tile')){const m=S.media.find(x=>x.id===el.dataset.id);if(m?.access==='free'&&m.url)lightbox(m);else if(m)subscribeModal(sel())}
 else if(el=t.closest('[data-f]')){filter=el.dataset.f;render()}
 else if(el=t.closest('[data-p]')){S.selected=el.dataset.p;render()}
 else if(t.closest('#share'))share()});
const sel=()=>S.selected;
loadRemoteState().then(render).catch(err=>{console.error(err);$('#app').innerHTML=`<div class="card"><h2>Estamos preparando o Ayla's Club</h2><p class="mut">Não foi possível carregar os dados. Confira a configuração do Supabase e tente novamente.</p></div>`;});
