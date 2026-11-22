/* Meta Pixel: optional analytics, only after explicit marketing consent. */
(function(){
 'use strict';
 const ID='1373316378073444', KEY='aylas_marketing_consent_v1';
 const allowed=()=>{try{return localStorage.getItem(KEY)==='yes'}catch{return false}};
 let loaded=false;
 function cookie(name){return document.cookie.split('; ').find(x=>x.startsWith(name+'='))?.slice(name.length+1)||''}
 function load(){
   if(loaded||!allowed())return;
   loaded=true;
   !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
   window.fbq('init',ID);if(!location.pathname.endsWith('/membros.html'))window.fbq('track','PageView');
 }
 function track(name,data){if(!allowed())return;load();if(typeof window.fbq==='function')window.fbq('track',name,data||{});}
 function ctx(){if(!allowed())return {};return {meta_consent:'yes',meta_fbp:decodeURIComponent(cookie('_fbp')),meta_fbc:decodeURIComponent(cookie('_fbc')),meta_ua:navigator.userAgent.slice(0,400)};}
 function prefs(){document.getElementById('ayla-cookie-consent')?.remove();
   const el=document.createElement('div');el.id='ayla-cookie-consent';el.setAttribute('role','dialog');el.setAttribute('aria-label','Preferências de marketing');
   el.style.cssText='position:fixed;z-index:99999;left:12px;right:12px;bottom:12px;max-width:540px;margin:auto;background:#251726;color:#fff;border:1px solid #a47d97;border-radius:14px;padding:17px;box-shadow:0 10px 40px #0009;font:14px/1.5 Arial,sans-serif';
   el.innerHTML='<strong style="font-size:16px">Privacidade e marketing</strong><p style="margin:8px 0 12px">Com sua autorização, usamos o Pixel da Meta para medir acessos e resultados dos anúncios. Recusar não impede navegar ou comprar. A escolha pode ser alterada nas preferências de marketing.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" data-consent="no" style="padding:9px 14px;border-radius:9px;cursor:pointer">Recusar</button><button type="button" data-consent="yes" style="padding:9px 14px;border-radius:9px;cursor:pointer">Aceitar marketing</button></div>';
   el.addEventListener('click',e=>{const b=e.target.closest('[data-consent]');if(!b)return;try{localStorage.setItem(KEY,b.dataset.consent)}catch{}el.remove();if(b.dataset.consent==='yes')load();else if(loaded)location.reload()});document.body.appendChild(el);
 }
 function init(){load();try{if(localStorage.getItem(KEY)===null)prefs()}catch{prefs()}document.addEventListener('click',e=>{if(e.target.closest('[data-marketing-preferences]'))prefs()});}
 window.AYLAS_MARKETING={track,ctx,allowed,changePreference:prefs};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
