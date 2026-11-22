/* Site público: vitrine. Visitantes só usam as views públicas (sem originais pagos). */
let filter='all',CTX={sub:false,owned:new Set(),urls:{}},DRAFT=false;
const metricTxt=m=>`${m.prefix||''}${m.value??0}${m.suffix||''}`;
function render(){const sel=hlPlan(),all=[...S.media,...S.reels.map(r=>({...r,kind:'reel',type:'video'}))];
 const items=S.media.filter(m=>filter==='all'||(filter==='free'&&m.access==='free')||(filter==='subs'&&m.access==='subs')||(filter==='extra'&&m.access==='extra'));
 const metrics=(S.metrics||[]).filter(m=>m.visible!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
 $('#logo').textContent=tv('logoText')||S.name;$('#topsub').textContent=tv('subscribeButton');$('#topsub').dataset.subscribe=sel?.id||'';$('#topsub').classList.toggle('hide',!sel);
 const c=S.content||{},cy=c.coverY??50;
 $('#app').innerHTML=`<div class="cover" style="${S.cover_image_url?`background-image:url('${esc(S.cover_image_url)}');background-position:50% ${cy}%`:''}"><div class="cover-shine"></div><div class="cover-label"><span class="cover-dot"></span> MEMBERS CLUB <span class="cover-line"></span> EXCLUSIVE</div></div>
 <div class="prof"><div class="avatar">${S.profile_image_url?`<img src="${esc(S.profile_image_url)}" alt="${esc(S.name)}" style="object-position:50% ${c.avatarY??50}%">`:esc((S.name||'A').slice(0,2).toUpperCase())}</div>
 <div class="pinfo"><span class="micro-label">${t('heroEyebrow')}</span><h1>${esc(S.name)} ${c.verified!==false?ic('badge','verified'):''}</h1><p class="mut sm">@${esc(S.handle)} ${c.onlineVisible!==false?`· <span class="dot"></span>${t('onlineLabel')}`:''}</p></div>
 <div class="pact"><button class="ib" id="share" aria-label="Compartilhar">${ic('share')}</button>${sel?`<button class="btn sub" data-subscribe="${sel.id}">${t('heroSubscribePrefix')} ${brl(fromPrice())}</button>`:''}</div></div>
 <div class="trust-strip"><span>${ic('check')} ${t('trustPayments')}</span><span>${ic('lock')} ${t('trustAccess')}</span><span>${ic('star')} ${t('trustPrivacy')}</span></div>
 <div class="cols"><div>
 <div class="card intro-card"><div><span class="micro-label">AYLA'S CLUB</span><h2>${t('heroHeadline')}</h2><p>${esc(S.bio||tv('introGreeting'))}</p></div><span class="intro-decoration">✦</span></div>
 ${metrics.length?`<div class="stats">${metrics.map(m=>`<div><b>${esc(metricTxt(m))}</b><span>${esc(m.label)}</span></div>`).join('')}</div>`:''}
 ${S.reels.length?`<div class="sec"><h2>${t('reelsTitle')}</h2><span class="mut sm">${S.reels.filter(r=>r.access==='free').length} ${t('reelsFreeLabel')} · ${S.reels.filter(r=>r.access!=='free').length} ${t('reelsPaidLabel')}</span></div><div class="rail">${S.reels.map(r=>tile({...r,kind:'reel',type:'video'},CTX)).join('')}</div>`:''}
 <div class="sec gallery-heading"><div><span class="micro-label">GALERIA</span><h2>${t('galleryTitle')}</h2><p class="mut sm">${t('galleryIntro')}</p></div></div>
 <div class="sec filterbar"><div class="chips">${[['all','filterAll'],['free','filterFree'],['subs','filterExclusive'],['extra','filterExtra']].map(([v,k])=>`<button class="chip ${filter===v?'on':''}" data-f="${v}">${t(k)}</button>`).join('')}</div></div>
 <div class="grid">${items.length?items.map(m=>tile(m,CTX)).join(''):`<p class="empty"><b>${t('emptyMedia')}</b></p>`}</div>
 ${sel?`<p style="margin:16px 0"><button class="btn sub full" data-subscribe="${sel.id}">${ic('lock')} ${t('subscribeCta')}</button></p>`:''}</div>
 ${sel?`<aside class="card plansbox"><div class="plans-heading"><span class="micro-label">TORNE-SE MEMBRO</span><h3>${t('plansTitle')}</h3><p class="mut sm">${t('plansIntro')}</p></div>${activePlans().map(p=>`<button class="plan ${p.id===sel.id?'on':''}" data-p="${p.id}">${p.badge||p.highlighted?`<span class="bd">${esc(p.badge||'Destaque')}</span>`:''}<span><b>${esc(p.name)}</b><br><small class="mut">${esc(p.description||'')}</small></span><b>${brl(p.price)}</b></button>`).join('')}
 <ul class="ben">${((sel.benefits&&sel.benefits.length)?sel.benefits:[1,2,3,4].map(i=>tv('benefit'+i))).filter(Boolean).map(b=>`<li>${ic('check')}${esc(b)}</li>`).join('')}</ul><button class="btn sub full" data-subscribe="${sel.id}">${t('subscribeButton')} ${esc(sel.name)} · ${brl(sel.price)}</button><div class="payment-note">${ic('lock')} ${t('paymentNote')}</div></aside>`:''}</div>`;
 $('#foot').innerHTML=`© ${new Date().getFullYear()} ${t('footerBrand')} · ${t('footerNotice')} · <a href="#" data-doc="terms">${t('termsLabel')}</a> · <a href="#" data-doc="privacy">${t('privacyLabel')}</a> · <button type="button" data-marketing-preferences class="marketing-preferences">Preferências de marketing</button>`;
 $('#sbar').innerHTML=sel?`<button class="btn sub full" data-subscribe="${sel.id}">${t('heroSubscribePrefix')} ${brl(fromPrice())}</button>`:'';accountMenu();enableVideoPreviews()}
document.addEventListener('click',e=>{const T=e.target.closest('[data-tile]');
 if(T){const k=T.dataset.k,list=k==='reel'?S.reels.map(r=>({...r,kind:'reel',type:'video'})):S.media,m=list.find(x=>x.id===T.dataset.tile);if(!m)return;
  if(m.access==='free'){const fr=list.filter(x=>x.access==='free');viewer(fr,fr.indexOf(m),CTX)}
  else if(ME&&!ME.admin&&m.access==='subs')location.href='membros.html';else if(m.access==='extra'&&k!=='reel')extraModal(m);else subscribeModal()}
 const f=e.target.closest('[data-f]');if(f){filter=f.dataset.f;render()}
 const p=e.target.closest('.plansbox [data-p]');if(p){const pl=S.plans.map(x=>({...x,highlighted:x.id===p.dataset.p}));S.plans=pl;render()}
 if(e.target.closest('#share')){if(navigator.share)navigator.share({title:S.name,url:location.href}).catch(()=>{});else{navigator.clipboard?.writeText(location.href);toast('Link copiado.')}}});
// Pré-visualização em tempo real vinda do editor do painel (mesma origem).
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.type!=='aylas-draft')return;DRAFT=true;Object.assign(S,e.data.state);applyDesign();render()});
(async()=>{await loadMe();try{const r=await AYLAS_DB.publicCatalog();loadSettings(r.settings,r.plans);S.media=r.media;S.reels=r.reels;
 const sp=location.search.includes('preview=1');if(sp)document.body.dataset.preview=1}catch(err){console.error(err);$('#app').innerHTML='<p class="empty"><b>Não foi possível carregar.</b>Atualize a página.</p>';return}render();if(S.plans?.length)window.AYLAS_MARKETING?.track('ViewContent');})();
