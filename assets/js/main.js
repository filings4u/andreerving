// Shared navigation and lightweight contact handling for the static website.
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
const groups = [...document.querySelectorAll('.nav-group')];
const closeMenus = () => {
  groups.forEach(group => {
    group.classList.remove('open');
    group.querySelector(':scope > button')?.setAttribute('aria-expanded', 'false');
  });
};
groups.forEach(group => {
  const button = group.querySelector(':scope > button');
  const dropdown = group.querySelector(':scope > .dropdown');
  if (!button || !dropdown) return;
  const id = 'menu-' + groups.indexOf(group);
  dropdown.id = id;
  button.setAttribute('aria-controls', id);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-haspopup', 'true');
  button.addEventListener('click', () => {
    const willOpen = !group.classList.contains('open');
    closeMenus();
    group.classList.toggle('open', willOpen);
    button.setAttribute('aria-expanded', String(willOpen));
  });
});
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    if (!open) closeMenus();
  });
}
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  closeMenus();
  nav?.classList.remove('open');
  if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu'; }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.nav-group')) closeMenus();
});
const path = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(link => {
  if (link.getAttribute('href') === path) link.setAttribute('aria-current', 'page');
});

// Website form submissions are saved using the Andre Erving Supabase Edge Function.
const endpoint='https://gnfyidajbectlppsekzj.supabase.co/functions/v1/website-forms';
document.querySelectorAll('form.demo-form').forEach(form=>{
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const button=form.querySelector('[type="submit"]');
  const status=document.querySelector('.toast');
  const data=new FormData(form);
  const isContact=form.classList.contains('contact-form');
  const email=String(data.get('email')||form.querySelector('input[type="email"]')?.value||'').trim();
  const payload=isContact?{kind:'contact',email,name:data.get('name'),phone:data.get('phone'),interest:data.get('interest'),message:data.get('message'),website:data.get('website')}:{kind:'newsletter',email,consent:true};
  if(button)button.disabled=true;
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
   if(!response.ok)throw new Error('Submission failed');
   form.reset();
   if(status){status.textContent=isContact?'Thank you. Your inquiry was received.':'Thank you. Your signup request was received.';status.classList.add('show');setTimeout(()=>status.classList.remove('show'),5500)}
  }catch{
   if(status){status.textContent='We could not submit your request. Please email support@andreerving.com.';status.classList.add('show');setTimeout(()=>status.classList.remove('show'),6500)}
  }finally{if(button)button.disabled=false}
 });
});
