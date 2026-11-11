import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const supabase=createClient('https://gnfyidajbectlppsekzj.supabase.co','sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf');
const form=document.getElementById('affiliate-registration');
const message=document.getElementById('registration-status');
const portal='/affiliate-portal/';
const api='https://gnfyidajbectlppsekzj.supabase.co/functions/v1/andre-affiliates';
if(form && message){
 let submitting=false;
 async function existingSession(){
  const {data:{session}}=await supabase.auth.getSession();
  return session?.user||null;
 }
 function note(text,type=''){
  message.className='affiliate-message'+(type?' '+type:'');
  message.textContent=text;
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(submitting||!form.reportValidity())return;
  submitting=true;
  const button=form.querySelector('[type="submit"]');
  button.disabled=true;
  note('Checking your affiliate account…');
  try{
   const user=await existingSession();
   if(user){
    note('You are already signed in. Opening your affiliate portal to complete verification or your application.','success');
    window.location.assign(portal);
    return;
   }
   const details=Object.fromEntries(new FormData(form));
   const response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'register',fullName:details.fullName,email:details.email})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||'The invitation could not be requested.');
   note('Check your inbox for your Andre Erving affiliate verification invitation. Existing account holders can use the secure email link to continue without creating another password.','success');
   form.reset();
  }catch(error){
   note(error.message||'Could not request an invitation. Please try again.','error');
  }finally{submitting=false;button.disabled=false;}
 });
}
