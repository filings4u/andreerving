import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://gnfyidajbectlppsekzj.supabase.co','sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf');
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
async function begin(){try{
 const token=params.get('token_hash'),type=params.get('type');if(!token||!['invite','magiclink'].includes(type))throw Error('Open the secure activation link from your affiliate approval email.');
 const {data,error}=await db.auth.verifyOtp({token_hash:token,type});if(error||!data.user)throw error||new Error('This invitation is invalid or expired.');
 history.replaceState({},'',location.pathname);$('loading').hidden=true;$('activate-form').hidden=false;
}catch(e){history.replaceState({},'',location.pathname);$('loading').hidden=true;$('status').textContent=e.message||'This invitation has expired. Contact support@andreerving.com.'}}
$('activate-form').onsubmit=async e=>{e.preventDefault();const password=$('password').value;if(password!==$('confirm').value){$('status').textContent='Passwords do not match.';return}if(password.length<12){$('status').textContent='Use at least 12 characters.';return}const btn=e.target.querySelector('button');btn.disabled=true;try{const {error}=await db.auth.updateUser({password});if(error)throw error;await db.auth.signOut();$('activate-form').hidden=true;$('status').innerHTML='Your affiliate account is active. <a href="./">Sign in to your affiliate dashboard</a>.'}catch(err){$('status').textContent=err.message||'Unable to activate your account'}finally{btn.disabled=false}};
begin();