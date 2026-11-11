(()=>{
const form=document.querySelector("#affiliate-application"),status=document.querySelector("#affiliate-status");if(!form)return;
form.addEventListener("submit",async e=>{e.preventDefault();const button=form.querySelector('button[type="submit"]');button.disabled=true;status.textContent="Submitting application…";try{
const input=Object.fromEntries(new FormData(form));const r=await fetch("https://gnfyidajbectlppsekzj.supabase.co/functions/v1/andre-affiliates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"apply",...input})});const json=await r.json();if(!r.ok)throw Error(json.error||"Application was not submitted");
status.textContent=json.existing?"We have an application on file for this email. Check your account or contact support for details.":"Application received. We will review it and email you if approved.";form.reset();
}catch(err){status.textContent=err.message||"Unable to submit application"}finally{button.disabled=false}});
})();