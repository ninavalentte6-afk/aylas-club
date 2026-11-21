let filter='all';
const metricCount=m=>{
 if(m.kind!=='automatic')return String(Number(m.value)||0);
 const counts={photos:S.media.filter(x=>x.published&&x.type==='photo').length,videos:S.media.filter(x=>x.published&&x.type==='video').length,reels:S.reels.filter(x=>x.published).length,exclusive:S.media.filter(x=>x.published&&x.access!=='free').length};
 return String(counts[m.source]??0);
};
const tile=m=>{
 const locked=m.access!=='free',bg=locked?(m.preview_url?`background-image:url('${esc(m.preview_url)}')`:''):m.url?`background-image:url('${esc(m.url)}')`:'';
 return `<div class="tile ${locked?'locked-preview':''}" data-id="${esc(m.id)}" role="button" tabindex="0" aria-label="${esc(m.title)}" style="${locked&&m.preview_url?`--preview-image:url('${esc(m.preview_url)}')`:''};${bg};background-size:cover;background-position:center">${locked?`<span class="lock">${ic('lock')}${c('exclusiveLabel')}</span><span class="locked-copy">${c('lockedSubtitle')}</span>`:`<span class="tag pre">${m.type==='video'?ic('play')+c('freeVideo'):ic('image')+c('freePreview')}</span>`}</div>`;
};
function render(){
 const pl=activePlans(),sel=pl.find(p=>p.id===S.selected)||pl[0];
 const items=S.media.filter(m=>m.published&&(filter==='all'||filter===m.type)).slice(0,24);
 const free=S.reels.filter(r=>r.free&&r.published).length;
 const metrics=(S.metrics||[]).filter(m=>m.visible!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
 const logo=document.querySelector('.top .logo');if(logo)logo.innerHTML=`${esc(S.name)}`;
 document.querySelectorAll('[data-login]').forEach(x=>x.textContent=c('loginButton'));document.querySelectorAll('.top [data-subscribe]').forEach(x=>x.textContent=c('subscribeButton'));
 const footer=document.querySelector('.ft2');if(footer)footer.innerHTML=`© 2026 ${c('footerBrand')} · ${c('footerNotice')} · <a href="#" data-t="${c('termsLabel')}">${c('termsLabel')}</a> · <a href="#" data-t="${c('privacyLabel')}">${c('privacyLabel')}</a>`;
 $('#app').innerHTML=`<div class="cover" style="background:${BANNERS[S.banner]}"></div>
 <div class="prof"><div class="avatar" aria-label="Foto de perfil">AC</div><div class="pinfo"><h1>${esc(S.name)} ${ic('badge','verified')}</h1><p class="mut sm">@${esc(S.handle)} ${S.content?.onlineVisible!==false?`· <span class="online-dot"></span><span class="online-label">${c('onlineLabel')}</span>`:''}</p></div>
 <div class="pact"><button class="ib" id="share" aria-label="Compartilhar">${ic('share')}</button>${sel?`<button class="btn" data-subscribe="${sel.id}">${c('heroSubscribePrefix')} ${brl(fromPrice())}/mês</button>`:''}</div></div>
 <div class="cols"><div>
  <div class="card"><p>${esc(S.bio)}</p><div class="stats"><div><b>${S.photos}</b><span>${c('profilePhotos')}</span></div><div><b>${S.videos}</b><span>${c('profileVideos')}</span></div></div></div>
  ${metrics.length?`<div class="stats metric-stats">${metrics.map(m=>`<div><b>${esc(metricCount(m))}</b><span>${esc(m.label)}</span></div>`).join('')}</div>`:''}
  <div class="sec"><h2>${ic('video')} ${c('reelsTitle')}</h2><span class="mut sm">${free} ${c('reelsFreeLabel')} · ${S.reels.filter(r=>r.published&&!r.free).length} ${c('reelsPaidLabel')}</span></div>
  <div class="rail" id="rail">${S.reels.filter(r=>r.published).map((r,i)=>r.free&&r.url?`<div class="rcard reel-video-card"><b class="meta">${esc(r.title)}</b><video src="${esc(r.url)}" controls playsinline preload="metadata" style="width:100%;height:100%;max-height:340px;object-fit:cover;border-radius:14px;background:#000"></video></div>`:`<div class="rcard dim locked-preview" data-r="${i}" role="button" tabindex="0"><span class="lock">${ic('lock')}${c('lockedReel')}</span><div class="locked-copy">${c('lockedReelCta')}</div><div class="meta">${esc(r.title)}</div></div>`).join('')}</div>
  <div class="sec"><div class="chips" role="tablist">${[['all',c('filterAll')],['photo',c('filterPhotos')],['video',c('filterVideos')]].map(([v,label])=>`<button class="chip ${filter===v?'on':''}" data-f="${v}">${label}</button>`).join('')}</div></div>
  <div class="grid3">${items.length?items.map(tile).join(''):`<p class="empty">${c('emptyMedia')}</p>`}</div>
  ${sel?`<button class="cta" data-subscribe="${sel.id}">${ic('lock')} ${c('subscribeCta')}</button>`:''}
 </div>
 ${sel?`<aside class="card plans"><h3>${c('plansTitle')}</h3><p class="mut sm">${c('plansIntro')}</p>
  ${pl.map(p=>`<button class="plan ${p.id===sel.id?'on':''}" data-p="${p.id}"><span><b>${esc(p.name)}</b><small class="mut sm">${esc(p.desc||planLine(p))}</small></span><b>${brl(p.price)}</b></button>`).join('')}
  <ul class="ben">${[1,2,3,4].map(i=>`<li>${ic('check')}${c('benefit'+i)}</li>`).join('')}</ul>
  <button class="btn full" data-subscribe="${sel.id}">${c('subscribeButton')} ${esc(sel.name)} · ${brl(sel.price)}</button></aside>`:''}</div>`;
}
$('#app').addEventListener('click',e=>{const t=e.target;let el;
 if(el=t.closest('[data-r]'))subscribeModal(S.selected);
 else if(el=t.closest('.tile')){const m=S.media.find(x=>x.id===el.dataset.id);if(m?.access==='free'&&m.url)lightbox(m);else if(m)subscribeModal(S.selected);}
 else if(el=t.closest('[data-f]')){filter=el.dataset.f;render();}
 else if(el=t.closest('[data-p]')){S.selected=el.dataset.p;render();}
 else if(t.closest('#share'))share();
});
const sel=()=>S.selected;
loadRemoteState().then(render).catch(err=>{console.error(err);$('#app').innerHTML=`<div class="card"><h2>Estamos preparando o Ayla's Club</h2><p class="mut">Não foi possível carregar os dados. Confira a configuração do Supabase e tente novamente.</p></div>`;});
