/* Andre Erving direct checkout. Product comes from purchase link; payment stays on this page. */
(()=>{
 'use strict';
 const API='https://gnfyidajbectlppsekzj.supabase.co/functions/v1/andre-embedded-checkout';
 const apiKey='sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf';
 const qs=new URLSearchParams(location.search);
 const $=id=>document.getElementById(id);
 const el={order:$('checkout-order'),empty:$('checkout-empty'),form:$('checkout-customer-form'),
  name:$('checkout-name'),email:$('checkout-email'),continue:$('checkout-continue'),
  payment:$('checkout-embedded'),placeholder:$('checkout-payment-placeholder'),
  error:$('checkout-error'),success:$('checkout-success'),mode:$('checkout-mode'),
  summary:$('summary-item'),price:$('summary-price'),total:$('summary-total'),image:$('checkout-summary-image')};
 if(Object.values(el).some(v=>!v))return;
 const images={
  "trucking-pro":"assets/images/course-trucking.webp",
  "freight-broker-training":"assets/images/course-broker.webp",
  "dispatcher-training":"assets/images/course-dispatch.webp",
  "time-management":"assets/images/course-time.webp"
 };
 const priceKey=(qs.get('price_key')||'').toLowerCase().trim();
 const nameFromLink=(qs.get('item')||qs.get('product')||qs.get('course')||'').trim().slice(0,180);
 const canonical=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const format=(cents,currency='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format(cents/100);
 let product=null,embedded=null,ready=false,sessionSecret=null,version=0;
 function showError(text){el.error.textContent=text||'';el.error.hidden=!text}
 function showPlaceholder(title,detail){
  el.placeholder.hidden=false;
  const icon=document.createElement('span');icon.className='checkout-lock';icon.textContent='🔒';
  const h=document.createElement('strong');h.textContent=title;
  const p=document.createElement('p');p.textContent=detail;
  el.placeholder.replaceChildren(icon,h,p);
 }
 function setProduct(p){
  el.summary.textContent=p.title;
  el.price.textContent=format(p.cents,p.currency);
  el.total.textContent=format(p.cents,p.currency);
  const isPhoto=/^(birthday|kids|portraits)-/.test(p.id);
  const subtitle=el.summary.parentElement?.querySelector('span');
  if(subtitle)subtitle.textContent=isPhoto?'Photography session package':'Digital learning product';
  const note=document.querySelector('.checkout-section-head .small-note');
  if(note)note.textContent=isPhoto?'Enter the details for your booking receipt.':'Enter the contact information for your receipt and course access.';
  const back=document.querySelector('.checkout-options a:first-child');
  if(back&&isPhoto){back.textContent='← Back to photography';back.href='photography.html';}
  const crumbs=document.querySelector('.checkout-trail a[href="courses.html"]');
  if(crumbs&&isPhoto){crumbs.href='photography.html';crumbs.textContent='Photography';}
  const successLink=el.success.querySelector('a');
  if(successLink&&isPhoto)successLink.hidden=true;
  el.image.replaceChildren();
  const img=document.createElement('img');img.src=p.image||'assets/images/hero-training.webp';img.alt='';el.image.append(img);
 }
 function showUnavailable(title,detail){
  el.order.hidden=true;
  el.empty.hidden=false;
  el.empty.querySelector('h2').textContent=title;
  el.empty.querySelector('p').textContent=detail;
 }
 async function call(action,options={}){
  const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':apiKey},body:JSON.stringify({action,...options})});
  const value=await response.json().catch(()=>null);
  if(!response.ok||!value)throw new Error(value?.error||'Secure checkout service unavailable.');
  return value;
 }
 function resolve(items){
  // Only products supplied by the authenticated catalog endpoint are purchasable.
  const id=canonical(nameFromLink);
  const key=priceKey.startsWith("offering.")?priceKey.slice(9):"";
  const legacy={
   "trucking-pro.price.1":"trucking-pro","trucking-pro.price.2":"trucking-pro-lifetime","trucking-pro.price.3":"trucking-pro-coaching",
   "how-to-start-and-opeate-a-trucking-company.price.1":"trucking-pro",
   "how-to-start-and-opeate-a-trucking-company.price.2":"trucking-pro-lifetime",
   "how-to-start-and-opeate-a-trucking-company.price.3":"trucking-pro-coaching",
   "freight-broker-training.price.1":"freight-broker-training",
   "freight-broker-training.price.2":"freight-broker-lifetime",
   "freight-broker-training.price.3":"broker-coaching-shippers-carriers",
   "dispatcher-training.price.1":"dispatcher-training","dispatcher-training.price.2":"dispatcher-plus-one",
   "dispatcher-training.price.3":"dispatcher-plus-two","time-management.price.1":"time-management",
   "dot-specimen-collector-training.price.1":"dot-collector",
   "dot-specimen-collector-training.price.2":"dot-hair",
   "dot-specimen-collector-training.price.3":"dot-trainer",
   "broker-packages.price.1":"broker-package-1","broker-packages.price.2":"broker-package-2",
   "broker-packages.price.3":"broker-package-3","broker-packages.price.4":"broker-package-4",
   "trucking-packages.price.1":"trucking-package-1","trucking-packages.price.2":"trucking-package-2",
   "trucking-packages.price.3":"trucking-package-3"
  };
  const prefix=priceKey.split(".price.")[0];
  const trustedLegacy=legacy[priceKey]&&id&&(id===prefix||id.startsWith(prefix+"-option-")||id.startsWith(prefix+"-package-")||id.startsWith("trucking-package-")||priceKey.startsWith("broker-packages.")&&["freight-agent","rate-con","no-tarp","dead-head"].includes(id));
  const selected=key||(trustedLegacy?legacy[priceKey]:id);
  if(!selected)return null;
  const exact=items.find(p=>p.id===selected||canonical(p.title)===selected);
  if(!exact)return null;
  if(key&&id&&id!==key&&id!==canonical(exact.title))return null;
  return exact;
 }
 async function verifyReturnedPayment(){
  const sessionId=qs.get('session_id')||'';
  if(!sessionId)return false;
  try{
   const result=await call('verify',{sessionId});
   if(result.payment_status==='paid'){
    el.success.hidden=false;el.form.hidden=true;
    el.success.querySelector('p').textContent='Stripe has verified payment for your order. We will follow up with the next steps for your selected service.';
    if(result.productId){if(product&&product.id===result.productId)setProduct(product);}
    return true;
   }
   showError('Payment has not been confirmed. You have not been marked as paid.');
  }catch(err){showError(err.message||'Unable to confirm payment.');}
  return false;
 }
 async function mount(){
  if(!product)return;
  // Stripe Checkout securely collects name and email directly.
  showError('');
  const current=++version;
  el.continue.disabled=true;el.continue.textContent='Preparing secure payment…';el.continue.hidden=true;
  el.payment.hidden=true;el.payment.replaceChildren();
  showPlaceholder('Loading secure payment','Your card form will load here without leaving this page.');
  try{
   if(!ready)throw Error('Stripe server credentials are not configured yet. Payments cannot be accepted.');
   if(typeof window.Stripe!=='function')throw Error('The secure Stripe library did not load. Please reload the page.');
   if(embedded){embedded.destroy();embedded=null;}
   const session=await call('session',{productId:product.id,email:el.email.value.trim(),name:el.name.value.trim()});
   if(current!==version)return;
   if(!session.clientSecret||!session.publishableKey)throw Error('Payment session was not created.');
   const stripe=window.Stripe(session.publishableKey);
   embedded=await stripe.initEmbeddedCheckout({
    fetchClientSecret:()=>Promise.resolve(session.clientSecret),
    onComplete:async()=>{
     if(current!==version)return;
     el.payment.hidden=true;el.placeholder.hidden=true;
     el.success.hidden=false;el.form.hidden=true;
     el.success.querySelector('p').textContent=/^(birthday|kids|portraits)-/.test(product?.id||'')?'Payment completed. We will follow up about your photography session.':'Payment completed. You can sign in to your customer account for next steps.';
    }
   });
   if(current!==version){embedded.destroy();embedded=null;return;}
   el.placeholder.hidden=true;el.payment.hidden=false;
   embedded.mount('#checkout-embedded');
   el.continue.hidden=true;
  }catch(err){
   el.payment.hidden=true;
   showPlaceholder('Secure payment unavailable','No payment details have been collected.');
   showError(err.message||'We could not create your payment session.');
   el.continue.disabled=false;el.continue.hidden=false;el.continue.textContent='Try loading payment again';
  }
 }
 el.form.addEventListener('submit',event=>{event.preventDefault();void mount()});
 function prefillPhotoCustomer(){
  try{
    const raw=sessionStorage.getItem('ae_checkout_customer');
    if(!raw)return;
    const customer=JSON.parse(raw);
    if(customer.packageId!==canonical(nameFromLink))return;
    if(typeof customer.name==='string')el.name.value=customer.name.slice(0,150);
    if(typeof customer.email==='string')el.email.value=customer.email.slice(0,254);
  }catch{}
 }
 async function init(){
  // A visit to checkout.html by itself is an empty cart, not a product-selection page.
  if(!nameFromLink&&!qs.has('session_id')){
   el.summary.textContent='No item selected';el.price.textContent='—';el.total.textContent='—';
   showUnavailable('Your cart is empty','Select a course or product on AndreErving.com, then use its checkout button.');
   return;
  }
  try{
   const data=await call('catalog');
   const items=(Array.isArray(data.items)?data.items:[]).filter(p=>/^[a-z0-9-]+$/.test(String(p.id||''))&&typeof p.title==='string'&&p.title.trim().length>0&&Number.isSafeInteger(p.cents)&&p.cents>=0).map(p=>({...p,image:images[p.id]||'assets/images/hero-training.webp',currency:p.currency||'USD'}));
   const selected=resolve(items);
   ready=Boolean(data.configured?.secret&&data.configured?.publishable);
   el.mode.textContent=data.mode==='live'?'LIVE PAYMENT':'STRIPE TEST MODE · No real charges';
   if(await verifyReturnedPayment())return;
   if(!selected){
    const name=nameFromLink||'This order';
    el.summary.textContent=name;el.price.textContent='Not configured';el.total.textContent='—';
    const photoServices=new Set(['photography','wedding','fashion','full-body','engagement','prom-send-off','event-photography']);
    const unpricedPhoto=photoServices.has(canonical(name));
    showUnavailable(unpricedPhoto?'Photography checkout price pending':'Payment is not configured for this item',unpricedPhoto?'This photography service does not yet have a published checkout price. No payment is possible until its price is configured.':'“'+name+'” does not have a verified Stripe price for this checkout. No other product or price will be substituted.');
    return;
   }
   product=selected;setProduct(product);prefillPhotoCustomer();
   if(!ready){
    showPlaceholder('Secure payment not configured','Payment credentials must be configured on the server before this card form can load.');
    showError('Stripe is not configured for this checkout. The order cannot be paid yet.');
    el.continue.disabled=true;el.continue.textContent='Payment unavailable';
    return;
   }
   showPlaceholder('Loading secure checkout','Your information and payment fields are loading securely through Stripe.');
   void mount();
  }catch(err){
   showUnavailable('Checkout temporarily unavailable','We could not load the secure order information. Please try again shortly.');
   showError(err.message||'Unable to load checkout.');
  }
 }
 void init();
})();