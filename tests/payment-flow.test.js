'use strict';
// Executar com: node tests/payment-flow.test.js
// Testes locais com provedores simulados; NÃO substituem testes reais em sandbox.
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
process.env.SUPABASE_URL = 'https://project.example';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-test';
process.env.SUPABASE_ANON_KEY = 'fake-anon-key-test';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.SITE_URL = 'https://club.example';
const planId = '11111111-1111-4111-8111-111111111111';
const orderId = '22222222-2222-4222-8222-222222222222';
const buyerId = '33333333-3333-4333-8333-333333333333';
const mediaId = '44444444-4444-4444-8444-444444444444';
const extraOrderId = '55555555-5555-4555-8555-555555555555';
const plan = { id:planId,name:'Mensal',price:19.9,months:1,active:true,provider_price_id:null };
const media = { id:mediaId,title:'Extra exclusivo',description:'Extra avulso',access:'extra',published:true,price:34.9 };
let stripeSessions=0;
const state = { orders:[],subscriptions:[],events:[],calls:[] };
const reply = (data,status=200)=>({ok:status>=200&&status<300,status,async json(){return data},async text(){return JSON.stringify(data)}});
function eq(v,p){return !p||p===`eq.${v}`||p==='is.null'&&v==null}
function filter(rows,params){return rows.filter(row=>[...params.entries()].every(([k,v])=> {
 if(['select','limit','order','or'].includes(k))return true;
 if(v==='is.null')return row[k]==null;
 if(v.startsWith('eq.'))return String(row[k])===v.slice(3);
 if(v.startsWith('in.'))return v.slice(4,-1).split(',').includes(row[k]);
 return true;
}));}
global.fetch=async (raw,opts={})=>{
 const url=new URL(raw);const path=url.pathname;const method=opts.method||'GET';
 state.calls.push({url:raw,method,body:opts.body});
 if(path==='/auth/v1/user')return reply({id:buyerId,email:'buyer@example.com',email_confirmed_at:'2026-11-20T14:00:00Z'});
 if(path.startsWith('/v1/checkout/sessions')&&method==='POST'){
  const form=new URLSearchParams(opts.body);
  assert.equal(form.get('mode'),'payment');assert.equal(form.has('payment_method_types[0]'),false);
  assert.ok(['1990','3490'].includes(form.get('line_items[0][price_data][unit_amount]')));
  return reply({id:++stripeSessions===1?'cs_test_guest':'cs_test_extra',url:'https://checkout.stripe.com/c/pay/test'});
 }
 if(path==='/v1/payment_intents/pi_test_guest')return reply({metadata:{order_id:orderId}});
 if(path==='/v1/payment_intents/pi_test_extra')return reply({metadata:{order_id:extraOrderId}});
 if(!path.startsWith('/rest/v1/'))throw Error(`Unexpected ${method} ${url}`);
 const table=path.split('/')[3],params=url.searchParams;
 if(method==='GET'){
  if(table==='plans')return reply(filter([plan],params));
  if(table==='media')return reply(filter([media],params));
  if(table==='orders'){
   let rows=filter(state.orders,params);
   if(params.has('or'))rows=rows.filter(x=>!x.user_id||x.user_id===buyerId);
   return reply(rows);
  }
  if(table==='subscriptions')return reply(filter(state.subscriptions,params));
  if(table==='webhook_events')return reply(filter(state.events,params));
 }
 if(method==='POST'){
  const record=JSON.parse(opts.body);
  if(table==='orders'){const o={id:state.orders.length?extraOrderId:orderId,...record};state.orders.push(o);return reply([o]);}
  if(table==='subscriptions'){const o={id:'sub-'+(state.subscriptions.length+1),...record};state.subscriptions.push(o);return reply([o]);}
  if(table==='webhook_events'){
   const existing=state.events.find(x=>x.event_id===record.event_id);
   if(existing)return reply(null);
   state.events.push(record);return reply([record]);
  }
 }
 if(method==='PATCH'){
  const record=JSON.parse(opts.body),rows=filter(table==='webhook_events'?state.events:state[table],params);
  rows.forEach(x=>Object.assign(x,record));return reply(rows);
 }
 throw Error(`Unexpected database ${method} ${url}`);
};
const checkout=require('../netlify/functions/create-checkout').handler;
const webhook=require('../netlify/functions/payment-webhook').handler;
const claim=require('../netlify/functions/claim-purchases').handler;
async function signed(type,obj,id){
 const body=JSON.stringify({id,type,data:{object:obj}}),ts=Math.floor(Date.now()/1000);
 const signature=createHmac('sha256',process.env.STRIPE_WEBHOOK_SECRET).update(`${ts}.${body}`).digest('hex');
 const event={httpMethod:'POST',headers:{'stripe-signature':`t=${ts},v1=${signature}`},body};
 const result=await webhook(event);assert.equal(result.statusCode,200,result.body);
}
(async()=>{
 const result=await checkout({httpMethod:'POST',headers:{},body:JSON.stringify({kind:'subscription',plan_id:planId})});
 assert.equal(result.statusCode,200,result.body);
 assert.equal(state.orders[0].user_id,null);
 assert.equal(state.orders[0].purchased_months,1);
 assert.equal(state.subscriptions.length,0);
 const completed={mode:'payment',payment_status:'paid',id:'cs_test_guest',payment_intent:'pi_test_guest',
  metadata:{order_id:orderId,plan_id:planId,kind:'subscription',months:'1',payment_method:'one_time'},
  customer_details:{email:'BUYER@example.com'}};
 await signed('checkout.session.completed',completed,'evt-1');
 assert.equal(state.orders[0].status,'paid');
 assert.equal(state.orders[0].guest_email,'buyer@example.com');
 assert.equal(state.subscriptions.length,0,'guest must NOT have unlocked content before verifying email');
 const first=await claim({httpMethod:'POST',headers:{authorization:'Bearer fake-user-jwt'}});
 assert.equal(first.statusCode,200,first.body);
 assert.equal(state.orders[0].user_id,buyerId);
 assert.equal(state.subscriptions.length,1);
 assert.equal(state.subscriptions[0].provider_ref,'cs_test_guest');
 assert.ok(new Date(state.subscriptions[0].current_period_end)>new Date());
 const again=await claim({httpMethod:'POST',headers:{authorization:'Bearer fake-user-jwt'}});
 assert.equal(again.statusCode,200,again.body);
 assert.equal(state.subscriptions.length,1,'idempotent claim');
 await signed('charge.refunded',{payment_intent:'pi_test_guest',invoice:null},'evt-2');
 assert.equal(state.orders[0].status,'refunded');
 assert.equal(state.subscriptions[0].status,'expired');
 // Extra pago com preço definido por mídia; Pix pendente nunca libera acesso.
 const extraResult=await checkout({httpMethod:'POST',headers:{},body:JSON.stringify({kind:'extra',media_id:mediaId})});
 assert.equal(extraResult.statusCode,200,extraResult.body);
 assert.equal(state.orders[1].amount,34.9);
 assert.equal(state.orders[1].status,'pending');
 const extraCheckout={mode:'payment',payment_status:'unpaid',id:'cs_test_extra',payment_intent:'pi_test_extra',
   metadata:{order_id:extraOrderId,media_id:mediaId,kind:'extra'},customer_details:{email:'buyer@example.com'}};
 await signed('checkout.session.completed',extraCheckout,'evt-extra-pending');
 assert.equal(state.orders[1].status,'pending','unpaid Pix must not unlock content');
 extraCheckout.payment_status='paid';
 await signed('checkout.session.async_payment_succeeded',extraCheckout,'evt-extra-paid');
 assert.equal(state.orders[1].status,'paid');
 await claim({httpMethod:'POST',headers:{authorization:'Bearer fake-user-jwt'}});
 assert.equal(state.orders[1].user_id,buyerId,'extra media attributed to email verified account');
 assert.equal(state.subscriptions.length,1,'extra purchase is not a plan subscription');
 console.log('PASS: checkout visitante, Pix pendente/confirmado, extras com valor próprio, email confirmado, idempotência e estorno');
})().catch(e=>{console.error(e);process.exitCode=1});
