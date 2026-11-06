/* Andre Erving public-site navigation and live forms */
const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav-links');
if(toggle&&nav){
 toggle.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded',String(open));
  toggle.textContent=open?'Close':'Menu';
 });
 document.querySelectorAll('.nav-group>button').forEach(btn=>btn.addEventListener('click',()=>{
  if(window.innerWidth<=1150)btn.parentElement.classList.toggle('open');
 }));
}
const toast=document.querySelector('.toast');
function showToast(msg){
 if(!toast)return;
 toast.textContent=msg;toast.classList.add('show');
 setTimeout(()=>toast.classList.remove('show'),3600);
}
const AE_API='https://gnfyidajbectlppsekzj.supabase.co/rest/v1/';
const AE_PUBLIC='sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf';
async function sendPublicForm(table,data){
 const result=await fetch(AE_API+table,{
   method:'POST',
   headers:{'apikey':AE_PUBLIC,'Content-Type':'application/json','Prefer':'return=minimal'},
   body:JSON.stringify(data)
 });
 if(!result.ok){
   const body=await result.json().catch(()=>null);
   const error=new Error(body?.message||'Submission could not be completed. Please try again.');
   error.status=result.status;throw error;
 }
}
document.querySelectorAll('form.newsletter').forEach(form=>{
 if(form.dataset.bound==='yes')return;
 form.dataset.bound='yes';
 const email=form.querySelector('input[type="email"]');
 const button=form.querySelector('button[type="submit"]');
 if(!email||!button)return;
 email.setAttribute('name','email');
 email.setAttribute('autocomplete','email');
 const consent=document.createElement('label');consent.className='newsletter-consent';
 const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.required=true;
 consent.append(checkbox,document.createTextNode(' I agree to receive Andre Erving email updates.'));
 form.after(consent);
 const feedback=document.createElement('p');feedback.className='form-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 consent.after(feedback);
 const trap=document.createElement('input');trap.type='text';trap.name='website';trap.autocomplete='off';trap.tabIndex=-1;trap.setAttribute('aria-hidden','true');trap.className='form-honeypot';form.append(trap);
 form.addEventListener('submit',async e=>{
   e.preventDefault();
   if(!form.reportValidity()||!checkbox.checked)return;
   if(trap.value)return;
   const address=email.value.trim().toLowerCase();
   if(address.length>254)return;
   button.disabled=true;button.textContent='Joining…';feedback.textContent='';
   try{
     await sendPublicForm('newsletter_signups',{email:address,consent:true});
     feedback.textContent='You’re subscribed. Thank you for joining.';
     form.reset();checkbox.checked=false;
   }catch(err){
     feedback.textContent=err.status===409?'This address is already on the list.':'We couldn’t complete your subscription. Please try again.';
   }finally{button.disabled=false;button.textContent='Join'}
 });
});
document.querySelectorAll('form.contact-form').forEach(form=>{
 if(form.dataset.bound==='yes')return;form.dataset.bound='yes';
 const button=form.querySelector('button[type="submit"]');if(!button)return;
 const message=document.createElement('p');message.className='form-feedback';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 form.after(message);
 const trap=document.createElement('input');trap.type='text';trap.className='form-honeypot';trap.name='website';trap.tabIndex=-1;trap.autocomplete='off';trap.setAttribute('aria-hidden','true');form.append(trap);
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(!form.reportValidity()||trap.value)return;
  const fields=new FormData(form);
  button.disabled=true;button.textContent='Sending…';message.textContent='';
  try{
   await sendPublicForm('website_inquiries',{
    name:String(fields.get('name')||'').trim().slice(0,150),
    email:String(fields.get('email')||'').trim().toLowerCase().slice(0,254),
    phone:String(fields.get('phone')||'').trim().slice(0,40)||null,
    interest:String(fields.get('interest')||'').trim().slice(0,100)||null,
    message:String(fields.get('message')||'').trim().slice(0,4000)
   });
   message.textContent='Your message has been received. We’ll follow up soon.';
   form.reset();
  }catch{message.textContent='Your message could not be submitted. Please email support@andreerving.com.'}
  finally{button.disabled=false;button.textContent='Send inquiry'}
 });
});