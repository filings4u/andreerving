(()=>{
 const params=new URLSearchParams(location.search);
 const clean=v=>String(v||"").replace(/[<>\r\n]/g,"").slice(0,160).trim();
 const item=clean(params.get("item")||params.get("product")||params.get("course")||"");
 const key=clean(params.get("price_key")||"");
 const source=clean(params.get("source")||"");
 const itemEl=document.getElementById("checkout-item");
 const sumEl=document.getElementById("summary-item");
 const priceEl=document.getElementById("summary-price");
 const status=document.getElementById("checkout-status");
 let currentPrice=null;
 const fmt=(v,currency="USD")=>new Intl.NumberFormat("en-US",{style:"currency",currency}).format(Number(v));
 if(!item){
   itemEl.value="No item selected";
   sumEl.textContent="Select an item to begin";
   priceEl.textContent="—";
   status.textContent="Choose a course or product from the website before requesting an order.";
   document.querySelector(".checkout-primary").disabled=true;
   return;
 }
 itemEl.value=item;
 sumEl.textContent=item;
 priceEl.textContent="Price confirmed on request";
 if(key&&/^[a-z0-9._-]{3,110}$/i.test(key)&&window.supabase&&window.AE_SUPABASE_URL&&window.AE_SUPABASE_KEY){
   const client=window.supabase.createClient(window.AE_SUPABASE_URL,window.AE_SUPABASE_KEY);
   client.from("site_prices").select("price_key,amount,currency").eq("price_key",key).eq("active",true).maybeSingle()
    .then(({data,error})=>{
      if(!error&&data&&Number.isFinite(Number(data.amount))){
        currentPrice={amount:Number(data.amount),currency:data.currency||"USD"};
        priceEl.textContent=fmt(currentPrice.amount,currentPrice.currency);
      }else priceEl.textContent="Confirm pricing before payment";
    }).catch(()=>{priceEl.textContent="Confirm pricing before payment"});
 }
 const form=document.getElementById("checkout-form");
 form.addEventListener("submit",e=>{
   e.preventDefault();
   if(!form.reportValidity())return;
   const name=clean(document.getElementById("checkout-name").value);
   const email=document.getElementById("checkout-email").value.trim().slice(0,254);
   if(!name||!email)return;
   const subject="Andre Erving purchase inquiry: "+item;
   const body=[
     "I'd like to purchase the following Andre Erving offering:",
     "",
     "Item: "+item,
     key?"Catalog price key: "+key:"",
     currentPrice?"Listed price: "+fmt(currentPrice.amount,currentPrice.currency):"Price: Please confirm",
     source?"Source: "+source:"",
     "",
     "Name: "+name,
     "Email: "+email,
     "",
     "Please send the secure checkout link and next steps."
   ].filter(Boolean).join("\n");
   status.textContent="Your email application will open with a prepared purchase request. Send that email to complete the inquiry. No payment has been taken.";
   location.href="mailto:support@andreerving.com?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
 });
})();