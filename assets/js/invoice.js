(()=>{
 'use strict';
 const API='https://gnfyidajbectlppsekzj.supabase.co/functions/v1/andre-embedded-checkout';
 const key='sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf';
 const qs=new URLSearchParams(location.search),token=qs.get('token')||'';
 const el=id=>document.getElementById(id),money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)||0);
 async function start(){
  if(!/^[a-f0-9]{64}$/i.test(token)){el('invoice-message').hidden=true;el('invoice-error').textContent='This invoice link is invalid.';el('invoice-error').hidden=false;return}
  try{
   const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',apikey:key},body:JSON.stringify({action:'invoice_lookup',token})});
   const json=await res.json().catch(()=>({}));
   if(!res.ok||!json.invoice)throw Error(json.error||'Invoice could not be loaded');
   const i=json.invoice;
   el('invoice-customer').textContent=i.customerName||'Customer';
   el('invoice-email').textContent=i.customerEmail||'';
   el('invoice-number').textContent=i.orderNumber||'';
   el('invoice-date').textContent=i.createdAt?new Date(i.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}):'';
   el('invoice-status').textContent=i.status==='paid'?'Paid':'Awaiting payment';
   const body=el('invoice-items');body.replaceChildren();
   for(const line of i.items||[]){
    const tr=document.createElement('tr');
    for(const value of [line.item_name,String(line.quantity||1),money(line.line_total)]){
     const td=document.createElement('td');td.textContent=value;if(td===tr.lastChild)td.className='invoice-right';tr.appendChild(td);
    }
    tr.lastChild.className='invoice-right';body.appendChild(tr);
   }
   el('invoice-total').textContent=i.status==='paid'?money(0):money(i.total);
   el('invoice-details').hidden=false;
   el('invoice-message').textContent='Review your invoice and pay securely below.';
   if(i.status==='paid'){el('invoice-paid').hidden=false;return}
   if(!i.payable){el('invoice-message').textContent='This invoice is not currently payable. Contact support for assistance.';return}
   const pay=el('invoice-pay');pay.href='checkout.html?invoice='+encodeURIComponent(token);pay.hidden=false;
  }catch(e){el('invoice-message').hidden=true;el('invoice-error').textContent=e.message||'Invoice unavailable';el('invoice-error').hidden=false}
 }
 void start();
})();