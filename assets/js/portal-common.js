window.AEPortal={
  money(v){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v||0));},
  async session(client){const {data}=await client.auth.getSession();return data.session||null;},
  async requireAuth(client,login='customer-login.html'){const s=await this.session(client);if(!s){location.href=login;throw new Error('auth');}return s;},
  escape(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));},
  toast(msg){const t=document.querySelector('.toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);}else alert(msg);}
};
