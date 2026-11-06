/* Andre Erving secure, on-page Stripe Embedded Checkout.
 * Every amount and product's Stripe Price ID is selected server-side.
 * Card details are collected only inside Stripe's mounted, PCI-compliant iframe.
 */
(()=>{
 'use strict';
 const API='https://gnfyidajbectlppsekzj.supabase.co/functions/v1/andre-embedded-checkout';
 const publicKey='sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf';
 const nodes={
  products:document.getElementById('checkout-products'),
  payment:document.getElementById('checkout-embedded'),
  placeholder:document.getElementById('checkout-payment-placeholder'),
  error:document.getElementById('checkout-error'),
  summary:document.getElementById('summary-item'),
  price:document.getElementById('summary-price'),
  total:document.getElementById('summary-total'),
  image:document.getElementById('checkout-summary-image'),
  success:document.getElementById('checkout-success'),
  mode:document.getElementById('checkout-mode')
 };
 if(Object.values(nodes).some(n=>!n))return;
 const qs=new URLSearchParams(location.search);
 const requested=String(qs.get('item')||qs.get('product')||qs.get('course')||'').toLowerCase();
 const priceKey=String(qs.get('price_key')||'').toLowerCase();
 const known=[
  {id:'trucking-pro',title:'Trucking Pro',cents:22500,currency:'usd',image:'assets/images/course-trucking.webp'},
  {id:'freight-broker-training',title:'Freight Broker Training',cents:14500,currency:'usd',image:'assets/images/course-broker.webp'},
  {id:'dispatcher-training',title:'Dispatcher Training',cents:12500,currency:'usd',image:'assets/images/course-dispatch.webp'},
  {id:'time-management',title:'Time Management',cents:12500,currency:'usd',image:'assets/images/course-time.webp'}
 ];
 let products=known,selected=null,embedded=null,mountVersion=0,ready=false,config={secret:false,publishable:false};
 const format=(cents,currency)=>new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD'}).format(cents/100);
 const setError=message=>{
  nodes.error.textContent=message||'';
  nodes.error.hidden=!message;
 };
 const setPlaceholder=(title,detail)=>{
  nodes.placeholder.hidden=false;nodes.placeholder.replaceChildren();
  const icon=document.createElement('span');icon.className='checkout-lock';icon.textContent='🔒';
  const strong=document.createElement('strong');strong.textContent=title;
  const p=document.createElement('p');p.textContent=detail;
  nodes.placeholder.append(icon,strong,p);
 };
 async function request(action,extra={}){
  const response=await fetch(API,{method:'POST',headers:{
    'Content-Type':'application/json','apikey':publicKey
   },body:JSON.stringify({action,...extra})});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload){
   throw new Error(payload?.error||'The secure payment service is not available.');
  }
  return payload;
 }
 function pickedFromLink(){
  const slugFromKey=priceKey.startsWith('course.')?priceKey.split('.')[1]:priceKey.split('.price.')[0];
  const hints=(requested+' '+slugFromKey).replace(/[^a-z0-9]+/g,'-');
  const match=products.find(p=>{
   const name=p.title.toLowerCase();
   return requested===p.id||requested===name||requested.includes(name)||
     hints.includes(p.id)||hints.includes(name.replace(/[^a-z0-9]+/g,'-'));
  });
  return match?.id||null;
 }
 function select(id,initialize=true){
  const product=products.find(p=>p.id===id);if(!product)return;
  selected=id;
  nodes.summary.textContent=product.title;
  nodes.price.textContent=format(product.cents,product.currency);
  nodes.total.textContent=format(product.cents,product.currency);
  nodes.image.replaceChildren();
  const cover=document.createElement('img');cover.src=product.image;cover.alt='';
  nodes.image.append(cover);
  nodes.products.querySelectorAll('[role="radio"]').forEach(el=>{
    el.setAttribute('aria-checked',String(el.dataset.id===id));
  });
  if(initialize){
    const newUrl=new URL(location.href);
    newUrl.searchParams.set('product',id);
    newUrl.searchParams.delete('item');
    newUrl.searchParams.delete('price_key');
    history.replaceState(null,'',newUrl.pathname+newUrl.search);
    void mountCheckout(id);
  }
 }
 function draw(){
  nodes.products.replaceChildren();
  for(const p of products){
   const button=document.createElement('button');button.type='button';
   button.className='checkout-product';button.setAttribute('role','radio');
   button.dataset.id=p.id;button.setAttribute('aria-checked','false');
   button.addEventListener('click',()=>select(p.id));
   const circle=document.createElement('span');circle.className='checkout-product-check';circle.setAttribute('aria-hidden','true');
   const cover=document.createElement('span');cover.className='checkout-product-icon';
   const img=document.createElement('img');img.src=p.image;img.alt='';img.loading='lazy';cover.append(img);
   const name=document.createElement('span');name.className='checkout-product-name';name.textContent=p.title;
   const sub=document.createElement('small');sub.textContent='Online course · one-time purchase';name.append(sub);
   const price=document.createElement('strong');price.className='checkout-product-price';price.textContent=format(p.cents,p.currency);
   button.append(circle,cover,name,price);nodes.products.append(button);
  }
  nodes.products.addEventListener('keydown',e=>{
   if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
   const index=products.findIndex(p=>p.id===selected);
   const move=(e.key==='ArrowUp'||e.key==='ArrowLeft')?-1:1;
   const next=(index+move+products.length)%products.length;
   const button=nodes.products.querySelectorAll('[role="radio"]')[next];
   if(button){e.preventDefault();button.focus();select(products[next].id);}
  });
 }
 async function mountCheckout(id){
  const version=++mountVersion;
  setError('');
  nodes.success.hidden=true;
  if(embedded){
   try{embedded.destroy()}catch{}
   embedded=null;
  }
  nodes.payment.hidden=true;nodes.payment.replaceChildren();
  setPlaceholder('Preparing your secure payment form','This takes place directly on AndreErving.com.');
  if(!ready){
   setPlaceholder('Payment processing requires setup','The administrator must connect Stripe test credentials before the on-page payment form can load.');
   return;
  }
  if(typeof window.Stripe!=='function'){
   setError('The secure card form could not load. Check your connection and reload the page.');
   return;
  }
  try{
   const session=await request('session',{productId:id});
   if(version!==mountVersion)return;
   const stripe=window.Stripe(session.publishableKey);
   embedded=await stripe.initEmbeddedCheckout({
    fetchClientSecret:()=>Promise.resolve(session.clientSecret),
    onComplete:()=>{
      if(version!==mountVersion)return;
      nodes.payment.hidden=true;
      nodes.placeholder.hidden=true;
      nodes.success.hidden=false;
      nodes.success.querySelector('p').textContent='Stripe confirms the payment step is complete. Access your customer account for the next steps.';
      setError('');
    }
   });
   if(version!==mountVersion){embedded.destroy();embedded=null;return;}
   nodes.placeholder.hidden=true;nodes.payment.hidden=false;
   embedded.mount('#checkout-embedded');
  }catch(err){
   if(version!==mountVersion)return;
   nodes.payment.hidden=true;
   setPlaceholder('Unable to load the payment form','Your card information has not been collected.');
   setError(err?.message||'Please try again or contact support.');
  }
 }
 async function verifyReturn(){
  const sessionId=qs.get('session_id')||'';
  if(!sessionId)return false;
  setPlaceholder('Verifying payment','Checking the payment status with Stripe.');
  try{
   const data=await request('verify',{sessionId});
   if(data.payment_status==='paid'){
    nodes.payment.hidden=true;nodes.placeholder.hidden=true;
    nodes.success.hidden=false;
    nodes.success.querySelector('p').textContent='Your payment was successfully confirmed by Stripe. Sign in to your customer account for the next steps.';
    if(data.productId&&products.some(p=>p.id===data.productId))select(data.productId,false);
    return true;
   }
   setError('This payment has not been confirmed. No purchase is marked complete.');
  }catch(err){setError(err?.message||'Unable to verify this payment.');}
  return false;
 }
 async function start(){
  try{
   const data=await request('catalog');
   if(Array.isArray(data.items)&&data.items.length){
    const match=new Map(known.map(p=>[p.id,p]));
    products=data.items.filter(p=>match.has(p.id)&&Number.isSafeInteger(p.cents)&&p.cents>=0)
      .map(p=>({...match.get(p.id),cents:p.cents,currency:p.currency||'usd'}));
   }
   config=data.configured||config;
   ready=Boolean(config.secret&&config.publishable);
   nodes.mode.textContent=data.mode==='live'?'LIVE PAYMENT':'STRIPE TEST MODE · No real charges';
  }catch(err){
   setError('The secure catalog is unavailable. Payment processing cannot begin.');
   ready=false;
  }
  draw();
  const selectedFromLink=pickedFromLink();
  if(selectedFromLink)select(selectedFromLink,false);
  else if(requested||priceKey){
   const warning=document.createElement('p');
   warning.className='checkout-error';warning.textContent='The product you followed is not available for online payment yet. Choose one of the available courses below.';
   nodes.products.prepend(warning);
  }
  if(await verifyReturn())return;
  if(selected)void mountCheckout(selected);
  else setPlaceholder('Select a product above','The secure card and billing form will appear here after selection.');
 }
 void start();
})();