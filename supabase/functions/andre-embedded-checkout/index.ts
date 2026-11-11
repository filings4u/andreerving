// Andre Erving checkout - authoritative, active offering prices from Supabase.
const project="gnfyidajbectlppsekzj";
const origins=new Set(["https://andreerving.com","https://www.andreerving.com","https://filings4u.github.io","http://localhost:3000","http://127.0.0.1:5500"]);
function reply(data:unknown,status=200,origin=""){
 const headers:Record<string,string>={"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin","Access-Control-Allow-Headers":"content-type,apikey,authorization,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
 if(origins.has(origin))headers["Access-Control-Allow-Origin"]=origin;
 return new Response(JSON.stringify(data),{status,headers});
}
type Item={id:string;title:string;cents:number;currency:string;section:string};
async function loadCatalog():Promise<Item[]>{
 const url=(Deno.env.get("SUPABASE_URL")||"https://"+project+".supabase.co")+"/rest/v1/site_prices?select=price_key,label,amount,currency,section&active=eq.true&price_key=like.offering.*&order=price_key.asc";
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY")||"";
 if(!key)throw Error("Catalog credentials unavailable");
 const res=await fetch(url,{headers:{apikey:key,Authorization:"Bearer "+key}});
 if(!res.ok)throw Error("Catalog unavailable");
 const rows=await res.json();
 if(!Array.isArray(rows))throw Error("Catalog invalid");
 return rows.filter(r=>["Courses","Photography","Resources","Services"].includes(r.section)&&typeof r.price_key==="string"&&/^offering\.[a-z0-9-]+$/.test(r.price_key)&&Number.isSafeInteger(Math.round(Number(r.amount)*100))&&(Number(r.amount)>0||(r.section==="Resources"&&Number(r.amount)===0))&&String(r.currency||"USD").toUpperCase()==="USD").map(r=>({id:r.price_key.slice(9),title:String(r.label),cents:Math.round(Number(r.amount)*100),currency:"usd",section:r.section}));
}


async function findCrmInvoice(token:string){
 if(!/^[0-9a-f]{64}$/i.test(token))return null;
 const digest=[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))].map(n=>n.toString(16).padStart(2,"0")).join("");
 const base=(Deno.env.get("SUPABASE_URL")||"https://"+project+".supabase.co")+"/rest/v1";
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!key)throw Error("Invoice data unavailable");
 const headers={apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"};
 const m=await fetch(base+"/crm_order_invoices?select=order_id,price_key,status,mode,payment_intent_id&token_hash=eq."+digest+"&mode=eq.invoice&limit=1",{headers});
 if(!m.ok)throw Error("Invoice query failed");
 const meta=(await m.json())[0];if(!meta)return null;
 const r=await fetch(base+"/orders?select=id,order_number,customer_email,customer_name,customer_first_name,customer_last_name,customer_phone,total,currency,status,created_at&id=eq."+meta.order_id+"&limit=1",{headers});
 if(!r.ok)throw Error("Invoice record unavailable");
 const order=(await r.json())[0];if(!order)return null;
 const q=await fetch(base+"/order_items?select=item_name,quantity,unit_price,line_total&order_id=eq."+meta.order_id+"&limit=20",{headers});
 if(!q.ok)throw Error("Invoice line items unavailable");
 return {meta,order,items:await q.json(),base,headers};
}

async function recordPaidSession(session:Record<string,unknown>){
 if(session.payment_status!=="paid"||typeof session.id!=="string")return false;
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!key)throw Error("Order storage service credential missing");
 const base=(Deno.env.get("SUPABASE_URL")||"https://"+project+".supabase.co")+"/rest/v1";
 const headers={apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"};
 const id=session.id;
 const existing=await fetch(base+"/orders?select=id&external_payment_id=eq."+encodeURIComponent(id)+"&limit=1",{headers});
 if(!existing.ok)throw Error("Unable to check order status");
 const found=await existing.json();
 if(Array.isArray(found)&&found.length)return true;
 const meta=typeof session.metadata==="object"&&session.metadata?session.metadata as Record<string,string>:{};
 const total=Number(session.amount_total);
 if(!Number.isSafeInteger(total)||total<0||String(session.currency||"").toLowerCase()!=="usd")throw Error("Invalid payment amount");

 if(meta.invoice_order_id){
  const orderId=String(meta.invoice_order_id);
  if(!/^[0-9a-f-]{36}$/i.test(orderId))throw Error("Invoice reference invalid");
  const [ir,or]=await Promise.all([
   fetch(base+"/crm_order_invoices?select=order_id,mode,status,payment_intent_id&order_id=eq."+orderId+"&limit=1",{headers}),
   fetch(base+"/orders?select=id,status,total,customer_email,external_payment_id&id=eq."+orderId+"&limit=1",{headers})
  ]);
  if(!ir.ok||!or.ok)throw Error("Invoice settlement lookup failed");
  const invoice=(await ir.json())[0],order=(await or.json())[0];
  if(!invoice||!order||invoice.mode!=="invoice"||invoice.payment_intent_id!==id||Math.round(Number(order.total)*100)!==total||String(order.customer_email).toLowerCase()!==String(meta.customer_email||"").toLowerCase())
   throw Error("Payment cannot be matched to the original invoice");
  if(order.status==="paid"){
   if(order.external_payment_id!==id)throw Error("Invoice is already paid with a different payment");
   return true;
  }
  if(order.status!=="pending")throw Error("Invoice is not pending");
  const updated=await fetch(base+"/orders?id=eq."+orderId+"&status=eq.pending",{method:"PATCH",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify({status:"paid",external_payment_id:id,updated_at:new Date().toISOString()})});
  if(!updated.ok||(await updated.json()).length!==1)throw Error("Invoice payment could not be recorded");
  const track=await fetch(base+"/crm_order_invoices?order_id=eq."+orderId,{method:"PATCH",headers,body:JSON.stringify({status:"paid",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
  if(!track.ok)console.error("Invoice tracker update failed",track.status);
  return true;
 }
 const itemId=String(meta.product_id||"");
 const catalog=await loadCatalog();
 const item=catalog.find(x=>x.id===itemId);
 if(!item||total!==item.cents)throw Error("Payment does not match an active product");
 const details=(session.customer_details&&typeof session.customer_details==="object")?session.customer_details as Record<string,unknown>:{};
 const email=String(session.customer_email||details.email||meta.customer_email||"").slice(0,254);
 const orderId=crypto.randomUUID();
 const order={
  id:orderId,order_number:"AE-"+id.slice(-20),customer_email:email,
  customer_name:String(meta.customer_name||details.name||"").slice(0,150)||null,
  customer_first_name:String(meta.customer_first_name||"").slice(0,75)||null,
  customer_last_name:String(meta.customer_last_name||"").slice(0,75)||null,
  customer_phone:String(meta.customer_phone||"").slice(0,30)||null,
  status:"paid",subtotal:item.cents/100,total:total/100,currency:"USD",external_payment_id:id
 };
 const save=await fetch(base+"/orders",{method:"POST",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify(order)});
 if(save.status===409)return true;
 if(!save.ok)throw Error("Unable to record payment");
 let courseId:string|null=null;
 if(item.section==="Courses"&&!EXTENSION_ID.test(item.id)){
  const courseLookup=await fetch(base+"/courses?select=id&slug=eq."+encodeURIComponent(item.id)+"&status=eq.published&limit=1",{headers});
  if(courseLookup.ok){const courses=await courseLookup.json();courseId=courses[0]?.id||null}
 }
 const line={order_id:orderId,course_id:courseId,item_type:item.section==="Courses"?"course":(item.section==="Photography"||item.section==="Services")?"service":"product",item_name:item.title,quantity:1,unit_price:item.cents/100,line_total:item.cents/100};
 const itemRes=await fetch(base+"/order_items",{method:"POST",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify(line)});
 if(!itemRes.ok)throw Error("Payment recorded but order line failed");
 return true;
}

function htmlEsc(value:unknown){
 return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]||ch));
}
function serviceHeaders(key:string){
 return {apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"};
}
async function sendPurchasedInvite(intent:Record<string,unknown>){
 const meta=(intent.metadata&&typeof intent.metadata==="object")?intent.metadata as Record<string,string>:{};
 if(intent.status!=="succeeded"||meta.website!=="andreerving.com")return;
 const email=String(meta.customer_email||intent.receipt_email||"").trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return;
 const resendKey=(Deno.env.get("RESEND_API_KEY")||"").trim();
 const sbKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!resendKey||!sbKey){console.warn("Purchase invitation not configured");return}
 const base=(Deno.env.get("SUPABASE_URL")||"https://gnfyidajbectlppsekzj.supabase.co");
 const id=String(intent.id||"");
 const headers=serviceHeaders(sbKey);
 // Staff accounts, including the site owner, must not receive customer onboarding emails.
 const staffCheck=await fetch(base+"/rest/v1/rpc/is_staff_invite_email",{
  method:"POST",headers,body:JSON.stringify({p_email:email})
 });
 if(!staffCheck.ok){console.error("Invite eligibility could not be checked",staffCheck.status);return}
 if(await staffCheck.json()===true)return;
 const insert=await fetch(base+"/rest/v1/purchase_invite_deliveries",{
  method:"POST",headers:{...headers,Prefer:"resolution=ignore-duplicates,return=representation"},
  body:JSON.stringify({payment_intent_id:id,customer_email:email,status:"sending"})
 });
 if(!insert.ok){console.error("Invite tracker unavailable",insert.status);return}
 const inserted=await insert.json();
 if(!Array.isArray(inserted)||inserted.length===0){
  const retry=await fetch(base+"/rest/v1/purchase_invite_deliveries?payment_intent_id=eq."+encodeURIComponent(id)+"&status=eq.failed",{
   method:"PATCH",headers:{...headers,Prefer:"return=representation"},
   body:JSON.stringify({status:"sending",updated_at:new Date().toISOString(),last_error:null})
  });
  // Re-read the current state to avoid sending twice after a successful delivery.
  const tracked=await fetch(base+"/rest/v1/purchase_invite_deliveries?payment_intent_id=eq."+encodeURIComponent(id)+"&select=status,updated_at&limit=1",{headers});
  if(!tracked.ok)return;
  const rows=await tracked.json();
  if(rows[0]?.status!=="sending")return;
  if(!retry.ok)return;
  const claimed=await retry.json().catch(()=>[]);
  if(!Array.isArray(claimed)||claimed.length!==1)return;
 }
 let result="failed",failure="";
 try{
  const auth=async(type:string)=>{
   return await fetch(base+"/auth/v1/admin/generate_link",{
    method:"POST",headers,
    body:JSON.stringify({type,email,redirect_to:"https://app.andreerving.com/",
     data:{first_name:String(meta.customer_first_name||""),last_name:String(meta.customer_last_name||""),
      full_name:String(meta.customer_name||""),phone:String(meta.customer_phone||"")}})
   });
  };
  let linkType="invite";
  let generated=await auth("invite");
  if(!generated.ok){linkType="magiclink";generated=await auth("magiclink")}
  if(!generated.ok)throw Error("Account invitation link unavailable ("+generated.status+")");
  const authData=await generated.json();
  // Make the customer visible in CRM and associate paid purchases after Supabase creates their identity.
  const createdId=String(authData.user?.id||"");
  if(/^[a-f0-9-]{36}$/i.test(createdId)){
   try{
    const profile=await fetch(base+"/rest/v1/customer_profiles?select=id&id=eq."+createdId+"&limit=1",{headers});
    if(profile.ok&&!(await profile.json()).length){
     await fetch(base+"/rest/v1/customer_profiles",{method:"POST",headers:{...headers,Prefer:"resolution=ignore-duplicates,return=minimal"},
      body:JSON.stringify({id:createdId,email,full_name:String(meta.customer_name||"").trim()||null,phone:String(meta.customer_phone||"").trim()||null})});
    }
    const owned=await fetch(base+"/rest/v1/orders?select=id,user_id&customer_email=ilike."+encodeURIComponent(email)+"&status=in.(paid,completed)&limit=200",{headers});
    if(owned.ok){
     for(const order of await owned.json()){
      if(order.user_id&&order.user_id!==createdId)continue;
      if(!order.user_id)await fetch(base+"/rest/v1/orders?id=eq."+order.id+"&user_id=is.null",{method:"PATCH",headers,
       body:JSON.stringify({user_id:createdId})});
     }
    }
   }catch(e){console.error("Customer account linking needs reconciliation",e)}
  }
  // Link any existing paid course orders to the now-registered Auth account and grant the purchased program.
  try{
   const orderRows=await fetch(base+"/rest/v1/orders?select=id&customer_email=ilike."+encodeURIComponent(email)+"&status=in.(paid,completed)&limit=100",{headers});
   if(orderRows.ok){
    const orders=await orderRows.json();
    for(const order of orders){
     await fetch(base+"/rest/v1/rpc/grant_order_course_access",{method:"POST",headers,body:JSON.stringify({p_order_id:order.id})});
    }
   }
  }catch(e){console.error("Course enrollment reconciliation deferred",e)}
  // Supabase generates a single-use action link without sending its own email.
  const inviteHash=String(authData.properties?.hashed_token||authData.hashed_token||"");
  if(!/^[A-Za-z0-9_-]{12,300}$/.test(inviteHash))throw Error("Invalid invitation token returned");
  const activation=new URL("https://app.andreerving.com/invite.html");
  activation.searchParams.set("token_hash",inviteHash);
  activation.searchParams.set("type",linkType);
  const action=activation.toString();
  const title=htmlEsc(meta.customer_first_name||meta.customer_name||"there");
  const item=htmlEsc(String(intent.description||"your purchase"));
  const amount=(Number(intent.amount_received||0)/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
  const emailHtml='<!doctype html><html><body style="margin:0;background:#f2f5f9;padding:32px 14px;font-family:Arial,sans-serif;color:#122d4c"><div style="max-width:590px;margin:auto;background:#fff;border:1px solid #dfe7ef;border-radius:12px;overflow:hidden"><div style="padding:26px 32px;background:white;border-bottom:4px solid #c49a3a"><img src="https://gnfyidajbectlppsekzj.supabase.co/storage/v1/object/public/Andre%20Erving%20Public/logos/logo.png" alt="Andre Erving Growth Strategy Education" style="width:320px;max-width:100%;height:auto"></div><div style="padding:30px 32px"><h1 style="font-size:25px;margin:0 0 14px">Your purchase is confirmed</h1><p>Hello '+title+',</p><p>Thank you for your purchase. Your account invitation is ready.</p><div style="background:#f5f7fb;padding:18px;border-radius:9px;margin:22px 0"><strong>'+item+'</strong><div style="margin-top:7px;color:#47607c">'+htmlEsc(amount)+'</div></div><p><a href="'+htmlEsc(action)+'" style="display:inline-block;background:#1b4b9a;color:white;padding:14px 24px;border-radius:7px;text-decoration:none;font-weight:bold">Activate your account</a></p><p style="font-size:13px;color:#60758c">This secure invitation is intended for you. If you did not expect it, you may ignore this message.</p></div><div style="padding:20px 32px;background:#f7f9fc;font-size:12px;color:#6b7d90">Andre Erving · Growth, Strategy &amp; Education</div></div></body></html>';
  const outbound=await fetch("https://api.resend.com/emails",{
   method:"POST",
   headers:{"Authorization":"Bearer "+resendKey,"Content-Type":"application/json","Idempotency-Key":"invite-"+id},
   body:JSON.stringify({from:"Andre Erving <accounts@andreerving.com>",to:[email],subject:"Your Andre Erving purchase and account invitation",html:emailHtml,text:"Your purchase is confirmed. Activate your account: "+action})
  });
  if(!outbound.ok)throw Error("Resend rejected invitation ("+outbound.status+")");
  result="sent";
 }catch(e){failure=String(e).slice(0,400);console.error("Purchase invite delivery issue",failure)}
 const updated=await fetch(base+"/rest/v1/purchase_invite_deliveries?payment_intent_id=eq."+encodeURIComponent(id),{
  method:"PATCH",headers,body:JSON.stringify({status:result,sent_at:result==="sent"?new Date().toISOString():null,last_error:failure||null,updated_at:new Date().toISOString()})
 });
 if(!updated.ok)console.error("Invite delivery status not persisted",updated.status);
}


async function sendManualInvoiceReceipt(intent:Record<string,unknown>){
 const meta=intent.metadata as Record<string,string>||{},id=String(meta.invoice_order_id||"");
 if(!/^[a-f0-9-]{36}$/i.test(id))return;
 const b=bookingBase(),h=bookingHeaders();
 const [a,o]=await Promise.all([fetch(b+"/crm_order_invoices?select=receipt_sent_at&order_id=eq."+id+"&limit=1",{headers:h}),fetch(b+"/orders?select=order_number,customer_email,customer_name,total,status&id=eq."+id+"&limit=1",{headers:h})]);
 if(!a.ok||!o.ok)throw Error("Receipt records unavailable");
 const metaRow=(await a.json())[0],order=(await o.json())[0];
 if(!metaRow||!order||order.status!=="paid"||metaRow.receipt_sent_at)return;
 const resend=Deno.env.get("RESEND_API_KEY")||"";if(!resend)throw Error("Receipt email not configured");
 const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]||ch));
 const body='<!doctype html><html><body style="margin:0;padding:30px 12px;background:#edf2f9;font:15px Arial,sans-serif;color:#183452"><table role="presentation" style="margin:auto;max-width:600px;width:100%;background:white;border-collapse:collapse"><tr><td style="padding:26px;text-align:center;border-bottom:4px solid #c99632"><img src="https://gnfyidajbectlppsekzj.supabase.co/storage/v1/object/public/Andre%20Erving%20Public/logos/logo.png" alt="Andre Erving" width="330" style="max-width:100%;height:auto"></td></tr><tr><td style="padding:30px"><h1>Payment Received</h1><p>Thank you, '+esc(order.customer_name||"customer")+'. Your order is paid.</p><p><strong>Order:</strong> '+esc(order.order_number)+'</p><p><strong>Amount paid:</strong> $'+Number(order.total).toFixed(2)+'</p><p>Your account invitation is sent separately. Your purchase will be available in your customer portal.</p></td></tr></table></body></html>';
 const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+resend,"Content-Type":"application/json","Idempotency-Key":"crm-receipt-"+id},body:JSON.stringify({from:Deno.env.get("PURCHASE_EMAIL_FROM")||"Andre Erving <support@andreerving.com>",to:[order.customer_email],subject:"Andre Erving Payment Receipt — "+order.order_number,html:body})});
 if(!sent.ok)throw Error("Receipt delivery rejected");
 await fetch(b+"/crm_order_invoices?order_id=eq."+id,{method:"PATCH",headers:h,body:JSON.stringify({receipt_sent_at:new Date().toISOString()})});
}

async function sendSessionInvite(session:Record<string,unknown>){
 if(session.payment_status!=="paid")return;
 const meta=(session.metadata&&typeof session.metadata==="object")?session.metadata as Record<string,string>:{};
 if(meta.website!=="andreerving.com")return;
 const details=(session.customer_details&&typeof session.customer_details==="object")?session.customer_details as Record<string,string>:{};
 const email=String(session.customer_email||details.email||meta.customer_email||"");
 await sendPurchasedInvite({
  id:String(session.id||""),status:"succeeded",description:String(meta.product_name||"your purchase"),
  receipt_email:email,amount_received:Number(session.amount_total||0),
  metadata:{...meta,customer_email:email,customer_name:String(meta.customer_name||details.name||"")}
 });
}

async function validStripeSignature(body:string,signature:string,secret:string){
 const parts=Object.fromEntries(signature.split(",").map(p=>p.split("=",2)));
 const timestamp=Number(parts.t);
 if(!Number.isFinite(timestamp)||Math.abs(Date.now()/1000-timestamp)>300||!parts.v1)return false;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const bytes=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(parts.t+"."+body)));
 const digest=Array.from(bytes).map(x=>x.toString(16).padStart(2,"0")).join("");
 if(digest.length!==parts.v1.length)return false;
 let diff=0;for(let i=0;i<digest.length;i++)diff|=digest.charCodeAt(i)^parts.v1.charCodeAt(i);
 return diff===0;
}


// Payment Element fulfillment reuses the existing verified order writer.
// Only succeeded PaymentIntents retrieved server-side from Stripe are persisted.

const coachingIds=new Set(["sales-coaching-products","sales-coaching-services","conflict-resolution-negotiation-skills","career-transition-development","leadership-skills-team-dynamics","goal-setting-action-planning","skill-development-continuous-learning","time-management-productivity","effective-communication-skills","emotional-intelligence-development","mindset-motivation-coaching","stress-management-resilience-building","work-life-balance-strategies","personal-branding-networking"]);
function bookingHeaders(){
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!key)throw Error("Booking credentials unavailable");
 return {apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"};
}
const bookingBase=()=>((Deno.env.get("SUPABASE_URL")||"https://gnfyidajbectlppsekzj.supabase.co")+"/rest/v1");
async function bookingRpc(action:string,args:Record<string,unknown>){
 const res=await fetch(bookingBase()+"/rpc/"+action,{method:"POST",headers:bookingHeaders(),body:JSON.stringify(args)});
 if(!res.ok)throw Error("Booking operation unavailable");
 return await res.json();
}
async function activeBooking(token:string,offeringId:string,intentId=""){
 if(!/^[0-9a-f-]{36}$/i.test(token))return null;
 const query="?select=id,starts_at,ends_at,hold_expires_at,payment_intent_id&hold_token=eq."+encodeURIComponent(token)+"&offering_id=eq."+encodeURIComponent(offeringId)+"&status=eq.held&limit=1";
 const res=await fetch(bookingBase()+"/coaching_slots"+query,{headers:bookingHeaders()});
 if(!res.ok)throw Error("Could not verify booking");
 const rows=await res.json();
 const booking=rows?.[0];
 if(!booking||new Date(booking.hold_expires_at).getTime()<=Date.now())return null;
 if(intentId&&booking.payment_intent_id!==intentId)return null;
 return booking;
}


const CONFIRMATION_WINDOW_MS=5*60*1000;
function confirmationExpiry(started:string|number){
 const startedMs=typeof started==="number"?started*1000:Date.parse(started);
 if(!Number.isFinite(startedMs))return null;
 return new Date(startedMs+CONFIRMATION_WINDOW_MS).toISOString();
}
function expiredConfirmation(expiry:string|null){return !expiry||Date.now()>=Date.parse(expiry)}

async function ebookDownload(productId:string,seconds=300){
 if(!/^ebook-[a-z0-9-]+$/.test(productId))return {available:false};
 const base=(Deno.env.get("SUPABASE_URL")||"https://gnfyidajbectlppsekzj.supabase.co");
 const headers=bookingHeaders();
 const lookup=await fetch(base+"/rest/v1/ebook_documents?select=storage_path,file_name&offering_id=eq."+encodeURIComponent(productId)+"&limit=1",{headers});
 if(!lookup.ok)throw Error("Document lookup unavailable");
 const docs=await lookup.json();
 if(!Array.isArray(docs)||docs.length===0)return {available:false};
 const path=String(docs[0].storage_path);
 if(!path.startsWith(productId+"/")||path.includes(".."))throw Error("Invalid document path");
 const parts=path.split("/").map(encodeURIComponent).join("/");
 const signed=await fetch(base+"/storage/v1/object/sign/ebook-files/"+parts,{method:"POST",headers,body:JSON.stringify({expiresIn:Math.max(1,Math.min(300,Math.floor(seconds)))})});
 if(!signed.ok)throw Error("Unable to prepare secure download");
 const json=await signed.json();
 const url=String(json.signedURL||json.signedUrl||"");
 if(!url.startsWith("/object/sign/ebook-files/"))throw Error("Invalid download URL");
 return {available:true,url:base+"/storage/v1"+url,fileName:String(docs[0].file_name||"ebook.pdf"),expiresIn:Math.floor(seconds)};
}
async function recordFreeEbookOrder(id:string,name:string,email:string,firstName:string,lastName:string,phone:string,item:{id:string,title:string,cents:number,section:string}){
 const base=bookingBase(),headers=bookingHeaders(),reference="free_"+id;
 const existing=await fetch(base+"/orders?select=id&external_payment_id=eq."+encodeURIComponent(reference)+"&limit=1",{headers});
 if(!existing.ok)throw Error("Unable to inspect complimentary order");
 const found=await existing.json();
 if(Array.isArray(found)&&found.length)return true;
 const orderId=crypto.randomUUID();
 const order={id:orderId,order_number:"AE-FREE-"+id.slice(0,12).toUpperCase(),
  external_payment_id:reference,status:"paid",customer_email:email,customer_name:name,
  customer_first_name:firstName,customer_last_name:lastName,customer_phone:phone,
  subtotal:0,total:0,currency:"USD"};
 const save=await fetch(base+"/orders",{method:"POST",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify(order)});
 if(save.status===409)return true;
 if(!save.ok)throw Error("Could not record complimentary order");
 const line={order_id:orderId,item_type:"product",item_name:item.title,quantity:1,unit_price:0,line_total:0};
 const lineSave=await fetch(base+"/order_items",{method:"POST",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify(line)});
 if(!lineSave.ok)throw Error("Complimentary order line unavailable");
 return true;
}
async function sha256(value:string){
 const bytes=new TextEncoder().encode(value);
 const hash=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
 return Array.from(hash).map(x=>x.toString(16).padStart(2,"0")).join("");
}


const EXTENSION_ID=/^extension-([a-f0-9-]{36})$/i;
async function extensionAuthorization(token:string,productId:string,intentId=""){
 const match=EXTENSION_ID.exec(productId);
 if(!match||!token||token.length>160)return null;
 const hash=await sha256(token);
 const base=bookingBase(),headers=bookingHeaders();
 const response=await fetch(base+"/course_extension_checkout_tokens?select=*&token_hash=eq."+hash+"&limit=1",{headers});
 if(!response.ok)throw Error("Extension authorization lookup failed");
 const record=(await response.json())[0];
 if(!record||record.course_id!==match[1]||record.used_at||Date.parse(record.expires_at)<Date.now())return null;
 if(record.payment_intent_id&&record.payment_intent_id!==intentId)return null;
 const [enrollmentResponse,priceResponse,userResponse]=await Promise.all([
 fetch(base+"/course_enrollments?select=id,user_id,expires_at,status&id=eq."+record.enrollment_id+"&limit=1",{headers}),
 fetch(base+"/course_extension_prices?select=amount,enabled&course_id=eq."+record.course_id+"&limit=1",{headers}),
 fetch((Deno.env.get("SUPABASE_URL")||"https://gnfyidajbectlppsekzj.supabase.co")+"/auth/v1/admin/users/"+record.user_id,{headers})
 ]);
 if(!enrollmentResponse.ok||!priceResponse.ok||!userResponse.ok)throw Error("Extension eligibility lookup failed");
 const enrollment=(await enrollmentResponse.json())[0],price=(await priceResponse.json())[0],account=await userResponse.json();
 if(!enrollment||enrollment.user_id!==record.user_id||enrollment.id!==record.enrollment_id||
 !enrollment.expires_at||Date.parse(enrollment.expires_at)>Date.now()||enrollment.status==="cancelled"||
 !price?.enabled||Number(price.amount)<=0||!account?.email)return null;
 return {hash,record,email:String(account.email).toLowerCase(),cents:Math.round(Number(price.amount)*100)};
}
async function fulfillPaidExtension(intent:Record<string,unknown>){
 const meta=(intent.metadata||{}) as Record<string,string>;
 const id=String(meta.product_id||"");
 if(!EXTENSION_ID.test(id))return;
 const tokenHash=String(meta.extension_token_hash||"");
 const courseId=id.slice(10);
 const paymentReference=String(intent.id||"");
 const key=bookingHeaders(),base=bookingBase();
 if(!/^[0-9a-f]{64}$/.test(tokenHash)||!/^pi_[A-Za-z0-9]+$/.test(paymentReference))throw Error("Invalid extension authorization");
 const tokenRes=await fetch(base+"/course_extension_checkout_tokens?select=*&token_hash=eq."+tokenHash+"&payment_intent_id=eq."+encodeURIComponent(paymentReference)+"&limit=1",{headers:key});
 if(!tokenRes.ok)throw Error("Extension verification unavailable");
 const token=(await tokenRes.json())[0];
 if(!token||token.course_id!==courseId||token.user_id!==meta.extension_user_id)throw Error("Extension customer mismatch");
 if(intent.status!=="succeeded"||String(intent.currency).toLowerCase()!=="usd")throw Error("Unpaid extension");
 const orderRes=await fetch(base+"/orders?select=id,status,total,customer_email&external_payment_id=eq."+encodeURIComponent(paymentReference)+"&limit=1",{headers:key});
 if(!orderRes.ok)throw Error("Paid extension order lookup failed");
 const order=(await orderRes.json())[0];
 if(!order||order.status!=="paid"||String(order.customer_email).toLowerCase()!==String(meta.customer_email||"").toLowerCase())throw Error("Paid extension order invalid");
 const rpc=await fetch(base+"/rpc/fulfill_paid_course_extension",{method:"POST",headers:key,
  body:JSON.stringify({p_payment_reference:paymentReference,p_order_id:order.id,p_user_id:token.user_id,p_course_id:courseId})});
 if(!rpc.ok)throw Error("Could not grant paid extension");
 await fetch(base+"/course_extension_checkout_tokens?token_hash=eq."+tokenHash,{method:"PATCH",headers:key,body:JSON.stringify({used_at:new Date().toISOString()})});
}

// Referral credit is computed only after the verified Stripe PaymentIntent succeeds.
async function verifiedAffiliateClick(id:string){
 if(!/^[0-9a-f-]{36}$/i.test(id))return null;
 const base=bookingBase(),h=bookingHeaders();
 const row=await fetch(base+"/affiliate_clicks?select=id,affiliate_id,expires_at&id=eq."+id+"&expires_at=gt."+new Date().toISOString()+"&limit=1",{headers:h});
 if(!row.ok)return null;
 const click=(await row.json())[0];if(!click)return null;
 const p=await fetch(base+"/affiliate_profiles?select=id,email,commission_rate,status&id=eq."+click.affiliate_id+"&limit=1",{headers:h});
 if(!p.ok)return null;const affiliate=(await p.json())[0];
 return affiliate?.status==="active"?{click,affiliate}:null;
}
async function recordAffiliateCommission(intent:Record<string,unknown>){
 const meta=(intent.metadata||{}) as Record<string,string>,clickId=String(meta.affiliate_click_id||"");
 if(intent.status!=="succeeded"||!clickId||!/^pi_[A-Za-z0-9]+$/.test(String(intent.id||"")))return;
 const verified=await verifiedAffiliateClick(clickId);if(!verified)return;
 const customer=String(meta.customer_email||intent.receipt_email||"").trim().toLowerCase();
 if(customer===String(verified.affiliate.email).toLowerCase())return;
 const total=Number(intent.amount_received)/100;
 if(!Number.isFinite(total)||total<=0)return;
 const base=bookingBase(),h=bookingHeaders(),intentId=String(intent.id);
 const present=await fetch(base+"/affiliate_conversions?select=payment_intent_id&payment_intent_id=eq."+encodeURIComponent(intentId)+"&limit=1",{headers:h});
 if(!present.ok)throw Error("Commission ledger unavailable");
 if((await present.json()).length)return;
 const st=await fetch(base+"/affiliate_settings?select=hold_days&id=eq.true&limit=1",{headers:h});
 if(!st.ok)throw Error("Commission settings unavailable");
 const hold=Number((await st.json())[0]?.hold_days??30),rate=Number(verified.affiliate.commission_rate);
 const amount=Math.round(total*rate)/100;
 const orderRes=await fetch(base+"/orders?select=id&external_payment_id=eq."+encodeURIComponent(intentId)+"&limit=1",{headers:h});
 const orderId=orderRes.ok?(await orderRes.json())[0]?.id||null:null;
 const payload={payment_intent_id:intentId,affiliate_id:verified.affiliate.id,click_id:verified.click.id,order_id:orderId,customer_email:customer||null,gross_amount:total,commission_rate:rate,commission_amount:amount,status:"pending",available_at:new Date(Date.now()+hold*86400000).toISOString()};
 const save=await fetch(base+"/affiliate_conversions",{method:"POST",headers:{...h,Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify(payload)});
 if(!save.ok)throw Error("Could not record affiliate commission ("+save.status+")");
}

async function recordPaidIntent(intent:Record<string,unknown>){
 if(intent.status!=="succeeded"||typeof intent.id!=="string")return false;
 const meta=(intent.metadata&&typeof intent.metadata==="object")?intent.metadata as Record<string,string>:{};
 if(!meta.invoice_order_id&&coachingIds.has(String(meta.product_id||""))){
  const completed=await bookingRpc("finalize_coaching_payment",{p_intent_id:String(intent.id),p_offering_id:String(meta.product_id),p_name:String(meta.customer_name||""),p_email:String(meta.customer_email||intent.receipt_email||"")});
  if(!completed)throw Error("Paid coaching booking requires manual reconciliation");
 }
 const stored=await recordPaidSession({
  id:intent.id,payment_status:"paid",amount_total:intent.amount_received,
  currency:intent.currency,metadata:meta,customer_email:intent.receipt_email||meta.customer_email||"",
  customer_details:{email:meta.customer_email||""}
 });
 if(stored){await fulfillPaidExtension(intent);await recordAffiliateCommission(intent)}
 return stored;
}

Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 const stripeSignature=req.headers.get("stripe-signature");
 if(stripeSignature){
  const secret=Deno.env.get("STRIPE_WEBHOOK_SECRET")||"";
  const raw=await req.text();
  if(!secret||!await validStripeSignature(raw,stripeSignature,secret))return reply({error:"Invalid webhook signature"},400);
  let event:Record<string,unknown>;
  try{event=JSON.parse(raw)}catch{return reply({error:"Invalid event"},400)}
  if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(String(event.type))){
   const data=event.data as Record<string,unknown>|undefined;
   const obj=data?.object as Record<string,unknown>|undefined;
   const sessionId=String(obj?.id||"");
   const apiSecret=(Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"").trim().replace(/^["\x27]|["\x27]$/g,"");
   if(!/^cs_(test|live)_[A-Za-z0-9_]+$/.test(sessionId))return reply({error:"Invalid session"},400);
   const fetchSession=await fetch("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(sessionId),{headers:{Authorization:"Bearer "+apiSecret}});
   if(!fetchSession.ok)return reply({error:"Unable to retrieve verified session"},500);
   try{const session=await fetchSession.json();await recordPaidSession(session);await sendSessionInvite(session);await sendManualInvoiceReceipt({metadata:session.metadata||{}})}catch(e){console.error("Stripe fulfillment error",e);return reply({error:"Order persistence failed"},500)}
  }
  if(String(event.type)==="payment_intent.succeeded"){
   const data=event.data as Record<string,unknown>|undefined;
   const obj=data?.object as Record<string,unknown>|undefined;
   const intentId=String(obj?.id||"");
   if(!/^pi_[A-Za-z0-9]+$/.test(intentId))return reply({error:"Invalid payment intent"},400);
   const key=(Deno.env.get("STRIPE_SECRET_KEY")||Deno.env.get("STRIPE_RESTRICTED_KEY")||"").trim().replace(/^["\x27]|["\x27]$/g,"");
   const fetched=await fetch("https://api.stripe.com/v1/payment_intents/"+encodeURIComponent(intentId),{headers:{Authorization:"Bearer "+key}});
   if(!fetched.ok)return reply({error:"Unable to verify payment"},500);
   try{const paid=await fetched.json();await recordPaidIntent(paid);await sendPurchasedInvite(paid);await sendManualInvoiceReceipt(paid)}catch(e){console.error("Payment Intent order error",e);return reply({error:"Unable to save order"},500)}
  }
  return reply({received:true});
 }

 if(origin&&!origins.has(origin))return reply({error:"Origin not allowed"},403,origin);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origins.has(origin)?origin:"https://andreerving.com","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"content-type,apikey,authorization,x-client-info","Vary":"Origin"}});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405,origin);
 let input:Record<string,unknown>;
 try{input=await req.json()}catch{return reply({error:"Invalid JSON"},400,origin)}
 const action=String(input.action||"catalog");


 if(action==="free_ebook_claim"){
  const id=String(input.productId||"");
  const firstName=String(input.firstName||"").trim().slice(0,75);
  const lastName=String(input.lastName||"").trim().slice(0,75);
  const phone=String(input.phone||"").trim().slice(0,30);
  const name=(firstName+" "+lastName).trim();
  const email=String(input.email||"").trim().toLowerCase().slice(0,254);
  if(!id.startsWith("ebook-")||!firstName||!lastName||phone.replace(/\D/g,"").length<7||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:"Valid first name, last name, phone, and email are required"},400,origin);
  try{
   const catalog=await loadCatalog(),item=catalog.find(x=>x.id===id&&x.section==="Resources"&&x.cents===0);
   if(!item)return reply({error:"Free eBook unavailable"},404,origin);
   const token=crypto.randomUUID()+"-"+crypto.randomUUID();
   const hash=await sha256(token);
   const save=await fetch(bookingBase()+"/ebook_free_claims",{method:"POST",headers:{...bookingHeaders(),Prefer:"return=minimal"},body:JSON.stringify({offering_id:id,email,name,first_name:firstName,last_name:lastName,phone,access_token_hash:hash})});
   if(!save.ok)throw Error("Unable to record free eBook claim");
   await recordFreeEbookOrder(hash,name,email,firstName,lastName,phone,item);
   try{
    await sendPurchasedInvite({
     id:"free_"+hash.slice(0,48),status:"succeeded",description:item.title,amount_received:0,
     metadata:{website:"andreerving.com",product_id:id,customer_email:email,customer_name:name,
      customer_first_name:firstName,customer_last_name:lastName,customer_phone:phone}
    });
   }catch(error){console.error("Free order invitation attempt failed",error)}
   return reply({token,productId:id},200,origin);
  }catch(e){console.error("Free claim issue",e);return reply({error:"Unable to complete your free eBook order"},503,origin)}
 }
 if(action==="verify_free_ebook"){
  const token=String(input.token||"");
  if(!/^[0-9a-f-]{73}$/i.test(token))return reply({error:"Invalid order authorization"},403,origin);
  try{
   const hash=await sha256(token);
   const response=await fetch(bookingBase()+"/ebook_free_claims?select=offering_id,email,name,first_name,last_name,phone,claimed_at&access_token_hash=eq."+hash+"&limit=1",{headers:bookingHeaders()});
   if(!response.ok)throw Error("Order lookup unavailable");
   const rows=await response.json();const claim=rows?.[0];
   if(!claim)return reply({error:"Free eBook order not found"},404,origin);
   const expiresAt=confirmationExpiry(claim.claimed_at);
   if(expiredConfirmation(expiresAt))return reply({error:"This confirmation page has expired. Sign in to your portal to view your receipt and downloads.",expired:true},410,origin);
   const remainingSeconds=Math.max(1,Math.floor((Date.parse(expiresAt!)-Date.now())/1000));
   const catalog=await loadCatalog(),item=catalog.find(p=>p.id===claim.offering_id&&p.section==="Resources"&&p.cents===0);
   if(!item)return reply({error:"eBook unavailable"},404,origin);
   try{await recordFreeEbookOrder(hash,claim.name,claim.email,claim.first_name||"",claim.last_name||"",claim.phone||"",item)}
   catch(e){console.error("Free order record issue",e)}
   const download=await ebookDownload(item.id,remainingSeconds);
   try{await sendPurchasedInvite({
    id:"free_"+hash.slice(0,48),status:"succeeded",description:item.title,amount_received:0,
    metadata:{website:"andreerving.com",product_id:item.id,customer_email:claim.email,
     customer_name:claim.name,customer_first_name:claim.first_name||"",customer_last_name:claim.last_name||"",
     customer_phone:claim.phone||""}
   })}catch(e){console.error("Free invitation retry error",e)}
   const receipt={orderNumber:"AE-FREE-"+hash.slice(0,12).toUpperCase(),date:claim.claimed_at,
     name:claim.name,email:claim.email,item:item.title,quantity:1,amount:0,currency:"USD",paymentId:""};
   return reply({payment_status:"paid",productId:item.id,receipt,download,free:true,expiresAt},200,origin);
  }catch(e){console.error("Free order verification issue",e);return reply({error:"Unable to verify free eBook order"},503,origin)}
 }


 if(action==="coaching_slots"){
  try{
   const date=new Date();
   const res=await fetch(bookingBase()+"/coaching_slots?select=id,starts_at,ends_at&status=eq.open&starts_at=gt."+encodeURIComponent(new Date(date.getTime()+3600000).toISOString())+"&order=starts_at.asc&limit=250",{headers:bookingHeaders()});
   if(!res.ok)throw Error("Unable to fetch times");
   return reply({slots:await res.json(),timezone:"America/Chicago"},200,origin);
  }catch{return reply({error:"Availability is temporarily unavailable"},503,origin)}
 }
 if(action==="coaching_hold"){
  const productId=String(input.productId||"");
  const slotId=String(input.slotId||"");
  if(!coachingIds.has(productId)||!/^[0-9a-f-]{36}$/i.test(slotId))return reply({error:"Invalid coaching session or timeslot"},400,origin);
  try{
   const rows=await bookingRpc("hold_coaching_slot",{p_slot_id:slotId,p_offering_id:productId});
   if(!Array.isArray(rows)||rows.length!==1)return reply({error:"That appointment is no longer available. Select another time."},409,origin);
   return reply({holdToken:rows[0].hold_token,startsAt:rows[0].starts_at,endsAt:rows[0].ends_at,expiresAt:rows[0].hold_expires_at},200,origin);
  }catch{return reply({error:"Unable to reserve this appointment"},503,origin)}
 }

 let catalog:Item[]=[];
 if(action==="catalog"||action==="session"||action==="intent"){try{catalog=await loadCatalog()}catch(e){console.error("Pricing catalog error",e);return reply({error:"Pricing catalog unavailable"},503,origin)}}
 const readStripeKey=(name:string)=>{
  let value=(Deno.env.get(name)||"").trim();
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1).trim();
  return value;
 };
 const secret=readStripeKey("STRIPE_SECRET_KEY")||readStripeKey("STRIPE_RESTRICTED_KEY");
 const publishable=readStripeKey("STRIPE_PUBLISHABLE_KEY");
 const secretType=(secret.startsWith("sk_live_")||secret.startsWith("rk_live_"))?"live":(secret.startsWith("sk_test_")||secret.startsWith("rk_test_"))?"test":secret?"invalid":"missing";
 const publishableType=publishable.startsWith("pk_live_")?"live":publishable.startsWith("pk_test_")?"test":publishable?"invalid":"missing";
 const test=secretType==="test"&&publishableType==="test";
 const live=secretType==="live"&&publishableType==="live";
 if(action==="invoice_lookup"){
  const found=await findCrmInvoice(String(input.token||""));
  if(!found)return reply({error:"Invoice not found or link has expired"},404,origin);
  const {meta,order,items}=found;
  return reply({invoice:{orderNumber:order.order_number,customerName:order.customer_name,customerEmail:order.customer_email,firstName:order.customer_first_name,lastName:order.customer_last_name,phone:order.customer_phone,status:order.status,total:Number(order.total),currency:order.currency,createdAt:order.created_at,items,priceKey:meta.price_key,payable:order.status==="pending"&&meta.status==="sent"}},200,origin);
 }
 if(action==="catalog"){
  const configured={secret:Boolean(secret),publishable:Boolean(publishable),ready:test||live};
  if(!configured.ready)console.warn("Checkout key configuration incomplete",{secretType,publishableType});
  return reply({items:catalog,mode:live?"live":test?"test":"unconfigured",configured,diagnostics:configured.ready?undefined:{secretType,publishableType}},200,origin);
 }
 if(!test&&!live)return reply({error:"Stripe payment credentials are not configured"},503,origin);
 if(action==="intent"){
  const id=String(input.productId||"");
  const item=catalog.find(x=>x.id===id);
  if(!item)return reply({error:"This pricing plan is unavailable"},400,origin);
  const invoiceToken=String(input.invoiceToken||"");
  const inv=invoiceToken?await findCrmInvoice(invoiceToken):null;
  if(invoiceToken&&(!inv||inv.meta.status!=="sent"||inv.order.status!=="pending"))return reply({error:"Invoice is no longer payable"},409,origin);
  if(inv&&inv.meta.price_key!=="offering."+id)return reply({error:"Invoice offering mismatch"},403,origin);
  if(inv&&Math.round(Number(inv.order.total)*100)<=0)return reply({error:"Invoice has no amount due"},409,origin);
  if(inv?.meta.payment_intent_id){
   const prior=await fetch("https://api.stripe.com/v1/payment_intents/"+encodeURIComponent(inv.meta.payment_intent_id),{headers:{Authorization:"Bearer "+secret}});
   if(prior.ok){
    const existing=await prior.json();
    if(existing.metadata?.invoice_order_id===inv.order.id&&["requires_payment_method","requires_confirmation"].includes(existing.status)){
     return reply({clientSecret:existing.client_secret,intentId:existing.id,publishableKey:publishable,productId:id,amount:existing.amount},200,origin);
    }
    if(existing.status==="succeeded"||existing.status==="processing")return reply({error:"Invoice payment is already processing or paid"},409,origin);
   }
   return reply({error:"Invoice has an existing payment attempt. Contact support if you need to retry."},409,origin);
  }
  const affiliateClickId=String(input.affiliateClickId||"");
  const eligibleAffiliate=!inv&&affiliateClickId?await verifiedAffiliateClick(affiliateClickId):null;
  const bookingToken=String(input.bookingToken||"");
  const extensionToken=String(input.extensionToken||"");
  const extension=!inv&&EXTENSION_ID.test(id)?await extensionAuthorization(extensionToken,id).catch(()=>null):null;
  if(!inv&&EXTENSION_ID.test(id)&&(!extension||extension.cents!==item.cents))return reply({error:"Extension authorization expired or invalid. Return to your customer portal."},403,origin);
  const booking=!inv&&coachingIds.has(id)?await activeBooking(bookingToken,id).catch(()=>null):null;
  if(!inv&&coachingIds.has(id)&&!booking)return reply({error:"Select an available appointment before paying. Your previous selection may have expired."},409,origin);
  const fields=new URLSearchParams();
  if(booking){fields.set("metadata[booking_token]",bookingToken);fields.set("metadata[coaching_start]",booking.starts_at);fields.set("metadata[slot_id]",booking.id)}
  if(extension){fields.set("metadata[extension_token_hash]",extension.hash);fields.set("metadata[extension_user_id]",extension.record.user_id);fields.set("metadata[customer_email]",extension.email)}
  fields.set("amount",String(inv?Math.round(Number(inv.order.total)*100):item.cents));
  fields.set("currency","usd");
  fields.set("automatic_payment_methods[enabled]","true");
  fields.set("automatic_payment_methods[allow_redirects]","never");
  fields.set("description",item.title);
  fields.set("metadata[product_id]",id);
  fields.set("metadata[website]","andreerving.com");
  if(eligibleAffiliate)fields.set("metadata[affiliate_click_id]",eligibleAffiliate.click.id);
  if(inv){
   fields.set("metadata[invoice_order_id]",inv.order.id);
   fields.set("metadata[customer_email]",inv.order.customer_email);
   fields.set("metadata[customer_name]",inv.order.customer_name||"");
   fields.set("metadata[customer_first_name]",inv.order.customer_first_name||"");
   fields.set("metadata[customer_last_name]",inv.order.customer_last_name||"");
   fields.set("receipt_email",inv.order.customer_email);
  }
  try{
   const res=await fetch("https://api.stripe.com/v1/payment_intents",{
    method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/x-www-form-urlencoded"},
    body:fields.toString()
   });
   const json=await res.json();
   if(!res.ok||!json.client_secret||!json.id){
    console.error("Payment Intent creation failed",json?.error?.code||res.status);
    return reply({error:"Could not prepare secure payment. Check the restricted Stripe key has Payment Intents write access."},502,origin);
   }
   if(inv){
    const attached=await fetch(inv.base+"/crm_order_invoices?order_id=eq."+inv.order.id+"&status=eq.sent&payment_intent_id=is.null",{method:"PATCH",headers:{...inv.headers,Prefer:"return=representation"},body:JSON.stringify({payment_intent_id:json.id})});
    if(!attached.ok||(await attached.json()).length!==1){
     await fetch("https://api.stripe.com/v1/payment_intents/"+encodeURIComponent(json.id)+"/cancel",{method:"POST",headers:{Authorization:"Bearer "+secret}}).catch(()=>{});
     return reply({error:"Invoice already has a payment attempt. Reload the invoice."},409,origin);
    }
   }
   if(extension){
    const attached=await fetch(bookingBase()+"/course_extension_checkout_tokens?token_hash=eq."+extension.hash+"&payment_intent_id=is.null",{method:"PATCH",
     headers:{...bookingHeaders(),Prefer:"return=representation"},body:JSON.stringify({payment_intent_id:json.id})});
    if(!attached.ok||(await attached.json()).length!==1)return reply({error:"Extension checkout authorization could not be attached"},409,origin);
   }
   if(booking){
    const attached=await bookingRpc("attach_coaching_payment",{p_token:bookingToken,p_offering_id:id,p_intent_id:json.id});
    if(!attached)return reply({error:"Appointment hold expired. Please choose a new time."},409,origin);
   }
   return reply({clientSecret:json.client_secret,intentId:json.id,publishableKey:publishable,productId:id,amount:inv?Math.round(Number(inv.order.total)*100):item.cents},200,origin);
  }catch{return reply({error:"Payment processor unavailable"},502,origin)}
 }
 if(action==="prepare"){
  const intentId=String(input.intentId||"");
  const firstName=String(input.firstName||"").trim().slice(0,75);
  const lastName=String(input.lastName||"").trim().slice(0,75);
  const name=(firstName+" "+lastName).trim();
  const phone=String(input.phone||"").trim().slice(0,30);
  const email=String(input.email||"").trim().toLowerCase().slice(0,254);
  if(!/^pi_[A-Za-z0-9]+$/.test(intentId)||!firstName||!lastName||phone.replace(/\D/g,"").length<7||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:"Valid first name, last name, phone, email and payment intent required"},400,origin);
  const stripeHeaders={Authorization:"Bearer "+secret};
  const suppliedClientSecret=String(input.clientSecret||"");
  try{
   const found=await fetch("https://api.stripe.com/v1/payment_intents/"+encodeURIComponent(intentId),{headers:stripeHeaders});
   if(!found.ok)return reply({error:"Payment details unavailable"},502,origin);
   const intent=await found.json();
   if(!suppliedClientSecret||suppliedClientSecret!==intent.client_secret)return reply({error:"Payment authorization required"},403,origin);
   if(!["requires_payment_method","requires_confirmation"].includes(intent.status)||intent.metadata?.website!=="andreerving.com")return reply({error:"Cannot update this payment"},409,origin);
   if(intent.metadata?.invoice_order_id){
    const response=await fetch(bookingBase()+"/orders?select=customer_email,status&id=eq."+encodeURIComponent(String(intent.metadata.invoice_order_id))+"&limit=1",{headers:bookingHeaders()});
    if(!response.ok)return reply({error:"Invoice unavailable"},502,origin);
    const invoiceOrder=(await response.json())[0];
    if(!invoiceOrder||invoiceOrder.status!=="pending"||email!==String(invoiceOrder.customer_email).toLowerCase())return reply({error:"Email must match the invoice recipient"},403,origin);
   }
   if(EXTENSION_ID.test(String(intent.metadata?.product_id||""))){
    const expectedEmail=String(intent.metadata?.customer_email||"").toLowerCase();
    if(email!==expectedEmail)return reply({error:"The email must match the account that owns the expired course"},403,origin);
   }
   if(!intent.metadata?.invoice_order_id&&coachingIds.has(String(intent.metadata?.product_id||""))){
    const reservation=await activeBooking(String(intent.metadata?.booking_token||""),String(intent.metadata.product_id),intentId);
    if(!reservation)return reply({error:"Your appointment hold expired. Please select an available time again."},409,origin);
   }
   const fields=new URLSearchParams();
   fields.set("receipt_email",email);
   fields.set("metadata[customer_email]",email);
   fields.set("metadata[customer_name]",name);
   fields.set("metadata[customer_first_name]",firstName);
   fields.set("metadata[customer_last_name]",lastName);
   fields.set("metadata[customer_phone]",phone);
   const updated=await fetch("https://api.stripe.com/v1/payment_intents/"+encodeURIComponent(intentId),{
    method:"POST",headers:{...stripeHeaders,"Content-Type":"application/x-www-form-urlencoded"},body:fields.toString()
   });
   if(!updated.ok)return reply({error:"Unable to prepare your receipt details"},502,origin);
   return reply({ready:true},200,origin);
  }catch{return reply({error:"Payment service unavailable"},502,origin)}
 }
 if(action==="verify_intent"){
  const intentId=String(input.intentId||"");
  const clientSecret=String(input.clientSecret||"");
  if(!/^pi_[A-Za-z0-9]+$/.test(intentId)||!clientSecret.startsWith(intentId+"_secret_"))return reply({error:"Invalid payment authorization"},400,origin);
  try{
   const res=await fetch("https://api.stripe.com/v1/payment_intents/"+encodeURIComponent(intentId),{headers:{Authorization:"Bearer "+secret}});
   if(!res.ok)return reply({error:"Payment verification unavailable"},502,origin);
   const intent=await res.json();
   if(clientSecret!==intent.client_secret||intent.metadata?.website!=="andreerving.com")return reply({error:"Payment authorization required"},403,origin);
   let expiresAt:string|null=null;
   if(intent.status==="succeeded"){
    let purchasedAt=Number(intent.created||0);
    if(intent.latest_charge){
     try{
      const chargeRes=await fetch("https://api.stripe.com/v1/charges/"+encodeURIComponent(String(intent.latest_charge)),{headers:{Authorization:"Bearer "+secret}});
      if(chargeRes.ok){const charge=await chargeRes.json();if(charge.paid&&Number(charge.created)>0)purchasedAt=Number(charge.created)}
     }catch(e){console.warn("Could not obtain charge timestamp",e)}
    }
    expiresAt=confirmationExpiry(purchasedAt);
    if(expiredConfirmation(expiresAt))return reply({error:"This confirmation page has expired. Sign in to your portal to view your receipt and downloads.",expired:true},410,origin);
    try{await recordPaidIntent(intent);await sendPurchasedInvite(intent);await sendManualInvoiceReceipt(intent)}catch(e){console.error("Order saving error",e);return reply({error:"Payment succeeded, but order recording requires support. Please keep your Stripe receipt."},503,origin)}
   }
   const meta=(intent.metadata&&typeof intent.metadata==="object")?intent.metadata:{};
   const receipt=intent.status==="succeeded"?{
    orderNumber:"AE-"+intentId.slice(-20),
    paymentId:intentId,
    date:new Date(Number(intent.created||Date.now()/1000)*1000).toISOString(),
    name:String(meta.customer_name||""),email:String(meta.customer_email||intent.receipt_email||""),
    item:String(intent.description||"Purchased service"),appointmentStart:coachingIds.has(String(meta.product_id||""))?String(meta.coaching_start||""):null,quantity:1,
    amount:Number(intent.amount_received||intent.amount||0),currency:String(intent.currency||"usd").toUpperCase()
   }:null;
   const secondsRemaining=expiresAt?Math.max(1,Math.floor((Date.parse(expiresAt)-Date.now())/1000)):300;
   const download=intent.status==="succeeded"?await ebookDownload(String(meta.product_id||""),secondsRemaining):null;
   return reply({payment_status:intent.status==="succeeded"?"paid":intent.status==="processing"?"processing":"unpaid",status:intent.status,productId:meta.product_id||null,receipt,download,expiresAt},200,origin);
  }catch{return reply({error:"Payment verification unavailable"},502,origin)}
 }
 if(action==="session"){
  const id=String(input.productId||"");
  if(coachingIds.has(id)||EXTENSION_ID.test(id))return reply({error:"This purchase requires an authorized enrollment or booking."},409,origin);
  const item=catalog.find(x=>x.id===id);
  if(!item)return reply({error:"This pricing plan is unavailable"},400,origin);
  const email=String(input.email||"").trim();
  const name=String(input.name||"").trim().slice(0,150);
  if((email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||email.length>254||(name&&name.length<2))return reply({error:"Invalid customer information"},400,origin);
  const fields=new URLSearchParams();
  fields.set("mode","payment");fields.set("ui_mode","embedded_page");
  fields.set("line_items[0][price_data][currency]","usd");
  fields.set("line_items[0][price_data][unit_amount]",String(item.cents));
  fields.set("line_items[0][price_data][product_data][name]",item.title);
  fields.set("line_items[0][quantity]","1");
  fields.set("redirect_on_completion","if_required");
  fields.set("return_url","https://andreerving.com/checkout.html?complete=1&session_id={CHECKOUT_SESSION_ID}");
  fields.set("client_reference_id",crypto.randomUUID());
  fields.set("metadata[product_id]",id);fields.set("metadata[website]","andreerving.com");
  if(name)fields.set("metadata[customer_name]",name);
  if(email)fields.set("customer_email",email);
  fields.set("name_collection[individual][enabled]","true");
  try{
   const res=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/x-www-form-urlencoded"},body:fields.toString()});
   const json=await res.json();
   if(!res.ok||!json.client_secret||!json.id){console.error("Stripe session error",json?.error?.code||res.status);return reply({error:json?.error?.message||"Cannot create payment session"},502,origin)}
   return reply({clientSecret:json.client_secret,sessionId:json.id,publishableKey:publishable,mode:live?"live":"test",productId:id,amount:item.cents},200,origin);
  }catch{return reply({error:"Payment processor unavailable"},502,origin)}
 }
 if(action==="verify"){
  const sessionId=String(input.sessionId||"");
  if(!/^cs_(test|live)_[A-Za-z0-9_]+$/.test(sessionId)||sessionId.length>220)return reply({error:"Invalid payment session"},400,origin);
  try{
   const res=await fetch("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(sessionId),{headers:{Authorization:"Bearer "+secret}});
   if(!res.ok)return reply({error:"Verification unavailable"},502,origin);
   const session=await res.json();
   if(session.payment_status==="paid"){try{await recordPaidSession(session);await sendSessionInvite(session);await sendManualInvoiceReceipt({metadata:session.metadata||{}})}catch(e){console.error("Order persistence problem",e);return reply({error:"Payment succeeded but order recording failed; contact support with your Stripe receipt"},503,origin)}}
   return reply({payment_status:session.payment_status,status:session.status,productId:session.metadata?.product_id||null},200,origin)
  }catch{return reply({error:"Verification unavailable"},502,origin)}
 }
 return reply({error:"Unknown action"},400,origin);
});