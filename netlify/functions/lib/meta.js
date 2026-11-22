'use strict';
// Minimal server-side Purchase: explicitly consented customers only.
// Never send content names, media IDs, emails, or purchased categories to Meta.
async function sendConfirmedPurchase(session, order) {
  const token=process.env.META_CAPI_ACCESS_TOKEN;
  const pixel=process.env.META_PIXEL_ID || '1373316378073444';
  const md=session?.metadata || {};
  if (!token || md.meta_consent !== 'yes' || !md.meta_ua || !order || order.status !== 'paid' || order.kind !== 'subscription') return;
  const value=Number(order.amount);
  if (!(value>0) || !Number.isFinite(value)) return;
  const user_data={client_user_agent:md.meta_ua};
  if(md.meta_fbp)user_data.fbp=md.meta_fbp;
  if(md.meta_fbc)user_data.fbc=md.meta_fbc;
  const payload={data:[{
    event_name:'Purchase',
    event_time:Math.floor(Date.now()/1000),
    event_id:`aylas-order-${order.id}`,
    action_source:'website',
    event_source_url:process.env.SITE_URL || process.env.URL,
    user_data,
    custom_data:{value,currency:String(order.currency||'BRL').toUpperCase()}
  }]};
  if(process.env.META_CAPI_TEST_EVENT_CODE) payload.test_event_code=process.env.META_CAPI_TEST_EVENT_CODE;
  const url=`https://graph.facebook.com/v25.0/${encodeURIComponent(pixel)}/events`;
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`},body:JSON.stringify(payload)});
  const json=await response.json().catch(()=>({}));
  if(!response.ok || json.error)throw new Error(`Meta CAPI HTTP ${response.status}: ${json.error?.message || 'unknown'}`);
}
module.exports={sendConfirmedPurchase};
