/* Andre Erving public-site navigation and live forms */
const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav-links');
if(toggle&&nav){
 const groups=[...document.querySelectorAll('.nav-group>button')];
 const close=()=>{
  nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');
  toggle.textContent='Menu';
  groups.forEach(button=>{button.parentElement.classList.remove('open');button.setAttribute('aria-expanded','false')});
 };
 toggle.setAttribute('aria-controls','site-primary-navigation');
 nav.id='site-primary-navigation';
 toggle.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded',String(open));
  toggle.textContent=open?'Close':'Menu';
  if(!open)groups.forEach(button=>{button.parentElement.classList.remove('open');button.setAttribute('aria-expanded','false')});
 });
 groups.forEach((btn,index)=>{
  const dropdown=btn.parentElement.querySelector('.dropdown');
  if(!dropdown)return;
  const id='site-subnav-'+index;dropdown.id=id;
  btn.setAttribute('aria-controls',id);btn.setAttribute('aria-expanded','false');
  btn.addEventListener('click',()=>{
   if(window.innerWidth>1150)return;
   const now=btn.parentElement.classList.toggle('open');
   btn.setAttribute('aria-expanded',String(now));
  });
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&nav.classList.contains('open')){close();toggle.focus()}
 });
 document.addEventListener('click',event=>{
  if(window.innerWidth<=1150&&nav.classList.contains('open')&&!nav.contains(event.target)&&!toggle.contains(event.target))close();
 });
 window.addEventListener('resize',()=>{if(window.innerWidth>1150)close()});
 nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{if(window.innerWidth<=1150)close()}));
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
 const originalLabel=button.textContent;
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
    message:(()=>{
      const base=String(fields.get('message')||'').trim();
      const details=[...form.querySelectorAll('[data-inquiry-detail]')].map(field=>{
        const value=String(field.value||'').trim();
        if(!value)return '';
        const label=field.closest('label')?.textContent?.trim() || field.getAttribute('data-label') || field.name;
        return label+': '+value;
      }).filter(Boolean);
      return [base,...details].filter(Boolean).join('\n\n').slice(0,4000);
    })()
   });
   message.textContent='Your message has been received. We’ll follow up soon.';
   form.reset();
  }catch{message.textContent='Your message could not be submitted. Please email support@andreerving.com.'}
  finally{button.disabled=false;button.textContent=originalLabel}
 });
});