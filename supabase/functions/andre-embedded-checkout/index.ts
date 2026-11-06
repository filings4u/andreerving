// Embedded Stripe Checkout — prices are selected ONLY from this server-side allowlist.
// Set STRIPE_SECRET_KEY (sk_test_...) and STRIPE_PUBLISHABLE_KEY (pk_test_...)
// in Supabase Edge Function Secrets. Do not put secrets in the public website.
const catalog: Record<string, {title:string; price:string; cents:number; image:string}> = {
  "trucking-pro": {title:"Trucking Pro",price:"price_1UUosMEOyjnKIwMtz5TuvTql",cents:22500,image:"assets/images/course-trucking.webp"},
  "freight-broker-training": {title:"Freight Broker Training",price:"price_1UUosPEOyjnKIwMtHnKT1BaX",cents:14500,image:"assets/images/course-broker.webp"},
  "dispatcher-training": {title:"Dispatcher Training",price:"price_1UUosSEOyjnKIwMtv9K8wZLX",cents:12500,image:"assets/images/course-dispatch.webp"},
  "time-management": {title:"Time Management",price:"price_1UUosVEOyjnKIwMtmRzmy4PF",cents:12500,image:"assets/images/course-time.webp"}
};
const permittedOrigins=new Set(["https://andreerving.com","https://www.andreerving.com","https://filings4u.github.io","http://localhost:3000","http://127.0.0.1:5500"]);
function respond(data:unknown,status=200,origin=""){
 const headers:Record<string,string>={"content-type":"application/json","cache-control":"no-store","vary":"Origin",
  "access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"content-type, apikey, authorization, x-client-info"};
 if(permittedOrigins.has(origin))headers["access-control-allow-origin"]=origin;
 return new Response(JSON.stringify(data),{status,headers});
}
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(origin&&!permittedOrigins.has(origin))return respond({error:"Origin not allowed"},403,origin);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
  "access-control-allow-origin":origin||"https://andreerving.com",
  "access-control-allow-methods":"POST, OPTIONS",
  "access-control-allow-headers":"content-type, apikey, authorization, x-client-info",
  "access-control-max-age":"3600","vary":"Origin"
 }});
 if(req.method!=="POST")return respond({error:"Method not allowed"},405,origin);
 let input:Record<string,unknown>;
 try{input=await req.json()}catch{return respond({error:"Invalid request"},400,origin)}
 const action=String(input.action||"catalog");
 if(action==="catalog"){
  return respond({items:Object.entries(catalog).map(([id,p])=>({id,title:p.title,cents:p.cents,currency:"usd",image:p.image})),mode:"test",configured:{
    secret:Boolean(Deno.env.get("STRIPE_SECRET_KEY")),
    publishable:Boolean(Deno.env.get("STRIPE_PUBLISHABLE_KEY"))
  }},200,origin);
 }
 const secret=Deno.env.get("STRIPE_SECRET_KEY")||"";
 const publishable=Deno.env.get("STRIPE_PUBLISHABLE_KEY")||"";
 if(!secret.startsWith("sk_test_")||!publishable.startsWith("pk_test_")){
  return respond({error:"Embedded test checkout requires STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in Supabase secrets.",code:"STRIPE_NOT_CONFIGURED"},503,origin);
 }
 if(action==="session"){
   const id=String(input.productId||"");
   const item=catalog[id];
   if(!item)return respond({error:"Select an available course from the product list."},400,origin);
   const fields=new URLSearchParams();
   fields.set("mode","payment");
   fields.set("ui_mode","embedded_page");
   fields.set("line_items[0][price]",item.price);
   fields.set("line_items[0][quantity]","1");
   fields.set("redirect_on_completion","if_required");
   fields.set("return_url","https://andreerving.com/checkout.html?complete=1&session_id={CHECKOUT_SESSION_ID}");
   fields.set("client_reference_id",crypto.randomUUID());
   fields.set("metadata[product_id]",id);
   fields.set("metadata[website]","andreerving.com");
   const email=typeof input.email==="string"?input.email.trim():"";
   if(email&&email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fields.set("customer_email",email);
   try{
    const res=await fetch("https://api.stripe.com/v1/checkout/sessions",{
     method:"POST",headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/x-www-form-urlencoded","Stripe-Version":"2026-09-30.preview"},
     body:fields.toString()
    });
    const payload=await res.json();
    if(!res.ok||!payload.client_secret){
      console.error("Stripe checkout session failed",payload?.error?.code||res.status);
      return respond({error:payload?.error?.message||"Unable to initialize secure payment form."},502,origin);
    }
    return respond({clientSecret:payload.client_secret,publishableKey:publishable,mode:"test",productId:id,amount:item.cents},200,origin);
   }catch(err){console.error("Checkout request failed",err);return respond({error:"Unable to contact the payment service."},502,origin)}
 }
 if(action==="verify"){
   const sessionId=String(input.sessionId||"");
   if(!/^cs_test_[a-zA-Z0-9_]+$/.test(sessionId)||sessionId.length>180)return respond({error:"Invalid session"},400,origin);
   try{
     const res=await fetch("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(sessionId),{headers:{"Authorization":"Bearer "+secret}});
     if(!res.ok)return respond({error:"Unable to verify payment status"},502,origin);
     const session=await res.json();
     return respond({payment_status:session.payment_status,status:session.status,productId:session.metadata?.product_id||null},200,origin);
   }catch{return respond({error:"Unable to verify payment status"},502,origin)}
 }
 return respond({error:"Unknown action"},400,origin);
});
