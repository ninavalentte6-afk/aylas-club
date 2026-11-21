(async()=>{
const $id=id=>document.getElementById(id);
const fmtDate=v=>v?new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'}):'Sem data de término definida';
try{
 const session=await AYLAS_DB.session();
 if(!session){$id('app').innerHTML='<div class="card"><h2>Entre na sua conta</h2><p class="mut">Inicie sessão para consultar a sua assinatura e os conteúdos disponíveis.</p><a class="btn" href="index.html">Voltar ao site</a></div>';return;}
 try{if(await AYLAS_DB.isAdmin())$id('adminNav').hidden=false;}catch(_){}
 const {data:subs,error:subErr}=await AYLAS_DB.client.from('subscriptions').select('id,status,current_period_end,plan_id,created_at').eq('user_id',session.user.id).eq('status','active').order('created_at',{ascending:false});
 if(subErr)throw subErr;
 const valid=(subs||[]).find(x=>!x.current_period_end||new Date(x.current_period_end)>new Date());
 if(!valid){$id('app').innerHTML='<div class="card"><h2>Assinatura não ativa</h2><p class="mut">Não encontrámos uma assinatura ativa nesta conta. O acesso será atualizado quando uma confirmação legítima de pagamento for integrada.</p><a class="btn" href="index.html">Voltar ao Ayla’s Club</a></div>';return;}
 await loadRemoteState(false,true);
 const plan=S.plans.find(p=>p.id===valid.plan_id);
 const [mediaUrls,reelUrls]=await Promise.all([
   Promise.all(S.media.filter(m=>m.access!=='extra').map(async m=>({...m,url:await AYLAS_DB.mediaUrl(m).catch(()=>null)}))),
   Promise.all(S.reels.map(async r=>({...r,url:await AYLAS_DB.mediaUrl(r).catch(()=>null)})))
 ]);
 const media=mediaUrls.filter(m=>m.url), reels=reelUrls.filter(r=>r.url);
 let filter='all',query='',album='';
 $id('planpill').textContent=plan?`Plano ${plan.name}`:'Assinatura ativa';
 $id('si').innerHTML=ic('search');
 const end=valid.current_period_end;
 $id('app').innerHTML=`
 <section class="welcome"><div><p class="mut sm">Bem-vinda à área de membros</p><h1>${esc(session.user.user_metadata?.display_name||session.user.email||'Membro')}</h1><p class="mut sm">${plan?`Plano ${esc(plan.name)} · `:''}Estado: ativa · ${end?'Válida até '+fmtDate(end):'Sem data de término registada'}</p></div><span class="pill">Assinatura ativa</span></section>
 <div class="sec"><h2>${ic('video')} Reels</h2><span class="mut sm">${reels.length} vídeos disponíveis</span></div>
 <div class="grid3" id="reelgrid">${reels.length?reels.map((r,i)=>`<div class="card"><b>${esc(r.title)}</b><video src="${esc(r.url)}" controls playsinline preload="metadata" style="width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:12px;margin-top:10px;background:#000"></video></div>`).join(''):'<p class="empty">Ainda não existem reels disponíveis.</p>'}</div>
 <div class="sec" id="gridsec"><h2>Todas as mídias</h2><div class="chips">${[['all','Tudo'],['photo','Fotos'],['video','Vídeos']].map(x=>`<button class="chip ${x[0]==='all'?'on':''}" data-f="${x[0]}">${x[1]}</button>`).join('')}</div></div>
 <div class="chips" id="albums" style="margin-bottom:12px"></div><div class="grid4" id="grid" style="padding-bottom:50px"></div>`;
 const albums=[...new Set(media.map(m=>m.album).filter(Boolean))];
 $id('albums').innerHTML=albums.map(a=>`<button class="chip" data-al="${esc(a)}">${esc(a)}</button>`).join('');
 function draw(){
   const rows=media.filter(m=>(filter==='all'||m.type===filter)&&(!album||m.album===album)&&(`${m.title} ${m.album}`.toLowerCase().includes(query)));
   $$('[data-f]').forEach(b=>b.classList.toggle('on',b.dataset.f===filter));
   $$('[data-al]').forEach(b=>b.classList.toggle('on',b.dataset.al===album));
   $id('grid').innerHTML=rows.length?rows.map((m,i)=>`<button class="tile" data-id="${esc(m.id)}" style="background-image:url('${esc(m.url)}');background-size:cover;background-position:center" aria-label="${esc(m.title)}"><span class="ft">${ic(m.type==='video'?'play':'image')}${esc(m.title)}</span></button>`).join(''):'<p class="empty">Nenhuma mídia encontrada.</p>';
 }
 document.addEventListener('click',e=>{
   const f=e.target.closest('[data-f]');if(f){filter=f.dataset.f;draw();return;}
   const a=e.target.closest('[data-al]');if(a){album=album===a.dataset.al?'':a.dataset.al;draw();return;}
   const item=e.target.closest('[data-id]');if(item){const m=media.find(x=>x.id===item.dataset.id);if(m)lightbox(m);return;}
   if(e.target.closest('#avb'))$id('menu').hidden=!$id('menu').hidden;
   if(e.target.closest('#out'))AYLAS_DB.client.auth.signOut().then(()=>location.href='index.html');
 });
 $id('q').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();draw();});
 draw();
}catch(err){console.error(err);$id('app').innerHTML=`<div class="card"><h2>Não foi possível carregar a área de membros</h2><p class="mut">${esc(err.message)}</p></div>`;}
})();