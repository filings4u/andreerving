(()=>{'use strict';
const form=document.getElementById('affiliate-registration'),message=document.getElementById('registration-status');if(!form)return;
form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;
 const button=form.querySelector('[type="submit"]');button.disabled=true;message.className='affiliate-message';message.textContent='Preparing your verification invitation…';
 try{
  const details=Object.fromEntries(new FormData(form));
  const response=await fetch('https://gnfyidajbectlppsekzj.supabase.co/functions/v1/andre-affiliates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'register',fullName:details.fullName,email:details.email})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error||'Registration email could not be requested');
  message.className='affiliate-message success';
  message.textContent='Check your inbox for an activation email. After activating, complete the second email verification and sign in to submit your application. If you already have an account, use Affiliate Sign In.';
  form.reset();
 }catch(error){message.className='affiliate-message error';message.textContent=error.message||'Unable to request your invitation. Please try again.'}
 finally{button.disabled=false}
});
})();