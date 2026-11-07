/* Ensure every public page uses the canonical header and footer before binding interactions. */
/* Canonical public-site navigation and footer. Loaded before main.js to preserve menu and newsletter bindings. */
(()=>{
 'use strict';
 if(window.__aeSiteShellReady)return;
 window.__aeSiteShellReady=true;
 const header="<header class=\"site-header\">\n  <div class=\"top-strip\"><div class=\"container\"><span>Author · Speaker · Educator · Entrepreneur</span><a href=\"contact.html\">Chicago, IL · Connect with Andre →</a></div></div>\n  <div class=\"container nav\">\n    <a class=\"brand\" href=\"index.html\" aria-label=\"Andre Erving home\"><img class=\"ae-official-site-logo\" src=\"https://gnfyidajbectlppsekzj.supabase.co/storage/v1/object/public/Andre%20Erving%20Public/logos/logo.png\" alt=\"Andre Erving Growth Strategy Education\"></a>\n    <nav class=\"nav-links\" aria-label=\"Primary navigation\">\n      <a href=\"about.html\">About</a>\n      <div class=\"nav-group\"><button type=\"button\">Work With Andre</button><div class=\"dropdown\"><a href=\"speaking.html\">Speaking</a><a href=\"coaching.html\">Coaching</a><a href=\"consulting.html\">Consulting</a><a href=\"mentorship.html\">Mentorship</a></div></div>\n      <div class=\"nav-group\"><button type=\"button\">Courses</button><div class=\"dropdown\"><a href=\"courses.html\">All Courses</a><a href=\"trucking-pro.html\">Trucking Pro</a><a href=\"freight-broker-training.html\">Freight Broker Training</a><a href=\"dispatcher-training.html\">Dispatcher Training</a><a href=\"dot-specimen-collector-training.html\">DOT Collector Training</a><a href=\"time-management.html\">Time Management</a></div></div>\n      <div class=\"nav-group\"><button type=\"button\">Resources</button><div class=\"dropdown\"><a href=\"ebooks.html\">eBooks</a><a href=\"worksheets.html\">Worksheets</a><a href=\"blog.html\">Blog</a><a href=\"podcast.html\">Podcast</a></div></div>\n      <a href=\"photography.html\">Photography</a>\n      <a href=\"contact.html\">Contact</a>\n    </nav>\n    <div class=\"nav-actions\"><a class=\"btn btn-ghost\" href=\"https://app.andreerving.com/\">Sign In</a><a class=\"btn btn-primary\" href=\"courses.html\">Get Started</a><button class=\"menu-toggle\" type=\"button\" aria-expanded=\"false\" aria-label=\"Open navigation\">Menu</button></div>\n  </div>\n</header>";
 const footer="<footer class=\"site-footer\"><div class=\"container footer-grid\">\n  <div class=\"footer-brand\"><a class=\"brand footer-logo-link\" href=\"index.html\" aria-label=\"Andre Erving home\"><img class=\"footer-logo2\" src=\"https://gnfyidajbectlppsekzj.supabase.co/storage/v1/object/public/Andre%20Erving%20Public/logos/logo2.png\" alt=\"Andre Erving — Growth, Strategy, Education\" loading=\"lazy\"></a><p>Practical education, leadership development, transportation training, strategy, and creative services for people ready to build what comes next.</p></div>\n  <div><div class=\"footer-title\">Work With Andre</div><div class=\"footer-links\"><a href=\"speaking.html\">Speaking</a><a href=\"coaching.html\">Coaching</a><a href=\"consulting.html\">Consulting</a><a href=\"mentorship.html\">Mentorship</a></div></div>\n  <div><div class=\"footer-title\">Explore</div><div class=\"footer-links\"><a href=\"courses.html\">Courses</a><a href=\"resources.html\">Resources</a><a href=\"blog.html\">Blog</a><a href=\"photography.html\">Photography</a><a href=\"contact.html\">Contact</a></div></div>\n  <div><div class=\"footer-title\">Stay Connected</div><p>Fresh ideas, new resources, and program updates.</p><form class=\"newsletter demo-form\"><input type=\"email\" aria-label=\"Email\" placeholder=\"Email address\" required><button type=\"submit\">Join</button></form></div>\n</div><div class=\"container footer-bottom\"><span>© 2026 Andre Erving, LLC.</span><span><a href=\"privacy-policy.html\">Privacy</a> · <a href=\"terms-of-service.html\">Terms</a> · <a href=\"accessibility.html\">Accessibility</a></span></div></footer>";
 const oldHeader=document.querySelector('header.site-header');
 const oldFooter=document.querySelector('footer.site-footer');
 if(oldHeader){oldHeader.outerHTML=header;}
 if(oldFooter){oldFooter.outerHTML=footer;}
 const current=location.pathname.split('/').pop()||'index.html';
 document.querySelectorAll('.nav-group > button').forEach(button=>{
  const group=button.parentElement;
  button.setAttribute('aria-expanded','false');
  button.addEventListener('click',()=>{
   const next=!group.classList.contains('open');
   document.querySelectorAll('.nav-group.open').forEach(other=>{
    other.classList.remove('open');
    other.querySelector('button')?.setAttribute('aria-expanded','false');
   });
   group.classList.toggle('open',next);
   button.setAttribute('aria-expanded',String(next));
  });
 });
 document.addEventListener('click',event=>{
  if(event.target.closest('.nav-group'))return;
  document.querySelectorAll('.nav-group.open').forEach(group=>{
   group.classList.remove('open');
   group.querySelector('button')?.setAttribute('aria-expanded','false');
  });
 });
 const nav=document.querySelector('header.site-header .nav-links');
 if(nav){
  const active=[...nav.querySelectorAll('a[href]')].find(a=>a.getAttribute('href')===current);
  if(active){active.classList.add('active');active.setAttribute('aria-current','page');}
 }
})();

/* Official Andre Erving branding across static and shared-shell pages. */
(()=>{
 const light='https://gnfyidajbectlppsekzj.supabase.co/storage/v1/object/public/Andre%20Erving%20Public/logos/logo.png';
 const dark='https://gnfyidajbectlppsekzj.supabase.co/storage/v1/object/public/Andre%20Erving%20Public/logos/logo2.png';
 document.querySelectorAll('header.site-header a.brand').forEach(link=>{
  const existing=link.querySelector('img.ae-official-site-logo');
  if(existing){existing.src=light;return}
  const img=document.createElement('img');img.src=light;img.alt='Andre Erving Growth Strategy Education';img.className='ae-official-site-logo';img.decoding='async';
  img.style.cssText='display:block;width:clamp(175px,17vw,244px);height:auto;max-height:66px;object-fit:contain;';
  link.replaceChildren(img);
 });
 document.querySelectorAll('.site-footer .footer-logo2').forEach(img=>{img.src=dark;img.style.cssText='display:block;width:min(100%,310px);height:auto;max-height:92px;object-fit:contain'});
})();
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
/* Cloudflare Turnstile, using dedicated Andre Erving site widget with server verification. */
const AE_TURNSTILE_SITE_KEY="0x4AAAAAAF3Or7ZzNnUPXDyV";
const aeProtectedForms=[...document.querySelectorAll("form.contact-form,form.newsletter,form.service-inquiry-form,#checkout-customer-form")];
const aeTurnstileStates=new WeakMap();
window.AEFormSecurity={
 payload(form){const state=aeTurnstileStates.get(form);return state?.token||""},
 reset(form){const state=aeTurnstileStates.get(form);if(!state)return;state.token="";if(state.id!==null&&window.turnstile?.reset)window.turnstile.reset(state.id);state.status.textContent="Please complete security verification before submitting.";},
};
if(aeProtectedForms.length){
 const apiScript=document.createElement("script");
 apiScript.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
 apiScript.defer=true;apiScript.async=true;
 apiScript.onerror=()=>{aeProtectedForms.forEach(f=>{const state=aeTurnstileStates.get(f);if(state)state.status.textContent="Security verification could not load. Refresh this page."})};
 document.head.appendChild(apiScript);
 for(const form of aeProtectedForms){
  const action=form.id==="checkout-customer-form"?"ae_checkout":form.matches(".newsletter")?"ae_newsletter":form.matches(".service-inquiry-form")?"ae_service":"ae_contact";
  const box=document.createElement("section");box.className="ae-turnstile";box.setAttribute("aria-label","Security verification");
  const note=document.createElement("div");note.className="ae-turnstile-copy";note.textContent="Secure verification";
  const host=document.createElement("div");host.className="ae-turnstile-host";
  const status=document.createElement("p");status.className="ae-turnstile-status";status.setAttribute("role","status");status.setAttribute("aria-live","polite");status.textContent="Loading security verification…";
  box.append(note,host,status);
  const submit=form.querySelector('[type="submit"]');
  const anchor=submit?.closest(".field.full,.ae-contact-form-bottom,.checkout-submit-row")||submit;
  if(anchor?.parentNode)anchor.parentNode.insertBefore(box,anchor);else form.append(box);
  const state={token:"",id:null,status,action};aeTurnstileStates.set(form,state);
  form.addEventListener("submit",event=>{
   if(state.token)return;
   event.preventDefault();event.stopImmediatePropagation();
   status.textContent="Complete the Cloudflare verification to submit this form.";
   box.scrollIntoView({behavior:"smooth",block:"center"});
  },true);
  const render=()=>{
   if(!form.isConnected)return;
   if(!window.turnstile?.render){setTimeout(render,150);return}
   if(state.id!==null)return;
   try{state.id=window.turnstile.render(host,{sitekey:AE_TURNSTILE_SITE_KEY,action:state.action,theme:"light",appearance:"always",
    callback:token=>{state.token=String(token||"");status.textContent="Security verification complete."},
    "expired-callback":()=>{state.token="";status.textContent="Security verification expired. Please verify again."},
    "error-callback":()=>{state.token="";status.textContent="Verification unavailable. Refresh the page or retry."}
   })}
   catch(e){status.textContent="Security verification could not initialize.";console.warn("Turnstile",e)}
  };
  render();
 }
}

const AE_PUBLIC='sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf';
async function sendPublicForm(table,data,form){
 const kind=table==='website_inquiries'?'contact':table==='newsletter_signups'?'newsletter':table==='website_service_applications'?'service':null;
 if(!kind)throw Error('Unsupported form type');
 const result=await fetch('https://gnfyidajbectlppsekzj.supabase.co/functions/v1/website-forms',{
   method:'POST',
   headers:{'apikey':AE_PUBLIC,'Content-Type':'application/json'},
   body:JSON.stringify({...data,kind,turnstileToken:window.AEFormSecurity?.payload(form)||""})
 });
 if(!result.ok){
   const body=await result.json().catch(()=>null);
   const error=new Error(body?.error||body?.message||'Submission could not be completed. Please try again.');
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
     await sendPublicForm('newsletter_signups',{email:address,consent:true},form);
     feedback.textContent='You’re subscribed. Thank you for joining.';
     form.reset();checkbox.checked=false;window.AEFormSecurity?.reset(form);
   }catch(err){
     feedback.textContent=err.status===409?'This address is already on the list.':'We couldn’t complete your subscription. Please try again.';
   }finally{button.disabled=false;button.textContent='Join'}
 });
});
document.querySelectorAll('form.contact-form:not(.service-inquiry-form)').forEach(form=>{
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
    name:String(fields.get('name')||[fields.get('first_name'),fields.get('last_name')].filter(Boolean).join(' ')).trim().slice(0,150),
    email:String(fields.get('email')||'').trim().toLowerCase().slice(0,254),
    phone:String(fields.get('phone')||'').trim().slice(0,40)||null,
    interest:String(fields.get('interest')||'').trim().slice(0,100)||null,
    message:(()=>{
      const base=String(fields.get('message')||'').trim();
      const details=[...form.querySelectorAll('[data-inquiry-detail]')].map(field=>{
        const value=String(field.value||'').trim();
        if(!value)return '';
        const label=field.getAttribute('data-label') || field.closest('label')?.querySelector('span')?.textContent?.trim() || field.name;
        return label+': '+value;
      }).filter(Boolean);
      return [base,...details].filter(Boolean).join('\n\n').slice(0,4000);
    })()
   },form);
   window.AEFormSecurity?.reset(form);
   message.textContent='Your inquiry has been submitted. Thank you for contacting Andre Erving.';
   message.dataset.error='false';
   form.reset();
   form.dispatchEvent(new Event('reset',{bubbles:true}));
  }catch(err){message.dataset.error='true';message.textContent='We could not submit your inquiry. Please try again or email support@andreerving.com.';console.error('Inquiry submission failed',err?.message||err)}
  finally{button.disabled=false;button.textContent=originalLabel}
 });
});
/* Product-specific booking buttons choose the package on that page before checkout. */
document.querySelectorAll('a[data-select-package]').forEach(link=>{
 link.addEventListener('click',()=>{
  const target=document.getElementById('booking-package');
  if(!target)return;
  const choice=link.dataset.selectPackage||'';
  if([...target.options].some(option=>option.value===choice)){
   target.value=choice;
   target.dispatchEvent(new Event('change',{bubbles:true}));
  }
 });
});
/* Dedicated service applications and photography booking orders, not contact inquiries. */
document.querySelectorAll('form.service-inquiry-form').forEach(form=>{
 if(form.dataset.bound==='yes')return;
 form.dataset.bound='yes';
 const button=form.querySelector('button[type="submit"]');
 if(!button)return;
 const initialLabel=button.textContent;
 const feedback=document.createElement('p');
 feedback.className='form-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 form.append(feedback);
 const trap=document.createElement('input');trap.type='text';trap.name='website';trap.className='form-honeypot';
 trap.tabIndex=-1;trap.autocomplete='off';trap.setAttribute('aria-hidden','true');form.append(trap);
 form.addEventListener('submit',async event=>{
   event.preventDefault();
   if(!form.reportValidity()||trap.value)return;
   const data=new FormData(form);
   const service=String(data.get('interest')||form.dataset.service||'Service application').trim().slice(0,100);
   const packageId=String(data.get('package')||'').trim();
   const details={};
   for(const field of form.querySelectorAll('[data-inquiry-detail]')){
     if(field.disabled)continue;
     const key=field.dataset.label||field.getAttribute('data-label')||field.name;
     const value=String(field.value||'').trim();
     if(value)details[key]=value.slice(0,1000);
   }
   const notes=String(data.get('message')||'').trim();
   if(notes)details['Additional information']=notes.slice(0,3000);
   if(packageId)details['Selected package']=packageId;
   const payload={
     service,
     source_page:location.pathname.split('/').pop()||'index.html',
     name:String(data.get('name')||'').trim().slice(0,150),
     email:String(data.get('email')||'').trim().toLowerCase().slice(0,254),
     phone:String(data.get('phone')||'').trim().slice(0,40)||null,
     details
   };
   button.disabled=true;button.textContent=packageId?'Saving booking details…':'Submitting application…';
   feedback.textContent='';
   try{
     await sendPublicForm('website_service_applications',payload,form);
     if(packageId){
       const allowed=['birthday-250','birthday-325','kids-175','portraits-250','portraits-325'];
       if(!allowed.includes(packageId))throw Error('Unknown checkout package');
       try{sessionStorage.setItem('ae_checkout_customer',JSON.stringify({name:payload.name,email:payload.email,packageId}));}catch{}
       const query=new URLSearchParams({item:packageId,source:payload.source_page});
       location.assign('checkout.html?'+query.toString());
       return;
     }
     feedback.textContent='Your '+service.toLowerCase()+' form has been submitted. We will review your information and contact you about the next step.';
     form.reset();window.AEFormSecurity?.reset(form);
   }catch(err){
     feedback.textContent='We could not submit this form. Please try again. No booking or purchase has been confirmed.';
   }finally{if(!packageId)window.AEFormSecurity?.reset(form);button.disabled=false;button.textContent=initialLabel}
 });
});

/* Supabase powered pricing and published CMS updates for every public page. */
(()=>{const script=document.createElement('script');script.src='assets/js/site-data.js?v=live-prices-20261107c';script.defer=true;document.body.append(script)})();
