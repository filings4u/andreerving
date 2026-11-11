/* First-party referral attribution for Andre Erving public site. */
(()=>{
 'use strict';
 const API="https://gnfyidajbectlppsekzj.supabase.co/functions/v1/andre-affiliates";
 const key="ae_affiliate_referral_v1";
 const query=new URLSearchParams(location.search),ref=(query.get("ref")||"").trim().toLowerCase();
 async function track(){
  if(!/^[a-z0-9]{8,18}$/.test(ref))return;
  try{
   const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"track",code:ref,path:location.pathname})});
   if(!r.ok)return;
   const result=await r.json();
   if(result.valid&&/^[0-9a-f-]{36}$/i.test(result.clickId))localStorage.setItem(key,JSON.stringify({clickId:result.clickId,code:ref,expiresAt:result.expiresAt}));
  }catch(error){console.warn("Referral attribution unavailable",error)}
 }
 window.AEAffiliateReferral={
  get:()=>{try{const x=JSON.parse(localStorage.getItem(key)||"null");if(!x||Date.parse(x.expiresAt)<=Date.now()){localStorage.removeItem(key);return null}return x}catch{return null}},
  ready:null
 };
 window.AEAffiliateReferral.ready=track();
})();