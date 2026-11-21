/* Camada de dados — Supabase. Só usa a chave pública; a segurança real está nas políticas RLS (SQL 2.0). */
(function(){
if(!window.supabase||!window.AYLAS_SUPABASE_URL){window.AYLAS_DB_ERROR='Supabase não carregado.';return}
const C=window.supabase.createClient(window.AYLAS_SUPABASE_URL,window.AYLAS_SUPABASE_KEY);
const pub=(b,p)=>C.storage.from(b).getPublicUrl(p).data.publicUrl;
const clean=n=>n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'-');
const ok=r=>{if(r.error)throw r.error;return r.data};
// Miniatura NÃO recuperável: reduz para ~28px e amplia (não depende de ctx.filter, que o Safari ignora).
async function makePreview(file){
 const u=URL.createObjectURL(file);let src,w,h;
 try{
  if(file.type.startsWith('image/')){const i=new Image();i.src=u;await i.decode();src=i;w=i.naturalWidth;h=i.naturalHeight}
  else if(file.type.startsWith('video/')){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=u;
   await new Promise((a,b)=>{v.onloadeddata=a;v.onerror=b});v.currentTime=Math.min(.5,(v.duration||1)/2);await new Promise(a=>{v.onseeked=a});src=v;w=v.videoWidth;h=v.videoHeight}
  else return null;
  const s=28/Math.max(w,h),sm=document.createElement('canvas');sm.width=Math.max(2,Math.round(w*s));sm.height=Math.max(2,Math.round(h*s));sm.getContext('2d').drawImage(src,0,0,sm.width,sm.height);
  const k=420/Math.max(sm.width,sm.height),big=document.createElement('canvas');big.width=Math.round(sm.width*k);big.height=Math.round(sm.height*k);
  const g=big.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(sm,0,0,big.width,big.height);
  return await new Promise(r=>big.toBlob(r,'image/jpeg',.6));
 }finally{URL.revokeObjectURL(u)}
}
const norm=m=>({...m,price:Number(m.price||0),preview_url:m.preview_bucket&&m.preview_path?pub(m.preview_bucket,m.preview_path):null,
 url:m.storage_bucket==='aylas-public'&&m.storage_path&&(m.access==='free')?pub(m.storage_bucket,m.storage_path):null});
const DB={client:C,pub,makePreview,norm,
 async me(){const {data}=await C.auth.getSession();const s=data.session;if(!s)return null;
  const {data:p}=await C.from('profiles').select('display_name,is_admin,avatar_url,email').eq('id',s.user.id).maybeSingle();
  return {user:s.user,profile:p||{},admin:!!p?.is_admin}},
 async settings(){return ok(await C.from('site_settings').select('*').eq('id',1).maybeSingle())},
 async saveSettings(s){ok(await C.from('site_settings').upsert({id:1,name:s.name,handle:s.handle,bio:s.bio,accent:s.accent||'#e0489a',banner:s.banner||0,profile_image_url:s.profile_image_url||null,cover_image_url:s.cover_image_url||null,metrics:s.metrics||[],content:s.content||{},updated_at:new Date().toISOString()}))},
 // Catálogo para visitantes: apenas views (nunca devolvem o original pago).
 async publicCatalog(){const [s,p,m,r]=await Promise.all([C.from('site_settings').select('*').eq('id',1).maybeSingle(),C.from('plans').select('*').eq('active',true).order('sort_order'),
   C.from('public_media_catalog').select('*').order('sort_order').order('created_at',{ascending:false}),C.from('public_reels_catalog').select('*').order('sort_order').order('created_at',{ascending:false})]);
  return {settings:ok(s),plans:ok(p)||[],media:(ok(m)||[]).map(norm),reels:(ok(r)||[]).map(norm)}},
 // Linhas que a RLS permite abrir a este utilizador (assinatura válida / compra paga / admin).
 async entitled(table){const d=ok(await C.from(table).select('id,storage_bucket,storage_path').eq('published',true));return d||[]},
 async urls(rows){const out={},priv=rows.filter(r=>r.storage_bucket==='aylas-private');
  rows.filter(r=>r.storage_bucket==='aylas-public').forEach(r=>out[r.id]=pub(r.storage_bucket,r.storage_path));
  if(priv.length){const d=ok(await C.storage.from('aylas-private').createSignedUrls(priv.map(r=>r.storage_path),3600));d.forEach((x,i)=>{if(x.signedUrl)out[priv[i].id]=x.signedUrl})}return out},
 async urlFor(r){if(r.url)return r.url;const x=await this.urls([r]);return x[r.id]},
 async createLead(p){ok(await C.from('leads').insert({email:String(p.email).trim().toLowerCase(),source:p.source||'subscription_interest',plan_id:p.plan_id||null,media_id:p.media_id||null,consent_at:new Date().toISOString(),status:'new'}))},
 async checkout(payload){const {data}=await C.auth.getSession();
  try{const r=await fetch('/.netlify/functions/create-checkout',{method:'POST',headers:{'content-type':'application/json',...(data.session?{authorization:'Bearer '+data.session.access_token}:{})},body:JSON.stringify(payload)});
   if(r.status===501||r.status===404)return {notConfigured:true};const j=await r.json();if(!r.ok)throw new Error(j.error||'Falha no checkout');return j}catch(e){if(e instanceof TypeError)return {notConfigured:true};throw e}},
 async claimPurchases(){const {data}=await C.auth.getSession();if(!data.session)return null;
  const r=await fetch('/.netlify/functions/claim-purchases',{method:'POST',headers:{authorization:'Bearer '+data.session.access_token}});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Não foi possível verificar suas compras.');return j},
 // ---- admin: gestão de mídia ----
 async list(table){return (ok(await C.from(table).select('*').order('sort_order').order('created_at',{ascending:false}))||[]).map(norm)},
 async upload(bucket,path,blob,type){ok(await C.storage.from(bucket).upload(path,blob,{upsert:false,contentType:type||blob.type}))},
 async rm(bucket,paths){const p=paths.filter(Boolean);if(p.length)await C.storage.from(bucket).remove(p)},
 async addItem(table,file,meta){const me=await this.me();const paid=meta.access!=='free',bucket=paid?'aylas-private':'aylas-public';
  const path=`${me.user.id}/${Date.now()}-${clean(file.name)}`;await this.upload(bucket,path,file);let pp=null;
  if(paid){try{const b=await makePreview(file);if(b){pp=`previews/${me.user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;await this.upload('aylas-public',pp,b,'image/jpeg')}}catch(e){await this.rm(bucket,[path]);throw new Error('Não foi possível criar a prévia desfocada: '+e.message)}}
  const mx=(await C.from(table).select('sort_order').order('sort_order',{ascending:false}).limit(1)).data?.[0]?.sort_order||0;
  const row={title:meta.title,storage_bucket:bucket,storage_path:path,preview_bucket:pp?'aylas-public':null,preview_path:pp,published:meta.published!==false,sort_order:mx+1,access:meta.access,price:meta.access==='extra'?Number(meta.price)||0:0,description:meta.description||null};
  if(table==='media'){row.type=file.type.startsWith('video/')?'video':'photo';row.album=meta.album||'Novidades'}else{row.is_free=meta.access==='free';delete row.price}
  try{return ok(await C.from(table).insert(row).select().single())}catch(e){await this.rm(bucket,[path]);await this.rm('aylas-public',[pp]);throw e}},
 async update(table,id,patch){ok(await C.from(table).update(patch).eq('id',id))},
 // Troca o tipo de acesso movendo o ficheiro entre buckets quando necessário (gratuito = público; resto = privado).
 async setAccess(table,row,access,price){const wantPriv=access!=='free',isPriv=row.storage_bucket==='aylas-private',patch={access,price:access==='extra'?Number(price)||0:0};
  if(table==='reels'){patch.is_free=access==='free';delete patch.price}
  if(wantPriv!==isPriv){const nb=wantPriv?'aylas-private':'aylas-public',dl=ok(await C.storage.from(row.storage_bucket).download(row.storage_path));
   const np=`${row.storage_path.split('/')[0]}/${Date.now()}-${row.storage_path.split('/').pop().replace(/^\d+-/,'')}`;await this.upload(nb,np,dl,dl.type);
   patch.storage_bucket=nb;patch.storage_path=np;
   if(wantPriv){const b=await makePreview(new File([dl],'f',{type:dl.type}));if(b){const pp=`previews/${np.split('/')[0]}/${Date.now()}.jpg`;await this.upload('aylas-public',pp,b,'image/jpeg');patch.preview_bucket='aylas-public';patch.preview_path=pp}}
   else{patch.preview_bucket=null;patch.preview_path=null}
   try{await this.update(table,row.id,patch)}catch(e){await this.rm(nb,[np]);throw e}
   await this.rm(row.storage_bucket,[row.storage_path]);if(!wantPriv)await this.rm('aylas-public',[row.preview_path]);return}
  await this.update(table,row.id,patch)},
 // Substitui o ficheiro mantendo título, preço, ordem, etc.
 async replaceFile(table,row,file){const bucket=row.storage_bucket,uid=(await this.me()).user.id,path=`${uid}/${Date.now()}-${clean(file.name)}`;await this.upload(bucket,path,file);
  const patch={storage_path:path};if(table==='media')patch.type=file.type.startsWith('video/')?'video':'photo';let pp=null;
  if(bucket==='aylas-private'){const b=await makePreview(file);if(b){pp=`previews/${uid}/${Date.now()}.jpg`;await this.upload('aylas-public',pp,b,'image/jpeg');patch.preview_bucket='aylas-public';patch.preview_path=pp}}
  try{await this.update(table,row.id,patch)}catch(e){await this.rm(bucket,[path]);await this.rm('aylas-public',[pp]);throw e}
  await this.rm(bucket,[row.storage_path]);if(pp)await this.rm('aylas-public',[row.preview_path])},
 async remove(table,row){await C.from(table).delete().eq('id',row.id).then(ok);await this.rm(row.storage_bucket,[row.storage_path]);await this.rm('aylas-public',[row.preview_path])},
 async uploadPublic(folder,file){const me=await this.me(),path=`${folder}/${me.user.id}/${Date.now()}-${clean(file.name)}`;await this.upload('aylas-public',path,file);return pub('aylas-public',path)},
 // ---- planos ----
 async plans(){return ok(await C.from('plans').select('*').order('sort_order'))||[]},
 async savePlan(p,i){const row={name:p.name,description:p.description||'',price:Number(p.price)||0,months:Number(p.months)||1,active:!!p.active,highlighted:!!p.highlighted,badge:p.badge||null,benefits:p.benefits||[],sort_order:i};
  if(p.id)ok(await C.from('plans').update(row).eq('id',p.id));else return ok(await C.from('plans').insert(row).select().single());return p},
 async delPlan(id){ok(await C.from('plans').delete().eq('id',id))},
 async setHighlight(id){ok(await C.from('plans').update({highlighted:false}).neq('id',id));ok(await C.from('plans').update({highlighted:true}).eq('id',id))},
 // ---- membros, assinaturas, leads, pedidos ----
 async members(){const [p,s,pl]=await Promise.all([C.from('profiles').select('id,display_name,email,is_admin,created_at').order('created_at',{ascending:false}),C.from('subscriptions').select('*'),C.from('plans').select('id,name')]);
  const subs=ok(s)||[],names=new Map((ok(pl)||[]).map(x=>[x.id,x.name]));return (ok(p)||[]).map(m=>{const ss=subs.filter(x=>x.user_id===m.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));const a=ss.find(x=>x.status==='active'&&(!x.current_period_end||new Date(x.current_period_end)>new Date()));return {...m,sub:a||ss[0]||null,valid:!!a,plan:names.get((a||ss[0])?.plan_id)||''}})},
 async grant(uid,planId,months){const end=new Date();end.setMonth(end.getMonth()+Number(months||1));ok(await C.from('subscriptions').insert({user_id:uid,plan_id:planId,status:'active',current_period_end:end.toISOString(),source:'manual'}))},
 async cancelSub(id){const sub=ok(await C.from('subscriptions').select('*').eq('id',id).single());
  if(sub.provider==='stripe'&&String(sub.provider_ref||'').startsWith('sub_')){const {data}=await C.auth.getSession();const r=await fetch('/.netlify/functions/cancel-subscription',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+data.session.access_token},body:JSON.stringify({subscription_id:id})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Falha ao cancelar assinatura');return j}
  ok(await C.from('subscriptions').update({status:'canceled',cancel_at_period_end:false}).eq('id',id));return {ok:true,scheduled:false}},
 async leads(){return ok(await C.from('leads').select('*').order('created_at',{ascending:false}))||[]},
 async updLead(id,p){ok(await C.from('leads').update(p).eq('id',id))},
 async delLead(id){ok(await C.from('leads').delete().eq('id',id))},
 async myOrders(uid){return ok(await C.from('orders').select('*').eq('user_id',uid).order('created_at',{ascending:false}))||[]},
 async favs(uid){return new Set((ok(await C.from('favorites').select('media_id').eq('user_id',uid))||[]).map(x=>x.media_id))},
 async setFav(uid,mid,on){on?ok(await C.from('favorites').insert({user_id:uid,media_id:mid})):ok(await C.from('favorites').delete().eq('user_id',uid).eq('media_id',mid))},
 async dash(from,to){const f=from.toISOString(),t=to.toISOString(),q=(tb,sel)=>C.from(tb).select(sel).gte('created_at',f).lte('created_at',t).limit(5000);
  const [m,s,l,o,all,allm]=await Promise.all([q('profiles','created_at'),q('subscriptions','created_at,status,plan_id'),q('leads','created_at,status'),q('orders','created_at,paid_at,amount,status,kind,plan_id,media_id'),
   C.from('subscriptions').select('status,current_period_end'),C.from('profiles').select('id',{count:'exact',head:true})]);
  return {members:ok(m)||[],subs:ok(s)||[],leads:ok(l)||[],orders:ok(o)||[],allSubs:ok(all)||[],totalMembers:allm.count||0}}
};
window.AYLAS_DB=DB;
})();
