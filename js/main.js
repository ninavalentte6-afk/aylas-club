/* Ayla's Club — frontend inicial. A persistência remota será conectada ao Supabase. */
const KEY='aylas-club-state-v1';
const ALBUMS=['Novidades','Bastidores','Coleção 01','Destaques'];
const BANNERS=['linear-gradient(110deg,#7a1230,#4b0f55 60%,#0b090d)','linear-gradient(110deg,#b3261e,#f7931e 70%,#3a0d1a)','linear-gradient(110deg,#5b21b6,#c026d3 65%,#0b090d)','linear-gradient(110deg,#be123c,#7e22ce)'];
const TITLES=[];
const pat=[];
const DUR=['0:48','0:31','0:34','0:39','0:42'];
const DEF={name:"Ayla's Club",handle:'aylasclub',bio:'Bem-vindo ao Ayla’s Club! Aqui você encontra novidades, conteúdos exclusivos e atualizações da comunidade.',
photos:0,videos:0,likes:'0',accent:'#ff3d62',banner:0,selected:'m',heart:false,user:null,
plans:[{id:'m',name:'Mensal',desc:'Acesso por 30 dias',price:0,months:1,active:false},{id:'t',name:'Trimestral',desc:'Acesso por 3 meses',price:0,months:3,active:false},{id:'a',name:'Anual',desc:'Acesso por 12 meses',price:0,months:12,active:false}],
media:[],
reels:[],
liked:{},saved:{},unlocked:{},comments:{},settings:{maint:false,emails:true,twofa:false}};
const S=Object.assign(structuredClone(DEF),JSON.parse(localStorage.getItem(KEY)||'{}'));
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const brl=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P={play:'<polygon points="6 3 20 12 6 21 6 3" fill="currentColor"/>',pause:'<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>',lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',check:'<path d="M20 6 9 17l-5-5"/>',search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',msg:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',mark:'<path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',up:'<path d="m18 15-6-6-6 6"/>',down:'<path d="m6 9 6 6 6-6"/>',left:'<path d="m15 18-6-6 6-6"/>',right:'<path d="m9 18 6-6-6-6"/>',image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',video:'<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',folder:'<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>',music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',crown:'<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Zm3 16h14"/>',eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',chart:'<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',tag:'<path d="M12 2H2v10l9.3 9.3a1 1 0 0 0 1.4 0l6.6-6.6a1 1 0 0 0 0-1.4Z"/><circle cx="7" cy="7" r="1"/>',pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',palette:'<circle cx="12" cy="12" r="10"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16" cy="10" r="1"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',cog:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',ext:'<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',plus:'<path d="M12 5v14M5 12h14"/>',trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',badge:'<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>'};
const ic=(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
const activePlans=()=>S.plans.filter(p=>p.active);
const fromPrice=()=>Math.min(...activePlans().map(p=>p.price/p.months));
const discount=p=>{const m=activePlans().find(x=>x.months===1);return !m||p.months===1?0:Math.max(0,Math.round((1-p.price/(m.price*p.months))*100))};
const planLine=p=>p.months===1?p.desc:`${p.months} meses${discount(p)?` · economize ${discount(p)}%`:''}`;
const fmtK=n=>n>=1000?(n/1000).toFixed(1).replace('.',',')+'k':String(n);
function toast(m){$('.toast')?.remove();const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),2800)}
function closeModal(){$('.mbg')?.remove()}
function modal(html,big){closeModal();const bg=document.createElement('div');bg.className='mbg';bg.innerHTML=`<div class="modal ${big?'big':''}" role="dialog" aria-modal="true"><button class="x" aria-label="Fechar">✕</button>${html}</div>`;document.body.append(bg);bg.addEventListener('click',e=>{if(e.target===bg||e.target.closest('.x'))closeModal()});return bg.firstElementChild}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('.mbg[data-lock]'))closeModal()});
function applyTheme(){document.documentElement.style.setProperty('--ac',S.accent)}
function loginModal(){const m=modal(`<h2>Entrar</h2><p class="mut sm">A autenticação será ativada na integração com Supabase.</p>
<form id="lf"><label class="fld">E-mail<input type="email" id="le" required placeholder="voce@email.com"></label><label class="fld">Senha<input type="password" id="lp" required minlength="4"></label>
<div class="err"></div><button class="btn full">Entrar</button></form>
<button class="link sm" id="forgot" type="button">Esqueci minha senha</button><hr style="border:0;border-top:1px solid var(--line);margin:12px 0"><a class="btn ghost full" href="admin.html">Painel administrativo</a>`);
 $('#forgot',m).onclick=()=>toast('A recuperação de senha será ativada com o Supabase.');
 $('#lf',m).onsubmit=e=>{e.preventDefault();toast('O login ainda precisa ser conectado ao Supabase.');}}
function subscribeModal(id){const pl=activePlans();let sel=id||S.selected;if(!pl.find(p=>p.id===sel))sel=pl[0]?.id;
 const m=modal(`<h2>Assinar Ayla's Club</h2><p class="mut sm">Os pagamentos serão ativados após a integração do gateway.</p><form id="sf">
 ${pl.map(p=>`<label class="plan ${p.id===sel?'on':''}" style="cursor:pointer"><span><b>${esc(p.name)}</b><small class="mut">${planLine(p)}</small></span><span><b>${brl(p.price)}</b><input type="radio" name="pl" value="${p.id}" ${p.id===sel?'checked':''} hidden></span></label>`).join('')}
 <label class="fld">E-mail<input type="email" id="se" required></label><label class="chk"><input type="checkbox" id="sa" required> Li e aceito os Termos e a Política de Privacidade.</label>
 <div class="err"></div><button class="btn full">Continuar</button></form>`);
 $$('.plan',m).forEach(l=>l.onclick=()=>{$$('.plan',m).forEach(x=>x.classList.remove('on'));l.classList.add('on');$('input',l).checked=true});
 $('#sf',m).onsubmit=e=>{e.preventDefault();const p=$('input[name=pl]:checked',m)?.value;toast('O cadastro e a assinatura serão ativados após conectar autenticação e pagamentos.');}}
function lightbox(it){modal(`<h2>${esc(it.title)}</h2><p class="mut sm">${esc(it.album||'')} ${it.dur?'· '+it.dur:''}</p><div class="lb g${(+it.id.slice(1))%8}" style="aspect-ratio:3/4;font-size:42px">${ic(it.type==='video'?'play':'image')}</div>`)}
function share(){navigator.clipboard?.writeText(location.href).catch(()=>{});toast('Link copiado.')}
document.addEventListener('click',e=>{if(e.target.closest('[data-login]'))loginModal();const s=e.target.closest('[data-subscribe]');if(s)subscribeModal(s.dataset.subscribe||null);const t=e.target.closest('[data-t]');if(t){e.preventDefault();modal(`<h2>${t.dataset.t}</h2><p class="mut" style="margin-top:8px">Documento em preparação. Adicione aqui os Termos e a Política de Privacidade antes da publicação.</p>`)}});
applyTheme();
