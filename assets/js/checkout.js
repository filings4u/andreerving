/* Andre Erving direct checkout. Product comes from purchase link; payment stays on this page. */
(()=>{
 'use strict';
 const API='https://gnfyidajbectlppsekzj.supabase.co/functions/v1/andre-embedded-checkout';
 const apiKey='sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf';
 const qs=new URLSearchParams(location.search);
 const $=id=>document.getElementById(id);
 const el={order:$('checkout-order'),empty:$('checkout-empty'),form:$('checkout-customer-form'),
  name:$('checkout-name'),first:$('checkout-first-name'),last:$('checkout-last-name'),email:$('checkout-email'),phone:$('checkout-phone'),continue:$('checkout-continue'),
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
 const invoiceToken=qs.get('invoice')||'';
 const priceKey=(qs.get('price_key')||'').toLowerCase().trim();
 const nameFromLink=(qs.get('item')||qs.get('product')||qs.get('course')||'').trim().slice(0,180);
 const canonical=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const format=(cents,currency='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format(cents/100);
 let product=null,stripe=null,elements=null,paymentElement=null,intentId=null,clientSecret=null,ready=false,version=0;
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
  showError('');
  const current=++version;
  el.continue.disabled=true;el.continue.hidden=true;
  showPlaceholder('Loading secure payment','Payment methods are loading automatically.');
  try{
   if(!ready)throw Error('Stripe payment credentials are not configured.');
   if(typeof window.Stripe!=='function')throw Error('Stripe could not load. Please refresh the page.');
   await window.AEAffiliateReferral?.ready;const referral=window.AEAffiliateReferral?.get?.();const data=await call('intent',{productId:product.id,bookingToken:qs.get('booking_token')||'',extensionToken:qs.get('extension_token')||'',invoiceToken,affiliateClickId:referral?.clickId||''});
   if(current!==version)return;
   if(!data.clientSecret||!data.intentId||!data.publishableKey)throw Error('Could not create your secure payment session.');
   clientSecret=data.clientSecret;intentId=data.intentId;
   stripe=window.Stripe(data.publishableKey);
   elements=stripe.elements({clientSecret,appearance:{theme:'stripe',variables:{fontFamily:'Inter, system-ui, sans-serif',colorPrimary:'#123b66',colorText:'#10243e',colorBackground:'#ffffff',colorDanger:'#a72a34',borderRadius:'9px',spacingUnit:'4px'}}});
   paymentElement=elements.create('payment',{layout:{type:'accordion',defaultCollapsed:false,radios:true,spacedAccordionItems:true}});
   el.payment.hidden=false;el.payment.replaceChildren();
   paymentElement.mount(el.payment);
   el.placeholder.hidden=true;
   el.continue.hidden=false;el.continue.disabled=false;el.continue.textContent='Pay '+format(product.cents,product.currency);
  }catch(err){
   el.payment.hidden=true;
   showPlaceholder('Secure payment unavailable','Your order has not been charged.');
   showError(err.message||'Unable to load payment methods.');
   el.continue.disabled=false;el.continue.hidden=false;el.continue.textContent='Try loading secure payment again';
  }
 }
 el.form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!stripe||!elements||!intentId||!clientSecret){await mount();return}
  if(!el.form.reportValidity())return;
  if(el.phone.value.replace(/\D/g,'').length<7){showError('Enter a valid telephone number.');el.phone.focus();return}
  const button=el.continue;button.disabled=true;button.textContent='Processing secure payment…';showError('');
  try{
   await call('prepare',{intentId,clientSecret,firstName:el.first.value.trim(),lastName:el.last.value.trim(),email:el.email.value.trim(),phone:el.phone.value.trim()});
   sessionStorage.setItem('ae_intent_'+intentId,clientSecret);
   const result=await stripe.confirmPayment({elements,confirmParams:{return_url:new URL('checkout-success.html',location.href).href},redirect:'if_required'});
   if(result.error)throw Error(result.error.message||'Stripe could not confirm the payment.');
   location.assign('checkout-success.html?payment_intent='+encodeURIComponent(intentId));
  }catch(err){showError(err.message||'Payment confirmation failed.');button.disabled=false;button.textContent='Pay '+format(product.cents,product.currency)}
 });
 function prefillPhotoCustomer(){
  try{
    const raw=sessionStorage.getItem('ae_checkout_customer');
    if(!raw)return;
    const customer=JSON.parse(raw);
    if(customer.packageId!==canonical(nameFromLink))return;
    if(typeof customer.name==='string'){const parts=customer.name.trim().split(/\s+/);el.first.value=parts.shift()||'';el.last.value=parts.join(' ');el.name.value=customer.name.slice(0,150)}
    if(typeof customer.email==='string')el.email.value=customer.email.slice(0,254);
     if(typeof customer.phone==='string')el.phone.value=customer.phone.slice(0,32);
  }catch{}
 }
 async function init(){
  // A visit to checkout.html by itself is an empty cart, not a product-selection page.
  if(!nameFromLink&&!qs.has('session_id')&&!invoiceToken){
   el.summary.textContent='No item selected';el.price.textContent='—';el.total.textContent='—';
   showUnavailable('Your cart is empty','Select a course or product on AndreErving.com, then use its checkout button.');
   return;
  }
  try{
   const data=await call('catalog');
   const items=(Array.isArray(data.items)?data.items:[]).filter(p=>/^[a-z0-9-]+$/.test(String(p.id||''))&&typeof p.title==='string'&&p.title.trim().length>0&&Number.isSafeInteger(p.cents)&&p.cents>=0).map(p=>({...p,image:images[p.id]||'assets/images/hero-training.webp',currency:p.currency||'USD'}));
   const invoice=invoiceToken?(await call('invoice_lookup',{token:invoiceToken})).invoice:null;
   if(invoiceToken&&(!invoice||!invoice.payable))throw Error('This invoice is already paid, cancelled, or unavailable.');
   const selected=invoice?items.find(p=>p.id===String(invoice.priceKey||'').replace(/^offering\./,'')):resolve(items);
   if(invoice&&selected){
    selected.cents=Math.round(Number(invoice.total)*100);
    selected.title=(invoice.items?.[0]?.item_name||selected.title)+' — Invoice '+invoice.orderNumber;
   }

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
   if(invoice){
    el.first.value=invoice.firstName||'';
    el.last.value=invoice.lastName||'';
    el.name.value=invoice.customerName||[invoice.firstName,invoice.lastName].filter(Boolean).join(' ');
    el.email.value=invoice.customerEmail||'';
    el.email.readOnly=true;
    el.phone.value=invoice.phone||'';
    const note=document.querySelector('.checkout-section-head .small-note');
    if(note)note.textContent='Secure payment for invoice '+invoice.orderNumber+'. The billing email is locked to the invoice recipient.';
    const heading=document.querySelector('.checkout-section-head h2');
    if(heading)heading.textContent='Invoice billing information';
   }
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